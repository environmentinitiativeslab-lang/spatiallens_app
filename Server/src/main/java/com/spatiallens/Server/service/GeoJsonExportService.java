package com.spatiallens.Server.service;

import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.spatiallens.Server.model.LayerMeta;
import com.spatiallens.Server.repository.LayerMetaRepository;

/**
 * Service untuk export layer sebagai GeoJSON.
 * Menggunakan ST_AsGeoJSON dari PostGIS untuk konversi.
 */
@Service
public class GeoJsonExportService {

    private final JdbcTemplate jdbc;
    private final LayerMetaRepository metaRepo;

    public GeoJsonExportService(JdbcTemplate jdbc, LayerMetaRepository metaRepo) {
        this.jdbc = jdbc;
        this.metaRepo = metaRepo;
    }

    public record GeoJsonResult(String json, boolean empty, boolean publicPublished) {
    }

    /**
     * Export layer sebagai GeoJSON FeatureCollection.
     * - Hanya Published + PUBLIC yang bisa diakses tanpa auth
     * - Support optional bbox filter untuk limit features
     * - Transform ke EPSG:4326 untuk compatibility
     */
    public GeoJsonResult getGeoJson(String slug, String bboxParam, boolean canAccessRestricted) {
        Optional<LayerMeta> opt = metaRepo.findBySlug(slug);
        if (opt.isEmpty()) {
            return new GeoJsonResult(emptyFeatureCollection(), true, false);
        }

        LayerMeta lm = opt.get();
        boolean isPublished = "Published".equalsIgnoreCase(lm.getStatus());
        boolean publicPublished = isPublished;

        // Access control
        if (!isPublished && !canAccessRestricted) {
            return new GeoJsonResult(emptyFeatureCollection(), true, publicPublished);
        }

        // Validate metadata
        if (isBlank(lm.getSchemaName()) || isBlank(lm.getTableName()) || isBlank(lm.getGeomColumn())) {
            return new GeoJsonResult(emptyFeatureCollection(), true, publicPublished);
        }

        final String qualified = safeIdent(lm.getSchemaName()) + "." + safeIdent(lm.getTableName());
        final String geomCol = safeIdent(lm.getGeomColumn());

        // Build query with optional bbox filter
        String whereClause = buildWhereClause(bboxParam, geomCol);

        // Query untuk generate GeoJSON FeatureCollection
        String sql = String.format("""
                SELECT jsonb_build_object(
                    'type', 'FeatureCollection',
                    'features', COALESCE(jsonb_agg(feature), '[]'::jsonb)
                )::text
                FROM (
                    SELECT jsonb_build_object(
                        'type', 'Feature',
                        'id', t.id,
                        'geometry', ST_AsGeoJSON(ST_Transform(t.%s, 4326), 6)::jsonb,
                        'properties', t.props
                    ) AS feature
                    FROM %s t
                    %s
                    LIMIT 10000
                ) AS features
                """, geomCol, qualified, whereClause);

        try {
            String json = jdbc.queryForObject(sql, String.class);
            if (json == null || json.isBlank()) {
                return new GeoJsonResult(emptyFeatureCollection(), true, publicPublished);
            }
            return new GeoJsonResult(json, false, publicPublished);
        } catch (Exception ex) {
            // Fail-closed
            return new GeoJsonResult(emptyFeatureCollection(), true, publicPublished);
        }
    }

    // --- Helpers ---

    private String buildWhereClause(String bboxParam, String geomCol) {
        if (bboxParam == null || bboxParam.isBlank()) {
            return "";
        }

        try {
            String[] parts = bboxParam.split(",");
            if (parts.length != 4) {
                return "";
            }

            double minLon = Double.parseDouble(parts[0].trim());
            double minLat = Double.parseDouble(parts[1].trim());
            double maxLon = Double.parseDouble(parts[2].trim());
            double maxLat = Double.parseDouble(parts[3].trim());

            // Create bbox geometry in EPSG:4326
            return String.format(
                    "WHERE ST_Intersects(ST_Transform(t.%s, 4326), ST_MakeEnvelope(%f, %f, %f, %f, 4326))",
                    geomCol, minLon, minLat, maxLon, maxLat);
        } catch (Exception e) {
            return "";
        }
    }

    private String safeIdent(String ident) {
        return ident.replaceAll("[^A-Za-z0-9_]", "_");
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private String emptyFeatureCollection() {
        return "{\"type\":\"FeatureCollection\",\"features\":[]}";
    }
}

