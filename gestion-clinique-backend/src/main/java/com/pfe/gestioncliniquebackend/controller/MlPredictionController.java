package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.ml.*;
import com.pfe.gestioncliniquebackend.service.MlService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ml")
@RequiredArgsConstructor
public class MlPredictionController {

    private final MlService mlService;

    /** ML-01 — Médecin : risque d'annulation d'un RDV */
    @PostMapping("/annulation")
    public ResponseEntity<AnnulationResponse> annulation(@RequestBody AnnulationRequest req) {
        return ResponseEntity.ok(mlService.predictAnnulation(req));
    }

    /** ML-03 — Médecin : niveau d'urgence des symptômes */
    @PostMapping("/urgence")
    public ResponseEntity<UrgenceResponse> urgence(@RequestBody UrgenceRequest req) {
        return ResponseEntity.ok(mlService.predictUrgence(req));
    }

    /** ML-05 — Médecin : anomalie dans une ordonnance */
    @PostMapping("/anomalie")
    public ResponseEntity<AnomalieResponse> anomalie(@RequestBody AnomalieRequest req) {
        return ResponseEntity.ok(mlService.predictAnomalie(req));
    }

    /** ML-02 — Patient : recommandation de médecins */
    @PostMapping("/recommandation")
    public ResponseEntity<RecommandationResponse> recommandation(@RequestBody RecommandationRequest req) {
        return ResponseEntity.ok(mlService.predictRecommandation(req));
    }

    /** ML-04 — Admin : prévision de charge sur une période choisie */
    @GetMapping("/prevision-charge")
    public ResponseEntity<PrevisionResponse> previsionCharge(
            @org.springframework.web.bind.annotation.RequestParam(required = false, defaultValue = "") String dateDebut,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "30") int nbJours) {
        return ResponseEntity.ok(mlService.predictPrevisionCharge(dateDebut, nbJours));
    }

    /** ML-06 — Admin : segmentation comportementale d'un patient */
    @PostMapping("/segmentation")
    public ResponseEntity<SegmentationResponse> segmentation(@RequestBody SegmentationRequest req) {
        return ResponseEntity.ok(mlService.predictSegmentation(req));
    }
}
