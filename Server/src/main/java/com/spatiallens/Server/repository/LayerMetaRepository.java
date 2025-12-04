// src/main/java/com/spatiallens/Server/repository/LayerMetaRepository.java
package com.spatiallens.Server.repository;

import java.util.Optional;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.spatiallens.Server.model.LayerMeta;

public interface LayerMetaRepository extends JpaRepository<LayerMeta, Long> {
    Optional<LayerMeta> findBySlug(String slug);

    @Query("select distinct coalesce(m.category,'Uncategorized') from LayerMeta m")
    List<String> distinctCategories();
}
