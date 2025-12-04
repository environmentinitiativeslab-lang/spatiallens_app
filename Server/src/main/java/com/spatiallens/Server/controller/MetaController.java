package com.spatiallens.Server.controller;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.Polygon;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.spatiallens.Server.model.LayerMeta;
import com.spatiallens.Server.repository.LayerMetaRepository;

/**
 * Endpoint metadata ringan untuk konsumsi FE (MVT).
 * - GET list: Viewer hanya Published; Admin/Editor melihat semua.
 * - GET detail: Draft akan jadi 404 jika user tidak berhak (anti info leak).
 * - PUT status: ADMIN only.
 */
@RestController
@RequestMapping("/api/layers/meta")
public class MetaController {

    private final LayerMetaRepository metaRepo;

    public MetaController(LayerMetaRepository metaRepo) {
        this.metaRepo = metaRepo;
    }

    // ---- DTOs ----
    public record LayerMetaView(
            String slug,
            String name,
            String status, // "Draft" | "Published"
            String category,
            Integer minzoom,
            Integer maxzoom,
            Long featureCount,
            double[] bbox, // [minLon,minLat,maxLon,maxLat] (EPSG:4326) atau null
            String updatedAt // ISO-8601 atau null
    ) {
    }

    public record ChangeStatusRequest(String status) {
    }

    // ---- Helpers ----
    private boolean canAccessRestricted() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null)
            return false;
        for (GrantedAuthority ga : auth.getAuthorities()) {
            String a = ga.getAuthority();
            if ("ROLE_ADMIN".equals(a) || "ROLE_EDITOR".equals(a))
                return true;
        }
        return false;
    }

    private static double[] bboxArray(Polygon poly) {
        if (poly == null)
            return null;
        Envelope e = poly.getEnvelopeInternal();
        return new double[] { e.getMinX(), e.getMinY(), e.getMaxX(), e.getMaxY() };
    }

    private static String ts(OffsetDateTime t) {
        return t == null ? null : t.toString();
    }

    private static boolean isPublished(LayerMeta lm) {
        return "Published".equalsIgnoreCase(lm.getStatus());
    }

    private static LayerMetaView viewOf(LayerMeta lm) {
        return new LayerMetaView(
                lm.getSlug(),
                lm.getName(),
                lm.getStatus(),
                lm.getCategory(),
                lm.getMinzoom(),
                lm.getMaxzoom(),
                lm.getFeatureCount(),
                bboxArray(lm.getBbox()),
                ts(lm.getUpdatedAt()));
    }

    // ---- READ ----

    /** List metadata untuk katalog layer di FE. */
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public List<LayerMetaView> list() {
        boolean allowedRestricted = canAccessRestricted();
        return metaRepo.findAll().stream()
                .filter(lm -> allowedRestricted || isPublished(lm))
                .map(MetaController::viewOf)
                .toList();
    }

    /** Detail per slug. Draft akan jadi 404 jika user tak berhak. */
    @GetMapping(path = "/{slug}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getOne(@PathVariable String slug) {
        Optional<LayerMeta> opt = metaRepo.findBySlug(slug);
        if (opt.isEmpty())
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        LayerMeta lm = opt.get();
        boolean allowedRestricted = canAccessRestricted();
        if (!allowedRestricted && !isPublished(lm)) {
            // samarkan sebagai 404 agar tidak bocor
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(viewOf(lm));
    }

    /** Distinct categories (admin/editor/viewer). */
    @GetMapping(path = "/categories", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<String> categories() {
        return metaRepo.distinctCategories();
    }

    // ---- UPDATE (ADMIN only) ----

    /** Ubah status Draft/Published pada metadata tiles. */
    @PutMapping(path = "/{slug}/status", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> changeStatus(@PathVariable String slug, @RequestBody ChangeStatusRequest req) {
        if (req == null || req.status() == null) {
            return ResponseEntity.badRequest().build();
        }
        String v = req.status().trim();
        if (!"draft".equalsIgnoreCase(v) && !"published".equalsIgnoreCase(v)) {
            return ResponseEntity.badRequest().build();
        }
        LayerMeta lm = metaRepo.findBySlug(slug).orElse(null);
        if (lm == null)
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        lm.setStatus(Character.toUpperCase(v.charAt(0)) + v.substring(1).toLowerCase(Locale.ROOT));
        metaRepo.save(lm);
        return ResponseEntity.noContent().build();
    }
}
