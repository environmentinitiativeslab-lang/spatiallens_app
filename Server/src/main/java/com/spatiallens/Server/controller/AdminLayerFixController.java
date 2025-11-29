package com.spatiallens.Server.controller;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spatiallens.Server.model.LayerMeta;
import com.spatiallens.Server.repository.LayerMetaRepository;

/**
 * Admin endpoint untuk fix props_whitelist pada layer yang sudah di-import
 * sebelum fitur auto-populate ditambahkan.
 */
@RestController
@RequestMapping("/api/admin/layers")
public class AdminLayerFixController {

    private final LayerMetaRepository metaRepo;
    private final JdbcTemplate jdbc;
    private final ObjectMapper om = new ObjectMapper();

    public AdminLayerFixController(LayerMetaRepository metaRepo, JdbcTemplate jdbc) {
        this.metaRepo = metaRepo;
        this.jdbc = jdbc;
    }

    /**
     * Auto-populate props_whitelist untuk layer tertentu dengan
     * semua property keys yang ada di data.
     */
    @PostMapping("/{slug}/fix-whitelist")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> fixWhitelist(@PathVariable String slug) {
        try {
            LayerMeta meta = metaRepo.findBySlug(slug).orElse(null);
            if (meta == null) {
                return ResponseEntity.notFound().build();
            }

            String qualified = meta.getSchemaName() + "." + safeIdent(meta.getTableName());

            // Query untuk ambil semua distinct property keys dari JSONB
            String sql = String.format("""
                    SELECT DISTINCT jsonb_object_keys(props) AS key
                    FROM %s
                    WHERE props IS NOT NULL
                    """, qualified);

            List<String> keys = jdbc.query(sql, (rs, rowNum) -> rs.getString("key"));

            if (keys.isEmpty()) {
                return ResponseEntity.ok().body(new FixResult(slug, 0, "No properties found"));
            }

            // Set whitelist
            Set<String> propertyNames = new LinkedHashSet<>(keys);
            String whitelist = om.writeValueAsString(new ArrayList<>(propertyNames));
            meta.setPropsWhitelist(whitelist);
            metaRepo.save(meta);

            return ResponseEntity.ok(new FixResult(slug, keys.size(), "Whitelist updated: " + whitelist));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(new FixResult(slug, 0, "Error: " + e.getMessage()));
        }
    }

    /**
     * Fix all layers yang belum punya whitelist
     */
    @PostMapping("/fix-all-whitelist")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> fixAllWhitelist() {
        try {
            List<LayerMeta> allLayers = metaRepo.findAll();
            List<FixResult> results = new ArrayList<>();

            for (LayerMeta meta : allLayers) {
                try {
                    // Skip jika sudah ada whitelist
                    if (meta.getPropsWhitelist() != null && !meta.getPropsWhitelist().isBlank()) {
                        results.add(new FixResult(meta.getSlug(), 0, "Already has whitelist, skipped"));
                        continue;
                    }

                    String qualified = meta.getSchemaName() + "." + safeIdent(meta.getTableName());

                    String sql = String.format("""
                            SELECT DISTINCT jsonb_object_keys(props) AS key
                            FROM %s
                            WHERE props IS NOT NULL
                            LIMIT 100
                            """, qualified);

                    List<String> keys = jdbc.query(sql, (rs, rowNum) -> rs.getString("key"));

                    if (!keys.isEmpty()) {
                        Set<String> propertyNames = new LinkedHashSet<>(keys);
                        String whitelist = om.writeValueAsString(new ArrayList<>(propertyNames));
                        meta.setPropsWhitelist(whitelist);
                        metaRepo.save(meta);
                        results.add(new FixResult(meta.getSlug(), keys.size(), "Fixed"));
                    } else {
                        results.add(new FixResult(meta.getSlug(), 0, "No properties found"));
                    }

                } catch (Exception e) {
                    results.add(new FixResult(meta.getSlug(), 0, "Error: " + e.getMessage()));
                }
            }

            return ResponseEntity.ok(results);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    private String safeIdent(String ident) {
        return ident.replaceAll("[^A-Za-z0-9_]", "_");
    }

    public record FixResult(String slug, int propertyCount, String message) {
    }
}

