package com.spatiallens.Server.service;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Optional;

import javax.imageio.ImageIO;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Geometry;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.spatiallens.Server.model.LayerMeta;
import com.spatiallens.Server.repository.LayerMetaRepository;

/**
 * Service untuk render WMS raster tiles.
 * Menggunakan PostGIS untuk query geometries, render manual dengan Java2D.
 */
@Service
public class WmsRasterService {

    private final JdbcTemplate jdbc;
    private final LayerMetaRepository metaRepo;

    public WmsRasterService(JdbcTemplate jdbc, LayerMetaRepository metaRepo) {
        this.jdbc = jdbc;
        this.metaRepo = metaRepo;
    }

    public record WmsResult(byte[] image, boolean empty, boolean publicPublished) {
    }

    /**
     * Render WMS tile sebagai PNG.
     * 
     * @param slug       layer identifier
     * @param bbox       bounding box: minX,minY,maxX,maxY dalam EPSG:3857
     * @param width      image width (default 256)
     * @param height     image height (default 256)
     * @param canAccessRestricted user permission
     */
    public WmsResult getWmsTile(String slug, String bbox, int width, int height, boolean canAccessRestricted) {
        // Validate dimensions
        if (width <= 0 || width > 2048 || height <= 0 || height > 2048) {
            return new WmsResult(emptyPng(256, 256), true, false);
        }

        Optional<LayerMeta> opt = metaRepo.findBySlug(slug);
        if (opt.isEmpty()) {
            return new WmsResult(emptyPng(width, height), true, false);
        }

        LayerMeta lm = opt.get();
        boolean isPublished = "Published".equalsIgnoreCase(lm.getStatus());
        boolean publicPublished = isPublished;

        // Access control
        if (!isPublished && !canAccessRestricted) {
            return new WmsResult(emptyPng(width, height), true, publicPublished);
        }

        // Validate metadata
        if (isBlank(lm.getSchemaName()) || isBlank(lm.getTableName()) || isBlank(lm.getGeomColumn())) {
            return new WmsResult(emptyPng(width, height), true, publicPublished);
        }

        // Parse bbox
        double[] bounds = parseBbox(bbox);
        if (bounds == null) {
            return new WmsResult(emptyPng(width, height), true, publicPublished);
        }

        final String qualified = safeIdent(lm.getSchemaName()) + "." + safeIdent(lm.getTableName());
        final String geomCol = safeIdent(lm.getGeomColumn());

        // Query geometries from PostGIS (transformed to EPSG:3857)
        String sql = String.format("""
                SELECT ST_AsText(ST_Transform(t.%s, 3857)) AS wkt
                FROM %s t
                WHERE ST_Intersects(
                    ST_Transform(t.%s, 3857),
                    ST_MakeEnvelope(%f, %f, %f, %f, 3857)
                )
                LIMIT 5000
                """, geomCol, qualified, geomCol, bounds[0], bounds[1], bounds[2], bounds[3]);

        try {
            var geometries = jdbc.query(sql, (rs, rowNum) -> rs.getString("wkt"));

            if (geometries.isEmpty()) {
                return new WmsResult(emptyPng(width, height), true, publicPublished);
            }

            // Render to PNG
            byte[] png = renderToPng(geometries, bounds, width, height);
            return new WmsResult(png, false, publicPublished);

        } catch (Exception ex) {
            return new WmsResult(emptyPng(width, height), true, publicPublished);
        }
    }

    // --- Rendering ---

    private byte[] renderToPng(java.util.List<String> wktList, double[] bounds, int width, int height) {
        try {
            BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g2d = img.createGraphics();

            // Enable antialiasing
            g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            // Transparent background
            g2d.setComposite(java.awt.AlphaComposite.Clear);
            g2d.fillRect(0, 0, width, height);
            g2d.setComposite(java.awt.AlphaComposite.SrcOver);

            // Set style
            g2d.setColor(new Color(163, 217, 165, 102)); // #A3D9A5 with alpha
            g2d.setStroke(new java.awt.BasicStroke(1.5f));

            double minX = bounds[0];
            double minY = bounds[1];
            double maxX = bounds[2];
            double maxY = bounds[3];
            double scaleX = width / (maxX - minX);
            double scaleY = height / (maxY - minY);

            // Parse and draw geometries
            org.locationtech.jts.io.WKTReader wktReader = new org.locationtech.jts.io.WKTReader();
            for (String wkt : wktList) {
                try {
                    Geometry geom = wktReader.read(wkt);
                    drawGeometry(g2d, geom, minX, minY, maxY, scaleX, scaleY, height);
                } catch (Exception e) {
                    // Skip invalid geometries
                }
            }

            g2d.dispose();

            // Convert to PNG bytes
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "PNG", baos);
            return baos.toByteArray();

        } catch (Exception e) {
            return emptyPng(width, height);
        }
    }

    private void drawGeometry(Graphics2D g2d, Geometry geom, double minX, double minY, double maxY, 
                              double scaleX, double scaleY, int height) {
        Coordinate[] coords = geom.getCoordinates();
        if (coords.length == 0) return;

        int[] xPoints = new int[coords.length];
        int[] yPoints = new int[coords.length];

        for (int i = 0; i < coords.length; i++) {
            xPoints[i] = (int) ((coords[i].x - minX) * scaleX);
            yPoints[i] = (int) (height - ((coords[i].y - minY) * scaleY));
        }

        // Fill polygon
        g2d.fillPolygon(xPoints, yPoints, coords.length);

        // Draw outline
        g2d.setColor(new Color(21, 71, 52)); // #154734
        g2d.drawPolygon(xPoints, yPoints, coords.length);
        g2d.setColor(new Color(163, 217, 165, 102)); // Reset fill color
    }

    // --- Helpers ---

    private double[] parseBbox(String bbox) {
        if (bbox == null || bbox.isBlank()) {
            return null;
        }
        try {
            String[] parts = bbox.split(",");
            if (parts.length != 4) {
                return null;
            }
            return new double[] {
                    Double.parseDouble(parts[0].trim()),
                    Double.parseDouble(parts[1].trim()),
                    Double.parseDouble(parts[2].trim()),
                    Double.parseDouble(parts[3].trim())
            };
        } catch (Exception e) {
            return null;
        }
    }

    private byte[] emptyPng(int width, int height) {
        try {
            BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g2d = img.createGraphics();
            g2d.setComposite(java.awt.AlphaComposite.Clear);
            g2d.fillRect(0, 0, width, height);
            g2d.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "PNG", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            return new byte[0];
        }
    }

    private String safeIdent(String ident) {
        return ident.replaceAll("[^A-Za-z0-9_]", "_");
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}

