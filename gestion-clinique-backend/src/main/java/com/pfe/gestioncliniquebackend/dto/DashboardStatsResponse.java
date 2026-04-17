package com.pfe.gestioncliniquebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {
    private long totalUtilisateurs;
    private List<RoleStatDto> repartitionRoles;
    private long medecinsEnAttente;
    private long medecinsValides;
    private long medecinsRefuses;
}
