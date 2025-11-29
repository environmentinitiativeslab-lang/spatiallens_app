package com.spatiallens.Server.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.spatiallens.Server.model.User;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    long count();
}