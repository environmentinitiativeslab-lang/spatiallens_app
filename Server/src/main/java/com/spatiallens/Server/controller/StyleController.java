package com.spatiallens.Server.controller;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.security.access.prepost.PreAuthorize;

import com.spatiallens.Server.service.LayerStyleService;
import com.spatiallens.Server.service.LayerStyleService.StyleResult;

@RestController
@RequestMapping("/api/layers")
public class StyleController {

    private final LayerStyleService service;

    @Value("${style.sld-dir:${upload.dir}/styles}")
    private String sldDir;

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

    /**
     * Upload SLD (.sld) untuk layer lalu di-parse menjadi GL style dan disimpan di DB.
     */
    @PostMapping(path = "/{slug}/style/sld", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','EDITOR')")
    public ResponseEntity<?> uploadSld(
            @PathVariable String slug,
            @RequestParam("file") MultipartFile file) {
        try {
            String name = file != null ? file.getOriginalFilename() : null;
            if (name == null || !name.toLowerCase().endsWith(".sld")) {
                return ResponseEntity.badRequest().body(msg("Please upload a .sld file"));
            }
            Path dir = Paths.get(sldDir).toAbsolutePath();
            service.upsertSld(slug, file, dir);
            return ResponseEntity.ok(msg("SLD uploaded & style updated"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(msg(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(msg("Failed to process SLD: " + e.getMessage()));
        }
    }

    /** GET file SLD yang pernah diupload (admin/editor) */
    @GetMapping(path = "/{slug}/style/sld")
    @PreAuthorize("hasAnyRole('ADMIN','EDITOR')")
    public ResponseEntity<Resource> downloadSld(@PathVariable String slug) {
        Path dir = Paths.get(sldDir).toAbsolutePath();
        Optional<Path> opt = service.getSldPath(slug, dir);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        Path p = opt.get();
        if (!Files.exists(p)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        FileSystemResource res = new FileSystemResource(p);
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_XML);
        try {
            h.setContentLength(res.contentLength());
        } catch (java.io.IOException ignored) {
        }
        h.setContentDispositionFormData("attachment", p.getFileName().toString());
        return new ResponseEntity<>(res, h, HttpStatus.OK);
    }

    /** DELETE style untuk fallback ke default. */
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

    private static java.util.Map<String, String> msg(String m) {
        return java.util.Map.of("message", m);
    }
}
