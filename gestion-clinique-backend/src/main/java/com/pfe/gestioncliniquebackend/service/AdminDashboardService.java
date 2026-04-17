package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.DashboardStatsResponse;
import com.pfe.gestioncliniquebackend.dto.RoleStatDto;
import com.pfe.gestioncliniquebackend.enums.Role;
import com.pfe.gestioncliniquebackend.enums.StatutValidationMedecin;
import com.pfe.gestioncliniquebackend.repository.MedecinRepository;
import com.pfe.gestioncliniquebackend.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final UtilisateurRepository utilisateurRepository;
    private final MedecinRepository medecinRepository;

    public DashboardStatsResponse getDashboardStats() {
        long total = utilisateurRepository.count();
        double base = total > 0 ? total : 1.0;

        List<RoleStatDto> repartition = new ArrayList<>();
        for (Role role : Role.values()) {
            long c = utilisateurRepository.countByRole(role);
            double pct = Math.round((c * 1000.0 / base)) / 10.0;
            repartition.add(RoleStatDto.builder()
                    .role(role.name())
                    .count(c)
                    .pourcentage(pct)
                    .build());
        }

        return DashboardStatsResponse.builder()
                .totalUtilisateurs(total)
                .repartitionRoles(repartition)
                .medecinsEnAttente(medecinRepository.countPendingOrNull(StatutValidationMedecin.EN_ATTENTE))
                .medecinsValides(medecinRepository.countByStatutValidation(StatutValidationMedecin.VALIDE))
                .medecinsRefuses(medecinRepository.countByStatutValidation(StatutValidationMedecin.REFUSE))
                .build();
    }
}
