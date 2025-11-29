// src/main/java/com/spatiallens/Server/model/LayerUpload.java
package com.spatiallens.Server.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "layer_uploads", indexes = {
        @Index(name = "ix_layer_uploads_slug", columnList = "slug", unique = true)
})
public class LayerUpload {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nama tampilan */
    @Column(nullable = false)
    private String name;

    /** "Shapefile (.shp)" | "GeoJSON" | "KML" | "Unknown" */
    @Column(nullable = false, length = 64)
    private String type;

    /** "Draft" | "Published" */
    @Column(nullable = false, length = 16)
    private String status;

    /** ISO tanggal ringkas (yyyy-MM-dd) untuk tampilan cepat */
    @Column(nullable = false, length = 10)
    private String date;

    /** Kunci unik untuk routing & file publik */
    @Column(nullable = false, length = 128, unique = true)
    private String slug;

    /** URL publik hasil simpan (di public-dir) */
    @Column(name = "public_path", length = 512)
    private String publicPath;

    /** Ukuran file publik (byte) */
    @Column(name = "size_bytes")
    private Long sizeBytes;

    /** Jumlah fitur (opsional, jika dihitung pipeline lain) */
    @Column(name = "feature_count")
    private Integer featureCount;

    /** Timestamp pembuatan (untuk sort) */
    @Column(name = "created_at", nullable = false)
    private java.time.LocalDateTime createdAt;

    /** Lokasi arsip mentah (private/raw) — tidak diexpose */
    @JsonIgnore
    @Column(name = "raw_path")
    private String rawPath;

    @PrePersist
    public void prePersist() {
        if (createdAt == null)
            createdAt = java.time.LocalDateTime.now();
        if (status == null)
            status = "Draft";
        if (type == null)
            type = "Unknown";
    }
}
