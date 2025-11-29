package com.spatiallens.Server.controller;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.spatiallens.Server.model.Role;
import com.spatiallens.Server.model.User;
import com.spatiallens.Server.repository.UserRepository;

import lombok.Data;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public AdminUserController(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    // READ (ADMIN only)
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserView> list() {
        return users.findAll().stream().map(UserView::of).toList();
    }

    // CREATE (ADMIN only)
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public UserView create(@RequestBody CreateUserRequest req) {
        User u = User.builder()
                .fullName(req.getFullName())
                .email(req.getEmail().toLowerCase())
                .passwordHash(encoder.encode(req.getPassword()))
                .role(req.getRole() == null ? Role.EDITOR : req.getRole())
                .active(true)
                .build();
        u = users.save(u);
        return UserView.of(u);
    }

    // CHANGE ROLE (ADMIN only)
    @PutMapping(path = "/{id}/role", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public void changeRole(@PathVariable Long id, @RequestBody ChangeRoleRequest req) {
        User u = users.findById(id).orElseThrow();
        u.setRole(req.getRole());
        users.save(u);
    }

    // CHANGE STATUS (ADMIN only)
    @PutMapping(path = "/{id}/status", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public void changeStatus(@PathVariable Long id, @RequestBody ChangeStatusRequest req) {
        User u = users.findById(id).orElseThrow();
        u.setActive(req.getActive());
        users.save(u);
    }

    // ---- DTOs ----
    @Data
    public static class CreateUserRequest {
        private String fullName;
        private String email;
        private String password;
        private Role role;
    }

    @Data
    public static class ChangeRoleRequest {
        private Role role;
    }

    @Data
    public static class ChangeStatusRequest {
        private Boolean active;
    }

    public record UserView(Long id, String fullName, String email, String role, Boolean active) {
        static UserView of(User u) {
            return new UserView(u.getId(), u.getFullName(), u.getEmail(), u.getRole().name(), u.getActive());
        }
    }
}
