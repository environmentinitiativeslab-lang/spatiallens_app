// src/main/java/com/spatiallens/Server/repository/LayerMetaRepository.java
package com.spatiallens.Server.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.spatiallens.Server.model.LayerMeta;

public interface LayerMetaRepository extends JpaRepository<LayerMeta, Long> {
    Optional<LayerMeta> findBySlug(String slug);
}
