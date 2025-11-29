// src/main/java/com/spatiallens/Server/repository/LayerStyleRepository.java
package com.spatiallens.Server.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.spatiallens.Server.model.LayerStyle;

public interface LayerStyleRepository extends JpaRepository<LayerStyle, Long> {
    Optional<LayerStyle> findByLayerSlug(String layerSlug);

    boolean existsByLayerSlug(String layerSlug);
}
