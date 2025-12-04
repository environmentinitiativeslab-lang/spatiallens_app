package com.spatiallens.Server.security;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.spatiallens.Server.model.User;
import com.spatiallens.Server.repository.UserRepository;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwt;
    private final UserRepository users;

    public JwtAuthenticationFilter(JwtService jwt, UserRepository users) {
        this.jwt = jwt;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                    FilterChain chain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // 🔥 1️⃣ Lewati filter untuk endpoint auth
        if (path.startsWith("/api/auth/")) {
            chain.doFilter(request, response);
            return;
        }

        // 🔥 2️⃣ Ambil token dari header Authorization
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header != null && header.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {

            String token = header.substring(7); // Remove "Bearer "

            try {
                Claims claims = jwt.parse(token);  // Parse JWT

                Long userId = Long.valueOf(claims.getSubject());
                String tokenEmail = (String) claims.get("email");

                User user = users.findById(userId).orElse(null);

                if (user != null && Boolean.TRUE.equals(user.getActive())) {

                    // Validasi email dalam token dan DB
                    if (tokenEmail != null && !tokenEmail.equalsIgnoreCase(user.getEmail())) {
                        throw new SecurityException("Token/email mismatch");
                    }

                    // Set authentication ke Spring Security context
                    var auth = new UsernamePasswordAuthenticationToken(
                        user,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
                    );

                    SecurityContextHolder.getContext().setAuthentication(auth);
                }

            } catch (Exception ex) {
                // Jika token invalid, lanjut tanpa authentication
            }
        }

        // 🔥 3️⃣ Lanjutkan filter
        chain.doFilter(request, response);
    }
}
