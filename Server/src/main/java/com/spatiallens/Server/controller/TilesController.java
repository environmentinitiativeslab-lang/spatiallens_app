// src/main/java/com/spatiallens/Server/controller/TilesController.java
package com.spatiallens.Server.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.spatiallens.Server.service.MvtTileService;
import com.spatiallens.Server.service.MvtTileService.TileResult;

@RestController
public class TilesController {

    private final MvtTileService tiles;

    public TilesController(MvtTileService tiles) {
        this.tiles = tiles;
    }

    // Satu mapping untuk .mvt dan .pbf
    @GetMapping(value = {
            "/tiles/{layerKey}/{z}/{x}/{y}.{ext:mvt|pbf}",
            "/api/public/tiles/{layerKey}/{z}/{x}/{y}.{ext:mvt|pbf}"
    }, produces = "application/vnd.mapbox-vector-tile")
    public ResponseEntity<byte[]> getTile(
            @PathVariable("layerKey") String slug,
            @PathVariable int z,
            @PathVariable int x,
            @PathVariable int y,
            @PathVariable String ext) {

        // Validasi dasar & out-of-range: x,y ∈ [0, 2^z - 1]
        if (z < 0 || x < 0 || y < 0) {
            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
        }
        int maxIndex = (z >= 31) ? Integer.MAX_VALUE : (1 << z); // hindari overflow
        if (x >= maxIndex || y >= maxIndex) {
            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
        }

        boolean canAccessRestricted = hasAnyRole("ADMIN", "EDITOR");
        TileResult res = tiles.getTile(slug, z, x, y, canAccessRestricted);

        // Empty -> 204 No Content
        if (res.empty()) {
            HttpHeaders h = new HttpHeaders();
            // cache policy konservatif utk empty
            if (res.publicPublished()) {
                h.add(HttpHeaders.CACHE_CONTROL, "public, max-age=600");
            } else {
                h.add(HttpHeaders.CACHE_CONTROL, "no-store");
            }
            return new ResponseEntity<>(null, h, HttpStatus.NO_CONTENT);
        }

        // Non-empty -> 200 + cache sesuai status publish
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.mapbox-vector-tile"));
        if (res.publicPublished()) {
            // aman untuk di-cache edge/CDN
            headers.add(HttpHeaders.CACHE_CONTROL, "public, max-age=86400, immutable");
        } else {
            // Draft -> jangan di-cache
            headers.setCacheControl(CacheControl.noStore().getHeaderValue());
        }

        return new ResponseEntity<>(res.body(), headers, HttpStatus.OK);
    }

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
