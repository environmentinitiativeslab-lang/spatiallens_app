package com.spatiallens.Server.controller;

import java.time.Duration;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.spatiallens.Server.service.GeoJsonExportService;
import com.spatiallens.Server.service.GeoJsonExportService.GeoJsonResult;
import com.spatiallens.Server.service.WmsRasterService;
import com.spatiallens.Server.service.WmsRasterService.WmsResult;

/**
 * Public API endpoints untuk konsumsi external apps.
 * - GeoJSON export (full layer atau filtered by bbox)
 * - WMS raster tiles
 * - MVT tiles (sudah ada di TilesController, bisa ditambahkan alias /api/public/tiles jika perlu)
 */
@RestController
@RequestMapping("/api/public")
public class PublicApiController {

    private final GeoJsonExportService geoJsonService;
    private final WmsRasterService wmsService;

    public PublicApiController(GeoJsonExportService geoJsonService, WmsRasterService wmsService) {
        this.geoJsonService = geoJsonService;
        this.wmsService = wmsService;
    }

    /**
     * Export layer sebagai GeoJSON FeatureCollection.
     * 
     * GET /api/public/geojson/{slug}
     * GET /api/public/geojson/{slug}?bbox=minLon,minLat,maxLon,maxLat
     * 
     * @param slug layer identifier
     * @param bbox optional bounding box filter (EPSG:4326)
     * @return GeoJSON FeatureCollection
     */
    @GetMapping(path = "/geojson/{slug}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getGeoJson(
            @PathVariable("slug") String slug,
            @RequestParam(value = "bbox", required = false) String bbox) {

        boolean canAccessRestricted = hasAnyRole("ADMIN", "EDITOR");
        GeoJsonResult res = geoJsonService.getGeoJson(slug, bbox, canAccessRestricted);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        if (res.publicPublished()) {
            // Cache for public published layers
            headers.setCacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic().getHeaderValue());
        } else {
            headers.setCacheControl(CacheControl.noStore().getHeaderValue());
        }

        if (res.empty()) {
            return new ResponseEntity<>(res.json(), headers, HttpStatus.OK);
        }

        return new ResponseEntity<>(res.json(), headers, HttpStatus.OK);
    }

    /**
     * WMS-like endpoint untuk raster tiles.
     * 
     * GET /api/public/wms/{slug}?bbox=minX,minY,maxX,maxY&width=256&height=256
     * 
     * @param slug   layer identifier
     * @param bbox   bounding box dalam EPSG:3857 (Web Mercator)
     * @param width  tile width (default 256, max 2048)
     * @param height tile height (default 256, max 2048)
     * @return PNG image
     */
    @GetMapping(path = "/wms/{slug}", produces = "image/png")
    public ResponseEntity<byte[]> getWmsTile(
            @PathVariable("slug") String slug,
            @RequestParam(value = "bbox", required = true) String bbox,
            @RequestParam(value = "width", defaultValue = "256") int width,
            @RequestParam(value = "height", defaultValue = "256") int height) {

        boolean canAccessRestricted = hasAnyRole("ADMIN", "EDITOR");
        WmsResult res = wmsService.getWmsTile(slug, bbox, width, height, canAccessRestricted);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);

        if (res.publicPublished()) {
            headers.setCacheControl(
                    CacheControl.maxAge(Duration.ofDays(1)).cachePublic().immutable().getHeaderValue());
        } else {
            headers.setCacheControl(CacheControl.noStore().getHeaderValue());
        }

        if (res.empty()) {
            return new ResponseEntity<>(res.image(), headers, HttpStatus.NO_CONTENT);
        }

        return new ResponseEntity<>(res.image(), headers, HttpStatus.OK);
    }

    // --- Helpers ---

    private boolean hasAnyRole(String... roles) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null)
            return false;
        for (GrantedAuthority ga : auth.getAuthorities()) {
            String a = ga.getAuthority();
            for (String r : roles) {
                if (("ROLE_" + r).equals(a))
                    return true;
            }
        }
        return false;
    }
}

