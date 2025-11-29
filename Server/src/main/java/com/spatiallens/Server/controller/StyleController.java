// src/main/java/com/spatiallens/Server/controller/StyleController.java
package com.spatiallens.Server.controller;

import java.time.Duration;
import java.util.Optional;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.spatiallens.Server.service.LayerStyleService;
import com.spatiallens.Server.service.LayerStyleService.StyleResult;

@RestController
@RequestMapping("/api/layers")
public class StyleController {

    private final LayerStyleService service;

    public StyleController(LayerStyleService service) {
        this.service = service;
    }

    /** GET style publik (atau 404 bila Draft & user tak berhak). */
    @GetMapping(value = "/{slug}/style", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getStyle(
            @PathVariable String slug,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {

        boolean canAccessRestricted = hasAnyRole("ADMIN", "EDITOR");
        Optional<StyleResult> opt = service.getEffectiveStyle(slug, canAccessRestricted);
        if (opt.isEmpty())
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

        StyleResult res = opt.get();

        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        h.setETag(res.etag());

        if (res.publicPublished()) {
            h.setCacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePublic().getHeaderValue());
        } else {
            h.setCacheControl(CacheControl.noStore().getHeaderValue());
        }

        if (ifNoneMatch != null && ifNoneMatch.equals(res.etag())) {
            return new ResponseEntity<>(null, h, HttpStatus.NOT_MODIFIED);
        }
        return new ResponseEntity<>(res.json(), h, HttpStatus.OK);
    }

    /**
     * PUT style (ADMIN/EDITOR via SecurityConfig). Body = JSON string apa adanya.
     */
    @PutMapping(value = "/{slug}/style", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> putStyle(@PathVariable String slug, @RequestBody String body) throws Exception {
        service.upsertStyle(slug, body);
        return ResponseEntity.noContent().build();
    }

    /** DELETE style → akan fallback ke default saat GET berikutnya. */
    @DeleteMapping("/{slug}/style")
    public ResponseEntity<Void> deleteStyle(@PathVariable String slug) {
        service.deleteStyle(slug);
        return ResponseEntity.noContent().build();
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
