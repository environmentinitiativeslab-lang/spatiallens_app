// src/main/java/com/spatiallens/Server/repository/LayerUploadRepository.java
package com.spatiallens.Server.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.spatiallens.Server.model.LayerUpload;

public interface LayerUploadRepository extends JpaRepository<LayerUpload, Long> {
    boolean existsBySlug(String slug);

    Optional<LayerUpload> findBySlug(String slug);

    List<LayerUpload> findAllByOrderByIdDesc();
}
