// src/main/java/com/spatiallens/Server/model/LayerMeta.java
package com.spatiallens.Server.model;

import java.time.OffsetDateTime;

import org.locationtech.jts.geom.Polygon;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
@Table(name = "layers")
public class LayerMeta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Display name (metadata) */
    @Column(nullable = false)
    private String name;

    /** Unique key for routing /tiles/{layerKey}/... */
    @Column(nullable = false, unique = true)
    private String slug;

    /** Schema for feature table (default: gis) */
    @Column(name = "schema_name", nullable = false)
    private String schemaName;

    /** Feature table name inside schema_name */
    @Column(name = "table_name")
    private String tableName;

    /** Geometry column name (default: geom) */
    @Column(name = "geom_column", nullable = false)
    private String geomColumn;

    /** SRID for geom (default: 4326) */
    @Column
    private Integer srid;

    /** Number of features imported */
    @Column(name = "feature_count")
    private Long featureCount;

    /** Layer bounding box in EPSG:4326 */
    @Column(columnDefinition = "geometry(Polygon,4326)")
    private Polygon bbox;

    /** Draft | Published */
    @Column(nullable = false)
    private String status;

    /** Visibility legacy (always PUBLIC for current flow) */
    @Column(nullable = false)
    private String visibility;

    /** Source type (Shapefile/GeoJSON/etc.) */
    @Column
    private String type;

    /** Min/Max zoom hints for tiles */
    @Column
    private Integer minzoom;

    @Column
    private Integer maxzoom;

    /** Comma-separated or JSON whitelist of props for MVT */
    @Column(name = "props_whitelist", columnDefinition = "text")
    private String propsWhitelist;

    /** Raw archive path (for housekeeping) */
    @Column(name = "raw_path")
    private String rawPath;

    /** Legacy public path (optional) */
    @Column(name = "public_path")
    private String publicPath;

    /** Timestamps (managed in DB by triggers, readable here) */
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
