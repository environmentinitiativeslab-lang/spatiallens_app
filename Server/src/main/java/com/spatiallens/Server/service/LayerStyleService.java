// src/main/java/com/spatiallens/Server/service/LayerStyleService.java
package com.spatiallens.Server.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

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

    private record SldRule(String field, String value, String fillColor, String strokeColor,
            Double fillOpacity, Double strokeWidth) {
    }

    private record ParsedSld(String fillColor, String strokeColor, Double fillOpacity, Double strokeWidth,
            java.util.List<SldRule> rules) {
    }

    private static final String DEFAULT_COLOR = "#690000";
    private static final double DEFAULT_FILL_OPACITY = 0.6;
    private static final double DEFAULT_LINE_WIDTH = 1.0;

    private static final Pattern COLOR_PARAM = Pattern
            .compile("(?is)<[^>]+name\\s*=\\s*\"(fill|stroke)\"[^>]*>([^<]+)<");
    private static final Pattern OPACITY_PARAM = Pattern
            .compile("(?is)<[^>]+name\\s*=\\s*\"(fill-opacity|stroke-opacity)\"[^>]*>([^<]+)<");
    private static final Pattern WIDTH_PARAM = Pattern
            .compile("(?is)<[^>]+name\\s*=\\s*\"stroke-width\"[^>]*>([^<]+)<");
    private static final Pattern RULE_BLOCK = Pattern
            .compile("(?is)<\\s*se:Rule[^>]*>(.*?)</\\s*se:Rule\\s*>|<\\s*Rule[^>]*>(.*?)</\\s*Rule\\s*>");
    private static final Pattern FILTER_EQ = Pattern.compile(
            "(?is)<[^>]*PropertyIsEqualTo[^>]*>.*?<[^>]*PropertyName[^>]*>([^<]+)<.*?<[^>]*Literal[^>]*>([^<]+)<.*?</[^>]*PropertyIsEqualTo>");

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

    /**
     * Upload + parse SLD, lalu simpan style_json yang diturunkan dari warna SLD.
     * SLD disimpan di direktori yang diberikan.
     */
    public void upsertSld(String slug, MultipartFile file, Path sldDir) throws Exception {
        LayerMeta lm = metaRepo.findBySlug(slug).orElseThrow(() -> new IllegalArgumentException("Layer not found"));
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        Files.createDirectories(sldDir);
        String originalName = file.getOriginalFilename();
        Path target = sldDir.resolve(slug + ".sld");
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }

        String xml = Files.readString(target, StandardCharsets.UTF_8);
        ParsedSld parsed = parseSld(xml);

        String styleJson = buildStyleFromSld(lm.getSlug(), parsed);
        LayerStyle style = styleRepo.findByLayerSlug(slug)
                .orElseGet(() -> LayerStyle.builder().layerSlug(slug).build());
        style.setStyleJson(styleJson);
        style.setSldPath(target.toString());
        style.setSldFilename(originalName);
        styleRepo.save(style);
    }

    /** Ambil file SLD yang tersimpan (jika ada) */
    public Optional<Path> getSldPath(String slug, Path sldDir) {
        return styleRepo.findByLayerSlug(slug)
                .map(LayerStyle::getSldPath)
                .map(Path::of)
                .filter(Files::exists)
                .or(() -> {
                    Path p = sldDir.resolve(slug + ".sld");
                    return Files.exists(p) ? Optional.of(p) : Optional.empty();
                });
    }

    public void deleteStyle(String slug) {
        styleRepo.findByLayerSlug(slug).ifPresent(styleRepo::delete);
    }

    private String defaultStyleFor(String slug) {
        // GL Style minimal: 1 source vektor + 3 layer generik (fill/line/circle)
        // URL tiles mengikuti endpoint kita: /tiles/{slug}/{z}/{x}/{y}.pbf
        return buildStyleFromSld(slug, new ParsedSld(DEFAULT_COLOR, DEFAULT_COLOR, DEFAULT_FILL_OPACITY,
                DEFAULT_LINE_WIDTH, List.of()));
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

    private String buildStyleFromSld(String slug, ParsedSld sld) {
        String fill = sld.fillColor() != null ? sld.fillColor() : DEFAULT_COLOR;
        String stroke = sld.strokeColor() != null ? sld.strokeColor() : fill;
        double fillOpacity = sld.fillOpacity() != null ? sld.fillOpacity() : DEFAULT_FILL_OPACITY;
        double strokeWidth = sld.strokeWidth() != null ? sld.strokeWidth() : DEFAULT_LINE_WIDTH;

        Map<String, Object> styleMap = Map.of(
                "fillColor", fill,
                "lineColor", stroke,
                "fillOpacity", fillOpacity,
                "lineWidth", strokeWidth,
                "fillExpression", buildMatchExpression(sld.rules(), fill),
                "lineExpression", buildMatchExpression(sld.rules(), stroke));

        try {
            return om.writeValueAsString(styleMap);
        } catch (Exception e) {
            return "{\"fillColor\":\"" + fill + "\",\"lineColor\":\"" + stroke + "\"}";
        }
    }

    private ParsedSld parseSld(String xml) throws IOException {
        if (xml == null) {
            return new ParsedSld(DEFAULT_COLOR, DEFAULT_COLOR, DEFAULT_FILL_OPACITY, DEFAULT_LINE_WIDTH,
                    java.util.List.of());
        }

        String trimmed = xml.trim();
        String fill = extractColor(trimmed, "fill");
        String stroke = extractColor(trimmed, "stroke");
        Double fillOpacity = extractOpacity(trimmed, "fill-opacity");
        Double strokeOpacity = extractOpacity(trimmed, "stroke-opacity");
        Double strokeWidth = extractWidth(trimmed);

        if (fillOpacity == null && strokeOpacity != null) {
            fillOpacity = strokeOpacity;
        }

        java.util.List<SldRule> rules = extractRules(trimmed);

        return new ParsedSld(
                normalizeColor(fill),
                normalizeColor(stroke),
                fillOpacity,
                strokeWidth,
                rules);
    }

    private java.util.List<SldRule> extractRules(String xml) {
        java.util.List<SldRule> rules = new java.util.ArrayList<>();
        Matcher m = RULE_BLOCK.matcher(xml);
        while (m.find()) {
            String block = m.group(1) != null ? m.group(1) : m.group(2);
            if (block == null)
                continue;

            String field = null;
            String value = null;
            Matcher f = FILTER_EQ.matcher(block);
            if (f.find()) {
                field = f.group(1).trim();
                value = f.group(2).trim();
            }

            String fill = extractColor(block, "fill");
            String stroke = extractColor(block, "stroke");
            Double fillOp = extractOpacity(block, "fill-opacity");
            Double strokeOp = extractOpacity(block, "stroke-opacity");
            Double width = extractWidth(block);
            if (fillOp == null && strokeOp != null) {
                fillOp = strokeOp;
            }

            rules.add(new SldRule(field, value, normalizeColor(fill), normalizeColor(stroke), fillOp, width));
        }
        return rules;
    }

    private Object buildMatchExpression(java.util.List<SldRule> rules, String fallback) {
        // Build ["match", ["get", field], value1, color1, value2, color2, fallback]
        if (rules == null || rules.isEmpty())
            return null;

        String field = null;
        for (SldRule r : rules) {
            if (r.field() != null && !r.field().isBlank()) {
                field = r.field();
                break;
            }
        }
        if (field == null)
            return null;

        java.util.List<Object> expr = new java.util.ArrayList<>();
        expr.add("match");
        expr.add(java.util.List.of("get", field));

        for (SldRule r : rules) {
            if (r.value() == null)
                continue;
            String color = r.fillColor() != null ? r.fillColor() : r.strokeColor();
            if (color == null)
                continue;
            expr.add(r.value());
            expr.add(color);
        }
        expr.add(fallback);
        return expr;
    }

    private String extractColor(String xml, String param) {
        Matcher m = COLOR_PARAM.matcher(xml);
        while (m.find()) {
            if (param.equalsIgnoreCase(m.group(1))) {
                return m.group(2).trim();
            }
        }
        return null;
    }

    private Double extractOpacity(String xml, String param) {
        Matcher m = OPACITY_PARAM.matcher(xml);
        while (m.find()) {
            if (param.equalsIgnoreCase(m.group(1))) {
                try {
                    return Double.parseDouble(m.group(2).trim());
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return null;
    }

    private Double extractWidth(String xml) {
        Matcher m = WIDTH_PARAM.matcher(xml);
        if (m.find()) {
            try {
                return Double.parseDouble(m.group(1).trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return null;
    }

    private String normalizeColor(String c) {
        if (c == null || c.isBlank())
            return null;
        String s = c.trim();
        if (s.startsWith("#")) {
            if (s.length() == 7 || s.length() == 4 || s.length() == 9) {
                return s.toUpperCase(Locale.ROOT);
            }
        }
        // try rgba(...) -> convert to hex if possible
        if (s.toLowerCase(Locale.ROOT).startsWith("rgb")) {
            try {
                String inside = s.substring(s.indexOf('(') + 1, s.lastIndexOf(')'));
                String[] parts = inside.split(",");
                if (parts.length >= 3) {
                    int r = Integer.parseInt(parts[0].trim());
                    int g = Integer.parseInt(parts[1].trim());
                    int b = Integer.parseInt(parts[2].trim());
                    r = clamp(r, 0, 255);
                    g = clamp(g, 0, 255);
                    b = clamp(b, 0, 255);
                    return "#" + toHex(r) + toHex(g) + toHex(b);
                }
            } catch (Exception ignored) {
            }
        }
        return s;
    }

    private int clamp(int v, int min, int max) {
        return Math.max(min, Math.min(max, v));
    }

    private String toHex(int v) {
        return String.format("%02X", v);
    }
}
