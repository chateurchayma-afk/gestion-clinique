package com.pfe.gestioncliniquebackend.config;

import com.pfe.gestioncliniquebackend.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        // Public : auth + catalogue médecins + spécialités (inscription)
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/medecins/catalogue/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/specialites/**").permitAll()
                        // Espace patient (JWT requis)
                        .requestMatchers("/api/patient/**").authenticated()
                        // Espace médecin connecté (JWT requis) — mon-planning filtré par JWT
                        .requestMatchers("/api/medecin/**").authenticated()
                        // RDV : toujours authentifié (évite l'accès public à /planning sans filtre)
                        .requestMatchers("/api/rendez-vous/**").authenticated()
                        // Admin & gestion
                        .requestMatchers("/api/medecins/**").authenticated()
                        .requestMatchers("/api/specialites/**").authenticated()
                        .requestMatchers("/api/utilisateurs/**").authenticated()
                        .requestMatchers("/api/notifications/**").authenticated()
                        .requestMatchers("/api/ordonnances/**").authenticated()
                        .requestMatchers("/api/chatbot/**").authenticated()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}