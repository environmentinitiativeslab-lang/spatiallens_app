package com.spatiallens.Server.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.spatiallens.Server.model.Role;
import com.spatiallens.Server.model.User;
import com.spatiallens.Server.repository.UserRepository;
import com.spatiallens.Server.security.JwtService;

import io.jsonwebtoken.Claims;
import lombok.Data;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    @PostMapping(path = "/register", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> register(@RequestBody RegisterRequest req,
            @RequestHeader(name = "Authorization", required = false) String authHeader) {

        if (req.getFullName() == null || req.getFullName().isBlank()
                || req.getEmail() == null || req.getEmail().isBlank()
                || req.getPassword() == null || req.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(new ApiError("fullName, email, and password are required"));
        }

        String email = req.getEmail().toLowerCase();
        if (users.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError("Email already in use"));
        }

        Role finalRole = Role.VIEWER;

        if (users.count() == 0) {
            finalRole = Role.ADMIN;
        } else {
            Role requested = req.getRole();
            if (requested != null && isAdminToken(authHeader)) {
                finalRole = requested;
            }
        }

        User u = users.save(User.builder()
                .fullName(req.getFullName().trim())
                .email(email)
                .passwordHash(encoder.encode(req.getPassword()))
                .role(finalRole)
                .active(true)
                .build());

        String token = jwt.generateToken(u.getId(), u.getEmail(), u.getRole());
        return ResponseEntity.ok(new AuthResponse(token, u));
    }

    @PostMapping(path = "/login", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        if (req.getEmail() == null || req.getPassword() == null) {
            return ResponseEntity.badRequest().body(new ApiError("email and password are required"));
        }
        String email = req.getEmail().toLowerCase();
        User u = users.findByEmail(email).orElse(null);
        if (u == null || !Boolean.TRUE.equals(u.getActive())
                || !encoder.matches(req.getPassword(), u.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("Invalid credentials"));
        }
        String token = jwt.generateToken(u.getId(), u.getEmail(), u.getRole());
        return ResponseEntity.ok(new AuthResponse(token, u));
    }

    @GetMapping(path = "/me", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> me() {
        return ResponseEntity.ok(new ApiMessage("OK"));
    }

    private boolean isAdminToken(String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer "))
                return false;
            String token = authHeader.substring(7);
            Claims c = jwt.parse(token);
            Object roleObj = c.get("role");
            return roleObj != null && "ADMIN".equals(String.valueOf(roleObj));
        } catch (Exception e) {
            return false;
        }
    }

    // DTO & responses
    @Data
    public static class RegisterRequest {
        private String fullName;
        private String email;
        private String password;
        private Role role;
    }

    @Data
    public static class LoginRequest {
        private String email;
        private String password;
    }

    @Data
    public static class ApiError {
        private final String message;
    }

    @Data
    public static class ApiMessage {
        private final String message;
    }

    public record AuthResponse(String token, Long id, String fullName, String email, String role) {
        public AuthResponse(String token, User u) {
            this(token, u.getId(), u.getFullName(), u.getEmail(), u.getRole().name());
        }
    }
}
