package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.ml.AnnulationRequest;
import com.pfe.gestioncliniquebackend.dto.ml.AnnulationResponse;
import com.pfe.gestioncliniquebackend.dto.ml.AnomalieRequest;
import com.pfe.gestioncliniquebackend.dto.ml.AnomalieResponse;
import com.pfe.gestioncliniquebackend.dto.ml.PrevisionResponse;
import com.pfe.gestioncliniquebackend.dto.ml.RecommandationRequest;
import com.pfe.gestioncliniquebackend.dto.ml.RecommandationResponse;
import com.pfe.gestioncliniquebackend.dto.ml.SegmentationRequest;
import com.pfe.gestioncliniquebackend.dto.ml.SegmentationResponse;
import com.pfe.gestioncliniquebackend.dto.ml.UrgenceRequest;
import com.pfe.gestioncliniquebackend.dto.ml.UrgenceResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MlService {

    private final RestTemplate restTemplate;

    @Value("${ml.service.url:http://localhost:8000}")
    private String mlBaseUrl;

    private <T> T callPost(String path, Map<String, Object> body, Class<T> responseType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<T> response = restTemplate.exchange(
                mlBaseUrl + path, HttpMethod.POST, entity, responseType);
        return response.getBody();
    }

    private <T> T callGet(String path, org.springframework.core.ParameterizedTypeReference<T> typeRef) {
        org.springframework.http.ResponseEntity<T> resp = restTemplate.exchange(
                mlBaseUrl + path, org.springframework.http.HttpMethod.GET, null, typeRef);
        return resp.getBody();
    }

    public AnnulationResponse predictAnnulation(AnnulationRequest req) {
        Map<String, Object> body = new HashMap<>();
        body.put("jour_semaine", req.getJourSemaine());
        body.put("mois", req.getMois());
        body.put("heure_debut_h", req.getHeureDebutH());
        body.put("age", req.getAge());
        body.put("nb_rdv_total", req.getNbRdvTotal());
        body.put("nb_annulations_passees", req.getNbAnnulationsPassees());
        body.put("taux_annulation_historique", req.getTauxAnnulationHistorique());
        body.put("sexe", req.getSexe());
        body.put("gouvernorat", req.getGouvernorat());
        body.put("methode_contact_preferee", req.getMethodeContactPreferee());
        body.put("specialite_nom", req.getSpecialiteNom());
        body.put("experience_annees", req.getExperienceAnnees());
        body.put("prix_vs_moyenne", req.getPrixVsMoyenne());
        body.put("taux_annulation_motif", req.getTauxAnnulationMotif());
        return callPost("/predict/annulation", body, AnnulationResponse.class);
    }

    public UrgenceResponse predictUrgence(UrgenceRequest req) {
        Map<String, Object> body = new HashMap<>();
        body.put("symptomes", req.getSymptomes());
        return callPost("/predict/urgence", body, UrgenceResponse.class);
    }

    public AnomalieResponse predictAnomalie(AnomalieRequest req) {
        Map<String, Object> body = new HashMap<>();
        body.put("nb_medicaments", req.getNbMedicaments());
        body.put("nb_medicaments_uniques", req.getNbMedicamentsUniques());
        body.put("duree_max_jours", req.getDureeMaxJours());
        body.put("posologie_code", req.getPosologieCode());
        body.put("experience_annees", req.getExperienceAnnees());
        body.put("medecin_junior", req.getMedecinJunior());
        body.put("a_doublons", req.getADoublons());
        body.put("nb_ord_medecin_total", req.getNbOrdMedecinTotal());
        body.put("amoxicilline_1g", req.getAmoxicilline1g());
        body.put("cetirizine_10mg", req.getCetirizine10mg());
        body.put("doliprane", req.getDoliprane());
        body.put("ibuprofene_400mg", req.getIbuprofene400mg());
        body.put("omeprazole_20mg", req.getOmeprazole20mg());
        body.put("paracetamol_500mg", req.getParacetamol500mg());
        body.put("spasfon", req.getSpasfon());
        body.put("vitamine_d", req.getVitamineD());
        return callPost("/predict/anomalie", body, AnomalieResponse.class);
    }

    public RecommandationResponse predictRecommandation(RecommandationRequest req) {
        Map<String, Object> body = new HashMap<>();
        body.put("patient_id", req.getPatientId() != null ? req.getPatientId() : 0);
        body.put("specialite", req.getSpecialite() != null ? req.getSpecialite() : "");
        body.put("top_n", req.getTopN());
        return callPost("/predict/recommandation", body, RecommandationResponse.class);
    }

    public PrevisionResponse predictPrevisionCharge(String dateDebut, int nbJours) {
        String url = "/predict/prevision-charge?nb_jours=" + nbJours;
        if (dateDebut != null && !dateDebut.isBlank()) {
            url += "&date_debut=" + dateDebut;
        }
        return callGet(url, new org.springframework.core.ParameterizedTypeReference<PrevisionResponse>() {});
    }

    public SegmentationResponse predictSegmentation(SegmentationRequest req) {
        Map<String, Object> body = new HashMap<>();
        body.put("age", req.getAge());
        body.put("sexe_enc", req.getSexeEnc());
        body.put("situation_matrimoniale_enc", req.getSituationMatrimonialeEnc());
        body.put("methode_contact_preferee_enc", req.getMethodeContactPrefereeEnc());
        body.put("nb_rdv_total", req.getNbRdvTotal());
        body.put("taux_annulation", req.getTauxAnnulation());
        body.put("taux_completion", req.getTauxCompletion());
        body.put("nb_consultations", req.getNbConsultations());
        body.put("nb_ordonnances", req.getNbOrdonnances());
        body.put("nb_specialites_distinctes", req.getNbSpecialitesDistinctes());
        body.put("prix_moy_consultation", req.getPrixMoyConsultation());
        return callPost("/predict/segmentation", body, SegmentationResponse.class);
    }
}
