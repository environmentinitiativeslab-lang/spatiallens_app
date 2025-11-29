// src/main/java/com/spatiallens/Server/service/LayerStyleService.java
package com.spatiallens.Server.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spatiallens.Server.model.LayerMeta;
import com.spatiallens.Server.model.LayerStyle;
import com.spatiallens.Server.repository.LayerMetaRepository;
import com.spatiallens.Server.repository.LayerStyleRepository;

@Service
public class LayerStyleService {

    public record StyleResult(String json, boolean publicPublished, String etag) {
    }

    private final LayerMetaRepository metaRepo;
    private final LayerStyleRepository styleRepo;
    private final ObjectMapper om;

    public LayerStyleService(LayerMetaRepository metaRepo, LayerStyleRepository styleRepo, ObjectMapper om) {
        this.metaRepo = metaRepo;
        this.styleRepo = styleRepo;
        this.om = om;
    }

    /** Ambil style efektif (custom kalau ada, kalau tidak generate default). */
    public Optional<StyleResult> getEffectiveStyle(String slug, boolean canAccessRestricted) {
        Optional<LayerMeta> metaOpt = metaRepo.findBySlug(slug);
        if (metaOpt.isEmpty())
            return Optional.empty();

        LayerMeta lm = metaOpt.get();
        boolean isPublished = "Published".equalsIgnoreCase(lm.getStatus());
        boolean publicPublished = isPublished;

        if (!isPublished && !canAccessRestricted) {
            // treat as not found to avoid info leak
            return Optional.empty();
        }

        String json = styleRepo.findByLayerSlug(slug)
                .map(LayerStyle::getStyleJson)
                .orElseGet(() -> defaultStyleFor(slug));

        String etag = sha1Etag(json);
        return Optional.of(new StyleResult(json, publicPublished, etag));
    }

    /** Simpan/replace style (validasi JSON dulu). */
    public void upsertStyle(String slug, String json) throws Exception {
        // validate JSON structure
        JsonNode node = om.readTree(json);
        if (!node.isObject())
            throw new IllegalArgumentException("Style must be a JSON object");

        LayerStyle style = styleRepo.findByLayerSlug(slug)
                .orElseGet(() -> LayerStyle.builder().layerSlug(slug).build());
        style.setStyleJson(om.writeValueAsString(node)); // normalized/pretty-safe
        styleRepo.save(style);
    }

    public void deleteStyle(String slug) {
        styleRepo.findByLayerSlug(slug).ifPresent(styleRepo::delete);
    }

    private String defaultStyleFor(String slug) {
        // GL Style minimal: 1 source vektor + 3 layer generik (fill/line/circle)
        // URL tiles mengikuti endpoint kita: /tiles/{slug}/{z}/{x}/{y}.pbf
        return """
                {
                  "version": 8,
                  "name": "Default %s",
                  "sources": {
                    "%s": {
                      "type": "vector",
                      "tiles": ["/tiles/%s/{z}/{x}/{y}.pbf"],
                      "minzoom": 0,
                      "maxzoom": 22
                    }
                  },
                  "layers": [
                    {
                      "id": "%s-fill",
                      "type": "fill",
                      "source": "%s",
                      "source-layer": "%s",
                      "paint": { "fill-opacity": 0.4 }
                    },
                    {
                      "id": "%s-line",
                      "type": "line",
                      "source": "%s",
                      "source-layer": "%s",
                      "paint": { "line-width": 1 }
                    },
                    {
                      "id": "%s-point",
                      "type": "circle",
                      "source": "%s",
                      "source-layer": "%s",
                      "paint": { "circle-radius": 3 }
                    }
                  ]
                }
                """.formatted(slug, slug, slug,
                slug, slug, slug,
                slug, slug, slug,
                slug, slug, slug);
    }

    private String sha1Etag(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] dig = md.digest(s.getBytes(StandardCharsets.UTF_8));
            return "W/\"" + HexFormat.of().formatHex(dig) + "\"";
        } catch (Exception e) {
            // fallback hashCode
            return "W/\"" + Integer.toHexString(s.hashCode()) + "\"";
        }
    }
}
