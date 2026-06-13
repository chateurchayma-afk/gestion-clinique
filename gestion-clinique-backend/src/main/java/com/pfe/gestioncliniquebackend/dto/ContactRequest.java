package com.pfe.gestioncliniquebackend.dto;

import lombok.Data;

@Data
public class ContactRequest {
    private String nom;
    private String email;
    private String sujet;
    private String message;
}
