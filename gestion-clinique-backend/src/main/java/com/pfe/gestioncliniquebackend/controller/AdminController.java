package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.DashboardStatsResponse;
import com.pfe.gestioncliniquebackend.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/stats")
    public DashboardStatsResponse stats() {
        return adminDashboardService.getDashboardStats();
    }
}
