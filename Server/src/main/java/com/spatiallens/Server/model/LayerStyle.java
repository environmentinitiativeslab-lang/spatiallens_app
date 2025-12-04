// src/main/java/com/spatiallens/Server/model/LayerStyle.java
package com.spatiallens.Server.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "layer_styles", indexes = @Index(name = "idx_layer_styles_slug", columnList = "layer_slug", unique = true))
public class LayerStyle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Mengacu ke LayerMeta.slug */
    @Column(name = "layer_slug", nullable = false, unique = true)
    private String layerSlug;

    /** JSON style (Mapbox GL style) */
    @Column(name = "style_json", nullable = false, columnDefinition = "text")
    private String styleJson;

    /** Optional: lokasi file SLD yang diunggah admin (absolute path) */
    @Column(name = "sld_path", columnDefinition = "text")
    private String sldPath;

    /** Optional: nama file SLD asli (untuk referensi) */
    @Column(name = "sld_filename")
    private String sldFilename;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    public void touch() {
        updatedAt = Instant.now();
    }
}
