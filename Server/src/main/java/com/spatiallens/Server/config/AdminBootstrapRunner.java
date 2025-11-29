package com.spatiallens.Server.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.spatiallens.Server.model.Role;
import com.spatiallens.Server.model.User;
import com.spatiallens.Server.repository.UserRepository;

/**
 * Bootstrap admin sekali jalan via env/properties.
 * Aktifkan dengan: app.bootstrap-admin=true dan set app.admin.email +
 * app.admin.password
 */
@Component
public class AdminBootstrapRunner implements CommandLineRunner {

    @Value("${app.bootstrap-admin:false}")
    private boolean enabled;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public AdminBootstrapRunner(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Override
    public void run(String... args) {
        if (!enabled)
            return;
        if (users.count() > 0)
            return;
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            System.err.println("[BootstrapAdmin] email/password belum di-set, lewati.");
            return;
        }
        User u = User.builder()
                .fullName("Administrator")
                .email(adminEmail.toLowerCase())
                .passwordHash(encoder.encode(adminPassword))
                .role(Role.ADMIN)
                .active(true)
                .build();
        users.save(u);
        System.out.println("[BootstrapAdmin] Admin dibuat: " + adminEmail);
    }
}
