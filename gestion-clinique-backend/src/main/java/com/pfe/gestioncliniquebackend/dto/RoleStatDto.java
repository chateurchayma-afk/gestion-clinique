package com.pfe.gestioncliniquebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleStatDto {
    private String role;
    private long count;
    /** Part du total utilisateurs (0–100), arrondie */
    private double pourcentage;
}
