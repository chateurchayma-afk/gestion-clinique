package com.pfe.gestioncliniquebackend.dto;

import lombok.Data;

@Data
public class LoginRequest {

    private String email;
    private String motDePasse;
}