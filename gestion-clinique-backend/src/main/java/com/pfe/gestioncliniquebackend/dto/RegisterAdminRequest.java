package com.pfe.gestioncliniquebackend.dto;

import lombok.Data;

/**
 * Corps minimal pour {@code POST /api/auth/register-admin} (évite tout conflit avec les champs patient/médecin).
 */
@Data
public class RegisterAdminRequest {
    private String nom;
    private String prenom;
    private String email;
    private String motDePasse;
    private String telephone;
}
