// src/main/java/com/spatiallens/Server/service/MvtTileService.java
package com.spatiallens.Server.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.spatiallens.Server.model.LayerMeta;
import com.spatiallens.Server.repository.LayerMetaRepository;

@Service
public class MvtTileService {

    private final JdbcTemplate jdbc;
    private final LayerMetaRepository metaRepo;

    public MvtTileService(JdbcTemplate jdbc, LayerMetaRepository metaRepo) {
        this.jdbc = jdbc;
        this.metaRepo = metaRepo;
    }

    /** Hasil tile + hint caching */
    public record TileResult(byte[] body, boolean empty, boolean publicPublished) {
    }

    /**
     * Generate MVT tile untuk layer {slug} di z/x/y.
     * - Draft → butuh akses; jika tidak, empty.
     * - di luar min/max zoom → empty.
     * - metadata penting kosong (schema/table/geom) → empty.
     * - Geometri ditransform ke 3857 agar cocok dengan ST_TileEnvelope.
     */
    public TileResult getTile(String slug, int z, int x, int y, boolean canAccessRestricted) {
        Optional<LayerMeta> opt = metaRepo.findBySlug(slug);
        if (opt.isEmpty()) {
            return new TileResult(emptyTile(), true, false);
        }

        LayerMeta lm = opt.get();
        boolean isPublished = "Published".equalsIgnoreCase(lm.getStatus());
        boolean publicPublished = isPublished;

        if (!isPublished && !canAccessRestricted) {
            return new TileResult(emptyTile(), true, publicPublished);
        }

        Integer minz = lm.getMinzoom();
        Integer maxz = lm.getMaxzoom();
        if ((minz != null && z < minz) || (maxz != null && z > maxz)) {
            return new TileResult(emptyTile(), true, publicPublished);
        }

        if (isBlank(lm.getSchemaName()) || isBlank(lm.getTableName()) || isBlank(lm.getGeomColumn())) {
            return new TileResult(emptyTile(), true, publicPublished);
        }

        final String qualified = safeIdent(lm.getSchemaName()) + "." + safeIdent(lm.getTableName());
        final String geomCol = safeIdent(lm.getGeomColumn());
        
        // Auto-populate whitelist jika kosong dengan semua properties dari sample data
        String whitelist = lm.getPropsWhitelist();
        // Treat null/blank/[] as empty so we can auto-detect and persist once
        List<String> parsedWhitelist = parseWhitelist(whitelist);
        if (isBlank(whitelist) || parsedWhitelist.isEmpty()) {
            whitelist = autoDetectProperties(qualified);
            if (!isBlank(whitelist)) {
                lm.setPropsWhitelist(whitelist);
                metaRepo.save(lm);
            }
        }
        
        final String projectedCols = buildProjectedColumns(whitelist);

        // Envelope: ST_TileEnvelope(z,x,y) → SRID 3857
        // Data: transform ke 3857 sebelum ST_AsMVTGeom dan filter intersect
        String sql = """
                WITH env AS (
                  SELECT ST_TileEnvelope(?, ?, ?) AS box
                )
                SELECT COALESCE(
                  (SELECT ST_AsMVT(q, ?, 4096, 'geom') FROM (
                    SELECT %s,
                           ST_AsMVTGeom(
                             ST_Transform(t.%s, 3857),
                             env.box,
                             4096, 64, true
                           ) AS geom
                    FROM %s t, env
                    WHERE ST_Intersects(ST_Transform(t.%s, 3857), env.box)
                  ) AS q),
                  '\\x'::bytea
                ) AS tile
                """.formatted(projectedCols, geomCol, qualified, geomCol);

        try {
            byte[] tile = jdbc.queryForObject(sql, byte[].class, z, x, y, slug);
            boolean empty = (tile == null || tile.length == 0);
            if (empty) {
                return new TileResult(emptyTile(), true, publicPublished);
            }
            return new TileResult(tile, false, publicPublished);
        } catch (EmptyResultDataAccessException ex) {
            return new TileResult(emptyTile(), true, publicPublished);
        } catch (Exception ex) {
            // Fail-closed → empty tile agar endpoint selalu resilient
            return new TileResult(emptyTile(), true, publicPublished);
        }
    }

    // --- helpers ---

    private String buildProjectedColumns(String whitelistRaw) {
        // selalu include id
        List<String> cols = new ArrayList<>();
        cols.add("t.id");

        // kolom props (JSONB) → props->>'key' AS "key"
        // Uppercase key untuk match dengan extractProps yang sudah uppercase
        for (String key : parseWhitelist(whitelistRaw)) {
            String upperKey = key.toUpperCase().trim();
            if (!upperKey.isEmpty()) {
                // Escape single quote untuk PostgreSQL JSONB
                String escapedKey = upperKey.replace("'", "''");
                cols.add("t.props->>'" + escapedKey + "' AS \"" + upperKey + "\"");
            }
        }

        return String.join(", ", cols);
    }

    private List<String> parseWhitelist(String raw) {
        List<String> out = new ArrayList<>();
        if (raw == null || raw.isBlank())
            return out;

        String s = raw.trim();
        if (s.startsWith("[") && s.endsWith("]")) {
            String inner = s.substring(1, s.length() - 1);
            for (String part : inner.split(",")) {
                String v = part.trim();
                if (v.startsWith("\"") && v.endsWith("\"") && v.length() >= 2) {
                    v = v.substring(1, v.length() - 1);
                }
                v = v.trim();
                if (!v.isBlank())
                    out.add(v);
            }
            return out;
        }

        for (String part : s.split(",")) {
            String v = part.trim();
            if (!v.isBlank())
                out.add(v);
        }
        return out;
    }

    private String safeIdent(String ident) {
        return ident.replaceAll("[^A-Za-z0-9_]", "_");
    }

    private String safePropKey(String key) {
        return key.replaceAll("[^A-Za-z0-9_]", "");
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private byte[] emptyTile() {
        return new byte[0];
    }
    
    /**
     * Auto-detect property keys dari sample data.
     * Cek dari schema shapefile jika props kosong.
     */
    private String autoDetectProperties(String qualifiedTable) {
        try {
            // Coba ambil dari props yang ada (sudah uppercase dari extractProps)
            String sql = String.format("""
                    SELECT DISTINCT UPPER(jsonb_object_keys(props)) AS key
                    FROM %s
                    WHERE props IS NOT NULL 
                      AND props != '{}'::jsonb
                    LIMIT 100
                    """, qualifiedTable);
            
            List<String> keys = jdbc.query(sql, (rs, rowNum) -> rs.getString("key"));
            
            // Kalau masih kosong, coba query langsung dari information_schema
            // untuk ambil column names (kecuali id, geom, props)
            if (keys.isEmpty()) {
                String schema = qualifiedTable.split("\\.")[0];
                String table = qualifiedTable.split("\\.")[1];
                
                String colSql = """
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = ? 
                      AND table_name = ?
                      AND column_name NOT IN ('id', 'geom', 'props')
                    ORDER BY ordinal_position
                    """;
                
                keys = jdbc.query(colSql, (rs, rowNum) -> rs.getString("column_name"), schema, table);
            }
            
            if (keys.isEmpty()) {
                System.err.println("⚠️ No properties detected for table: " + qualifiedTable);
                return null;
            }
            
            // Return as JSON array format: ["key1","key2","key3"]
            String result = "[" + keys.stream()
                    .map(k -> "\"" + k + "\"")
                    .reduce((a, b) -> a + "," + b)
                    .orElse("") + "]";
            
            System.out.println("✅ Auto-detected properties for " + qualifiedTable + ": " + result);
            return result;
            
        } catch (Exception e) {
            System.err.println("❌ Error auto-detecting properties for " + qualifiedTable + ": " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }
}
