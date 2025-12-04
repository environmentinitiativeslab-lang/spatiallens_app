// src/main/java/com/spatiallens/Server/service/LayerImportService.java
package com.spatiallens.Server.service;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.geotools.data.DataStore;
import org.geotools.data.DataStoreFinder;
import org.geotools.data.simple.SimpleFeatureCollection;
import org.geotools.data.simple.SimpleFeatureIterator;
import org.geotools.data.simple.SimpleFeatureSource;
import org.geotools.geojson.feature.FeatureJSON;
import org.geotools.geometry.jts.JTS;
import org.geotools.referencing.CRS;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.io.WKBWriter;
import org.opengis.feature.simple.SimpleFeature;
import org.opengis.feature.type.PropertyDescriptor;
import org.opengis.referencing.crs.CoordinateReferenceSystem;
import org.opengis.referencing.operation.MathTransform;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spatiallens.Server.model.LayerMeta;
import com.spatiallens.Server.model.LayerUpload;
import com.spatiallens.Server.repository.LayerMetaRepository;

@Service
public class LayerImportService {

    private final JdbcTemplate jdbc;
    private final LayerMetaRepository metaRepo;
    private final ObjectMapper om = new ObjectMapper();

    public LayerImportService(JdbcTemplate jdbc, LayerMetaRepository metaRepo) {
        this.jdbc = jdbc;
        this.metaRepo = metaRepo;
    }

    // ------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------

    public record ImportResult(String slug, String table, long count) {
    }

    /**
     * Jalankan impor ke PostGIS dan daftarkan/Update metadata di tabel "layers".
     * - sumber dari upload.rawPath (zip shp atau .geojson)
     * - tabel target: gis.<slug>
     */
    public ImportResult importAndRegister(LayerUpload upload) throws Exception {
        if (upload == null || !StringUtils.hasText(upload.getRawPath())) {
            throw new IllegalArgumentException("Upload/rawPath kosong");
        }

        final String slug = upload.getSlug();
        final String safeTable = toIdent(slug);
        final String qualified = "gis." + safeTable;

        // siapkan tabel target
        createTargetTableIfAbsent(qualified);

        // deteksi sumber
        Path source = Paths.get(upload.getRawPath());
        String lower = source.getFileName().toString().toLowerCase(Locale.ROOT);

        ImportStats stats;
        if (lower.endsWith(".zip")) {
            stats = importShapefileZip(source, qualified);
        } else if (lower.endsWith(".geojson") || lower.endsWith(".json")) {
            stats = importGeoJson(source, qualified);
        } else {
            throw new IllegalArgumentException("Tipe file tidak didukung: " + lower);
        }

        // upsert metadata "layers"
        LayerMeta meta = metaRepo.findBySlug(slug).orElseGet(LayerMeta::new);

        // Set semua field yang required
        meta.setName(upload.getName());
        meta.setSlug(slug);
        meta.setSchemaName("gis");
        meta.setTableName(safeTable);
        meta.setGeomColumn("geom");
        meta.setSrid(4326);
        meta.setFeatureCount(stats.count());
        meta.setStatus(upload.getStatus()); // Draft | Published sesuai upload
        meta.setVisibility("PUBLIC");
        meta.setType(upload.getType());
        meta.setMinzoom(0);
        meta.setMaxzoom(22);
        meta.setCategory(upload.getCategory());
        meta.setRawPath(upload.getRawPath());
        meta.setPublicPath(upload.getPublicPath());
        
        // Auto-populate props whitelist dengan semua property names dari shapefile
        if (stats.getPropertyNames() != null && !stats.getPropertyNames().isEmpty()) {
            try {
                String whitelist = om.writeValueAsString(new ArrayList<>(stats.getPropertyNames()));
                meta.setPropsWhitelist(whitelist);
            } catch (Exception e) {
                // Fallback: comma-separated
                meta.setPropsWhitelist(String.join(",", stats.getPropertyNames()));
            }
        }

        // PENTING: Set timestamps jika belum ada (untuk insert baru)
        if (meta.getCreatedAt() == null) {
            meta.setCreatedAt(OffsetDateTime.now());
        }
        meta.setUpdatedAt(OffsetDateTime.now());

        metaRepo.save(meta);

        return new ImportResult(slug, safeTable, stats.count());
    }

    // ------------------------------------------------------------
    // Importers
    // ------------------------------------------------------------

    /** SHP di dalam ZIP → PostGIS */
    private ImportStats importShapefileZip(Path zipFile, String qualifiedTarget) throws Exception {
        Path tempDir = Files.createTempDirectory("sl_shp_");
        Path shpPath = null;

        // unzip
        try (ZipInputStream zis = new ZipInputStream(Files.newInputStream(zipFile))) {
            for (ZipEntry e; (e = zis.getNextEntry()) != null;) {
                if (e.isDirectory())
                    continue;
                Path out = tempDir.resolve(e.getName()).normalize();
                Files.createDirectories(out.getParent());
                Files.copy(zis, out, StandardCopyOption.REPLACE_EXISTING);
                if (out.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".shp")) {
                    shpPath = out;
                }
            }
        }

        if (shpPath == null) {
            deleteRecursive(tempDir);
            throw new IllegalStateException("ZIP tidak berisi .shp");
        }

        Map<String, Object> params = new HashMap<>();
        params.put("url", shpPath.toUri().toURL());
        params.put("charset", StandardCharsets.UTF_8.name());

        DataStore ds = null;
        try {
            ds = DataStoreFinder.getDataStore(params);
            if (ds == null) {
                throw new IllegalStateException("Gagal membuka Shapefile datastore");
            }

            String typeName = ds.getTypeNames()[0];
            SimpleFeatureSource src = (SimpleFeatureSource) ds.getFeatureSource(typeName);
            CoordinateReferenceSystem srcCrs = src.getSchema() != null ? src.getSchema().getCoordinateReferenceSystem()
                    : null;

            MathTransform tx = buildTransformTo4326(srcCrs);

            try (SimpleFeatureIterator it = src.getFeatures().features()) {
                return writeIntoPostgis(it, qualifiedTarget, tx);
            }
        } finally {
            if (ds != null)
                ds.dispose();
            deleteRecursive(tempDir);
        }
    }

    /** GeoJSON → PostGIS */
    private ImportStats importGeoJson(Path geojsonFile, String qualifiedTarget) throws Exception {
        FeatureJSON fj = new FeatureJSON();
        try (InputStream in = new BufferedInputStream(Files.newInputStream(geojsonFile))) {
            SimpleFeatureCollection fc = (SimpleFeatureCollection) fj.readFeatureCollection(in);

            CoordinateReferenceSystem srcCrs = (fc.getSchema() != null) ? fc.getSchema().getCoordinateReferenceSystem()
                    : null;

            MathTransform tx = buildTransformTo4326(srcCrs);

            try (SimpleFeatureIterator it = fc.features()) {
                return writeIntoPostgis(it, qualifiedTarget, tx);
            }
        }
    }

    // ------------------------------------------------------------
    // Write into PostGIS
    // ------------------------------------------------------------

    private ImportStats writeIntoPostgis(SimpleFeatureIterator it,
            String qualifiedTarget,
            MathTransform tx) {
        ImportStats stats = new ImportStats();
        WKBWriter wkbWriter = new WKBWriter();
        Set<String> allPropertyNames = new LinkedHashSet<>();

        while (it.hasNext()) {
            SimpleFeature f = it.next();
            Geometry g = (Geometry) f.getDefaultGeometry();
            if (g == null)
                continue;

            Geometry g4326;
            try {
                g4326 = (tx != null) ? JTS.transform(g, tx) : g;
            } catch (Exception ex) {
                // satu feature gagal → lanjut
                continue;
            }

            byte[] wkb = wkbWriter.write(g4326);
            Map<String, Object> props = extractProps(f);
            
            // Collect all property names for whitelist
            allPropertyNames.addAll(props.keySet());

            String json;
            try {
                json = om.writeValueAsString(props);
            } catch (Exception e) {
                json = "{}";
            }

            jdbc.update(
                    "INSERT INTO " + qualifiedTarget +
                            " (geom, props) VALUES (ST_SetSRID(ST_GeomFromWKB(?),4326), ?::jsonb)",
                    wkb, json);

            stats.inc();
        }
        
        // Store collected property names in stats
        stats.setPropertyNames(allPropertyNames);

        // index geom jika belum ada (sekali jalan aman berulang)
        jdbc.execute("DO $$ BEGIN " +
                "IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = split_part('" + qualifiedTarget
                + "', '.', 1) " +
                " AND indexname = split_part('" + qualifiedTarget + "', '.', 2) || '_geom_gix') THEN " +
                "  EXECUTE 'CREATE INDEX ' || split_part('" + qualifiedTarget + "', '.', 2) || '_geom_gix ON "
                + qualifiedTarget + " USING GIST(geom)'; " +
                "END IF; END $$;");

        return stats;
    }

    /** Ambil properti non-geom sebagai Map untuk JSONB. */
    private Map<String, Object> extractProps(SimpleFeature f) {
        Map<String, Object> map = new LinkedHashMap<>();

        // nama kolom geometry
        String geomName = null;
        if (f.getFeatureType().getGeometryDescriptor() != null) {
            geomName = f.getFeatureType().getGeometryDescriptor()
                    .getName().getLocalPart();
        }

        for (PropertyDescriptor d : f.getFeatureType().getDescriptors()) {
            String name = (d.getName() != null) ? d.getName().getLocalPart() : null;
            if (name == null)
                continue;
            if (geomName != null && name.equalsIgnoreCase(geomName))
                continue;

            Object v = f.getAttribute(name);
            if (v == null)
                continue;
            if (v instanceof Geometry)
                continue;

            // Uppercase semua field names untuk konsistensi
            String upperKey = name.toUpperCase(Locale.ROOT);
            
            if (v instanceof Date dt) {
                map.put(upperKey, new java.sql.Timestamp(dt.getTime()).toInstant().toString());
            } else {
                map.put(upperKey, v);
            }
        }
        return map;
    }

    // ------------------------------------------------------------
    // DDL helpers
    // ------------------------------------------------------------

    private void createTargetTableIfAbsent(String qualified) {
        // qualified: schema.table (contoh: gis.jalur_prov)
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS " + safeSchema(qualified) + ";");
        jdbc.execute(
                "CREATE TABLE IF NOT EXISTS " + qualified + " (" +
                        " id BIGSERIAL PRIMARY KEY," +
                        " geom geometry(Geometry,4326) NOT NULL," +
                        " props jsonb" +
                        ")");
    }

    private String safeSchema(String qualified) {
        int i = qualified.indexOf('.');
        return (i > 0) ? qualified.substring(0, i) : "public";
    }

    // ------------------------------------------------------------
    // CRS helpers
    // ------------------------------------------------------------

    private MathTransform buildTransformTo4326(CoordinateReferenceSystem src) throws Exception {
        CoordinateReferenceSystem wgs84 = CRS.decode("EPSG:4326", true);
        if (src == null)
            return null;
        if (CRS.equalsIgnoreMetadata(src, wgs84))
            return null;
        return CRS.findMathTransform(src, wgs84, true);
    }

    // ------------------------------------------------------------
    // Misc
    // ------------------------------------------------------------

    private static String toIdent(String s) {
        if (s == null)
            return "layer";
        String out = s.replace('-', '_').replaceAll("[^A-Za-z0-9_]", "_");
        if (out.isBlank())
            return "layer";
        if (!Character.isLetter(out.charAt(0)) && out.charAt(0) != '_') {
            out = "_" + out;
        }
        return out.toLowerCase(Locale.ROOT);
    }

    private static void deleteRecursive(Path p) {
        if (p == null)
            return;
        try {
            if (Files.notExists(p))
                return;
            Files.walk(p)
                    .sorted(Comparator.reverseOrder())
                    .forEach(q -> {
                        try {
                            Files.deleteIfExists(q);
                        } catch (IOException ignore) {
                        }
                    });
        } catch (IOException ignore) {
        }
    }

    // ------------------------------------------------------------
    // Stats
    // ------------------------------------------------------------

    public static class ImportStats {
        private long count = 0L;
        private Set<String> propertyNames = new LinkedHashSet<>();

        public void inc() {
            count++;
        }

        public long count() {
            return count;
        }
        
        public Set<String> getPropertyNames() {
            return propertyNames;
        }
        
        public void setPropertyNames(Set<String> propertyNames) {
            this.propertyNames = propertyNames;
        }
    }
}
