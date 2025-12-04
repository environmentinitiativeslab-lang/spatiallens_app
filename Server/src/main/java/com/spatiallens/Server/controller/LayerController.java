package com.spatiallens.Server.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathFactory;
import javax.xml.namespace.NamespaceContext;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.spatiallens.Server.model.LayerMeta;
import com.spatiallens.Server.model.LayerUpload;
import com.spatiallens.Server.repository.LayerMetaRepository;
import com.spatiallens.Server.repository.LayerStyleRepository;
import com.spatiallens.Server.repository.LayerUploadRepository;
import com.spatiallens.Server.service.LayerImportService;

import org.w3c.dom.Document;
import org.w3c.dom.Node;
import java.util.Iterator;

@RestController
@RequestMapping("/api/layers")
public class LayerController {

    private final LayerUploadRepository repo;
    private final LayerMetaRepository metaRepo;
    private final LayerStyleRepository styleRepo;
    private final LayerImportService importer;
    private final JdbcTemplate jdbc;

    public LayerController(
            LayerUploadRepository repo,
            LayerMetaRepository metaRepo,
            LayerStyleRepository styleRepo,
            LayerImportService importer,
            JdbcTemplate jdbc) {
        this.repo = repo;
        this.metaRepo = metaRepo;
        this.styleRepo = styleRepo;
        this.importer = importer;
        this.jdbc = jdbc;
    }

    @Value("${upload.public-dir:uploads/public}")
    private String publicDir;

    @Value("${upload.private-dir:uploads/private}")
    private String privateDir;

    @Value("${metadata.dir:${upload.dir}/metadata}")
    private String metadataDir;

    private static final String STATUS_DRAFT = "Draft";
    private static final String STATUS_PUBLISHED = "Published";

    private Path metadataPath(String slug) {
        return Paths.get(metadataDir, slug + ".xml");
    }

    /*
     * =========================
     * LIST (butuh login)
     * =========================
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EDITOR','VIEWER')")
    public List<LayerUpload> listAll() {
        return repo.findAllByOrderByIdDesc();
    }

    /*
     * =========================
     * UPLOAD + AUTO IMPORT
     * =========================
     */
    @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','EDITOR')")
    public ResponseEntity<?> upload(
            @RequestParam("name") String name,
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam("file") MultipartFile file) {

        String cleanName = clean(name);
        if (cleanName.isBlank())
            return bad("Name is required");
        if (file == null || file.isEmpty())
            return bad("File is required");

        String original = StringUtils.hasText(file.getOriginalFilename())
                ? file.getOriginalFilename()
                : "upload.bin";
        String ext = extOf(original);
        String inferredType = inferType(type, ext, file.getContentType());
        String reqStatus = ("Published".equalsIgnoreCase(status) ? STATUS_PUBLISHED : STATUS_DRAFT);
        String cleanCategory = clean(category);
        if (cleanCategory.isBlank())
            cleanCategory = "Uncategorized";

        // siapkan folder simpan
        Path pubDir = Paths.get(publicDir);
        Path rawDir = Paths.get(privateDir, "raw");
        try {
            Files.createDirectories(pubDir);
            Files.createDirectories(rawDir);
        } catch (IOException e) {
            return bad("Failed to init storage: " + e.getMessage());
        }

        // slug unik
        String baseSlug = slugify(cleanName);
        String slug = uniqueSlug(baseSlug);

        // path file
        String ts = String.valueOf(System.currentTimeMillis());
        String rawName = ts + "_" + original.replaceAll("\\s+", "_");
        Path rawPath = rawDir.resolve(rawName);

        String publicName = slug + "-" + ts + ext;
        Path publicPath = pubDir.resolve(publicName);

        // simpan fisik
        try {
            Files.copy(file.getInputStream(), rawPath, StandardCopyOption.REPLACE_EXISTING);
            Files.copy(rawPath, publicPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ioe) {
            return bad("Failed to save file: " + ioe.getMessage());
        }

        // simpan record upload
        LayerUpload upload = LayerUpload.builder()
                .name(cleanName)
                .type(inferredType)
                .status(reqStatus)
                .category(cleanCategory)
                .date(LocalDate.now().toString())
                .slug(slug)
                .publicPath("/uploads/" + publicName)
                .rawPath(rawPath.toString())
                .sizeBytes(sizeOrNull(publicPath))
                .featureCount(null)
                .build();

        LayerUpload saved = repo.save(upload);

        // langsung impor + register ke tabel fitur & layers metadata
        try {
            LayerImportService.ImportResult result = importer.importAndRegister(saved);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "message", "Upload & import OK",
                    "slug", result.slug(),
                    "table", result.table(),
                    "count", result.count()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Import failed: " + ex.getMessage(),
                            "slug", slug));
        }
    }

    /*
     * =========================
     * UPDATE (rename / status)
     * =========================
     */
    public record UpdateRequest(String name, String status) {
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EDITOR')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody UpdateRequest req) {
        var opt = repo.findById(id);
        if (opt.isEmpty())
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(msg("Not found"));

        var lu = opt.get();
        boolean changed = false;

        if (req.name() != null) {
            String newName = clean(req.name());
            if (!newName.isBlank() && !newName.equals(lu.getName())) {
                lu.setName(newName);
                changed = true;

                // Update nama di LayerMeta juga (berdasarkan slug)
                metaRepo.findBySlug(lu.getSlug()).ifPresent(meta -> {
                    meta.setName(newName);
                    metaRepo.save(meta);
                });
            }
        }
        if (req.status() != null) {
            String ns = "Published".equalsIgnoreCase(req.status()) ? STATUS_PUBLISHED : STATUS_DRAFT;
            if (!ns.equals(lu.getStatus())) {
                lu.setStatus(ns);
                changed = true;
            }
        }

        if (changed)
            repo.save(lu);
        return ResponseEntity.ok(lu);
    }

    /*
     * =========================
     * DELETE (CASCADE)
     * =========================
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','EDITOR')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        var opt = repo.findById(id);
        if (opt.isEmpty())
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(msg("Not found"));

        var lu = opt.get();
        String slug = lu.getSlug();

        // 1. Hapus tabel fitur di schema gis (jika ada)
        metaRepo.findBySlug(slug).ifPresent(meta -> {
            if (meta.getTableName() != null && !meta.getTableName().isBlank()) {
                String schemaName = meta.getSchemaName() != null ? meta.getSchemaName() : "gis";
                String tableName = safeIdent(meta.getTableName());
                try {
                    jdbc.execute("DROP TABLE IF EXISTS " + schemaName + "." + tableName + " CASCADE");
                } catch (Exception e) {
                    // log but continue
                    System.err.println("Failed to drop feature table: " + e.getMessage());
                }
            }
        });

        // 2. Hapus dari tabel layer_styles (jika ada)
        styleRepo.findByLayerSlug(slug).ifPresent(styleRepo::delete);

        // 3. Hapus dari tabel layers (LayerMeta)
        metaRepo.findBySlug(slug).ifPresent(metaRepo::delete);

        // 4. Hapus file publik bila ada
        String pp = lu.getPublicPath();
        if (pp != null && pp.startsWith("/uploads/")) {
            Path p = Paths.get(publicDir, pp.substring("/uploads/".length()));
            try {
                Files.deleteIfExists(p);
            } catch (Exception ignore) {
            }
        }

        // 5. Hapus file RAW
        if (lu.getRawPath() != null) {
            try {
                Files.deleteIfExists(Paths.get(lu.getRawPath()));
            } catch (Exception ignore) {
            }
        }

        // 6. Hapus dari tabel layer_uploads (LayerUpload)
        repo.delete(lu);

        return ResponseEntity.noContent().build();
    }

    /*
     * =========================
     * METADATA XML PER LAYER
     * =========================
     */
    public record ParsedMetadata(
            String title,
            String description,
            String summary,
            String credits,
            double[] bbox,
            String usage,
            String limitation,
            String scaleDenominator,
            String spatialReferenceCode) {
    }

    @PostMapping(path = "/{slug}/metadata/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','EDITOR')")
    public ResponseEntity<?> uploadMetadataXml(@PathVariable String slug, @RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return bad("File is empty.");
        }
        String name = file.getOriginalFilename();
        if (name == null || !name.toLowerCase(Locale.ROOT).endsWith(".xml")) {
            return bad("Only .xml files are allowed.");
        }
        LayerMeta lm = metaRepo.findBySlug(slug).orElse(null);
        if (lm == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(msg("Layer not found."));
        }
        try {
            Path dir = Paths.get(metadataDir).toAbsolutePath();
            Files.createDirectories(dir);
            Path target = dir.resolve(slug + ".xml");
            try (var in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return ResponseEntity.ok().build();
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(msg("Failed to save metadata: " + e.getMessage()));
        }
    }

    @GetMapping(path = "/{slug}/metadata/xml", produces = MediaType.TEXT_XML_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','EDITOR')")
    public ResponseEntity<Resource> getMetadataXml(@PathVariable String slug) {
        LayerMeta lm = metaRepo.findBySlug(slug).orElse(null);
        if (lm == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        Path p = Paths.get(metadataDir).toAbsolutePath().resolve(slug + ".xml");
        if (!Files.exists(p) || !Files.isRegularFile(p)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        try {
            Resource res = new InputStreamResource(Files.newInputStream(p));
            return ResponseEntity.ok().contentType(MediaType.TEXT_XML).body(res);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping(path = "/{slug}/metadata/info", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','EDITOR','VIEWER')")
    public ResponseEntity<?> getMetadataInfo(@PathVariable String slug) {
        LayerMeta lm = metaRepo.findBySlug(slug).orElse(null);
        if (lm == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        Path p = Paths.get(metadataDir).toAbsolutePath().resolve(slug + ".xml");
        if (!Files.exists(p) || !Files.isRegularFile(p)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(msg("Metadata file not found"));
        }
        try (var in = Files.newInputStream(p)) {
            ParsedMetadata parsed = parseMetadataXml(in);
            return ResponseEntity.ok(parsed);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(msg("Failed to parse metadata: " + e.getMessage()));
        }
    }

    /*
     * =========================
     * Helpers
     * =========================
     */
    private static ResponseEntity<Map<String, String>> bad(String m) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(msg(m));
    }

    private static Map<String, String> msg(String m) {
        return Map.of("message", m);
    }

    private Long sizeOrNull(Path p) {
        try {
            return Files.size(p);
        } catch (IOException e) {
            return null;
        }
    }

    private String extOf(String filename) {
        String f = filename;
        int q = f.indexOf('?');
        if (q >= 0)
            f = f.substring(0, q);
        int h = f.indexOf('#');
        if (h >= 0)
            f = f.substring(0, h);
        int dot = f.lastIndexOf('.');
        return (dot >= 0 && dot < f.length() - 1) ? f.substring(dot).toLowerCase() : "";
    }

    private String inferType(String provided, String ext, String ct) {
        if (StringUtils.hasText(provided))
            return provided;
        if (".zip".equals(ext))
            return "Shapefile (.shp)";
        if (".geojson".equals(ext) || "application/geo+json".equalsIgnoreCase(ct))
            return "GeoJSON";
        if (".json".equals(ext))
            return "GeoJSON";
        if (".kml".equals(ext) || "application/vnd.google-earth.kml+xml".equalsIgnoreCase(ct))
            return "KML";
        return "Unknown";
    }

    private String clean(String s) {
        if (s == null)
            return "";
        return s.replaceAll("\\p{Cntrl}", "").replaceAll("\\s+", " ").trim();
    }

    private String slugify(String in) {
        if (in == null)
            return "layer";
        String s = in.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+|-+$)", "");
        return s.isBlank() ? "layer" : s;
    }

    private String uniqueSlug(String base) {
        String s = base;
        int i = 2;
        while (repo.existsBySlug(s)) {
            s = base + "-" + i;
            i++;
            if (i > 9999)
                break;
        }
        return s;
    }

    private String safeIdent(String ident) {
        return ident.replaceAll("[^A-Za-z0-9_]", "_");
    }

    private ParsedMetadata parseMetadataXml(java.io.InputStream input) throws Exception {
        DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
        dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        dbf.setNamespaceAware(true);
        DocumentBuilder db = dbf.newDocumentBuilder();
        Document doc = db.parse(input);
        XPath xp = XPathFactory.newInstance().newXPath();
        xp.setNamespaceContext(nsContext());

        String title = pickString(xp, doc,
                "//gmd:title//gco:CharacterString/text()",
                "//title/text()",
                "//dataIdInfo/idCitation/resTitle/text()");
        String desc = pickString(xp, doc,
                "//gmd:abstract//gco:CharacterString/text()",
                "//abstract/text()",
                "//description/text()",
                "//dataIdInfo/idAbs/text()");
        String summary = pickString(xp, doc,
                "//gmd:purpose//gco:CharacterString/text()",
                "//purpose/text()",
                "//dataIdInfo/idPurp/text()");
        String credits = pickString(xp, doc,
                "//gmd:credit//gco:CharacterString/text()",
                "//credit/text()",
                "//dataIdInfo/idCredit/text()");
        String usage = pickString(xp, doc,
                "//gmd:resourceSpecificUsage//gmd:usage//gco:CharacterString/text()",
                "//usage/text()",
                "//dataIdInfo/resConst/Consts/useLimit/text()");
        String limitation = pickString(xp, doc,
                "//gmd:MD_Constraints/gmd:useLimitation//gco:CharacterString/text()",
                "//useLimitation/text()",
                "//idinfo/useconst/text()");
        String scale = pickString(xp, doc,
                "//gmd:equivalentScale//gmd:denominator//gco:Integer/text()",
                "//denominator/text()");
        String sref = pickString(xp, doc,
                "//gmd:RS_Identifier/gmd:code//gco:CharacterString/text()",
                "//gmd:referenceSystemIdentifier//gmd:code//gco:CharacterString/text()",
                "//referenceSystemIdentifier//code//text()",
                "//refSysInfo//refSysID//identCode/@code");

        Double west = pickDouble(xp, doc,
                "//gmd:westBoundLongitude//gco:Decimal/text()",
                "//westBoundLongitude/text()");
        Double east = pickDouble(xp, doc,
                "//gmd:eastBoundLongitude//gco:Decimal/text()",
                "//eastBoundLongitude/text()");
        Double south = pickDouble(xp, doc,
                "//gmd:southBoundLatitude//gco:Decimal/text()",
                "//southBoundLatitude/text()");
        Double north = pickDouble(xp, doc,
                "//gmd:northBoundLatitude//gco:Decimal/text()",
                "//northBoundLatitude/text()");

        double[] bbox = null;
        if (west != null && east != null && south != null && north != null) {
            bbox = new double[] { west, south, east, north };
        }

        return new ParsedMetadata(
                emptyToNull(title),
                emptyToNull(desc),
                emptyToNull(summary),
                emptyToNull(credits),
                bbox,
                emptyToNull(usage),
                emptyToNull(limitation),
                emptyToNull(scale),
                emptyToNull(sref));
    }

    private String pickString(XPath xp, Document doc, String... paths) throws Exception {
        for (String p : paths) {
            String v = (String) xp.evaluate(p, doc, XPathConstants.STRING);
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }

    private Double pickDouble(XPath xp, Document doc, String... paths) throws Exception {
        for (String p : paths) {
            String v = (String) xp.evaluate(p, doc, XPathConstants.STRING);
            if (v != null && !v.isBlank()) {
                try {
                    return Double.parseDouble(v.trim());
                } catch (NumberFormatException ignore) {
                }
            }
        }
        return null;
    }

    private String emptyToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private NamespaceContext nsContext() {
        return new NamespaceContext() {
            @Override
            public String getNamespaceURI(String prefix) {
                return switch (prefix) {
                    case "gmd" -> "http://www.isotc211.org/2005/gmd";
                    case "gco" -> "http://www.isotc211.org/2005/gco";
                    default -> XMLConstants.NULL_NS_URI;
                };
            }

            @Override
            public String getPrefix(String namespaceURI) {
                return null;
            }

            @Override
            public Iterator<String> getPrefixes(String namespaceURI) {
                return null;
            }
        };
    }
}
