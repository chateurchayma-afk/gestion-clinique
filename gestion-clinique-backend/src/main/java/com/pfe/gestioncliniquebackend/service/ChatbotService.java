package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.chatbot.MessageDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class ChatbotService {

    @Value("${gemini.api.key.primary:}")
    private String primaryApiKey;

    @Value("${gemini.api.key.secondary:}")
    private String secondaryApiKey;

    @Value("${gemini.api.key.tertiary:}")
    private String tertiaryApiKey;

    private static final String GEMINI_BASE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";
    private static final int MAX_TOKENS = 1024;

    private static final String SYSTEM_PROMPT = """
            Tu es MediBot, un assistant médical IA intégré à MediChat, une application de gestion de clinique médicale.

            DOMAINE EXCLUSIF — RÈGLE ABSOLUE :
            Tu réponds UNIQUEMENT aux questions liées à la santé et à la médecine.
            Sujets autorisés :
            • Maladies, symptômes, pathologies et leur évolution
            • Traitements, médicaments, thérapies et effets secondaires
            • Prévention, hygiène de vie et nutrition liée à la santé
            • Spécialités médicales et orientation vers le bon médecin
            • Prise de rendez-vous et fonctionnement d'une clinique ou d'un cabinet médical
            • Urgences médicales et conduite à tenir / premiers secours
            • Bien-être physique et mental en lien direct avec la santé

            REFUS OBLIGATOIRE — sujets interdits :
            Si la question porte sur un sujet NON MÉDICAL (programmation, informatique, sport général,
            politique, finance, voyage, jeux vidéo, cuisine non thérapeutique, actualités, mathématiques,
            science hors santé, musique, cinéma, etc.), réponds EXACTEMENT et UNIQUEMENT :
            "Je suis MediBot, un assistant médical spécialisé dans le domaine de la santé. Je ne peux répondre qu'aux questions médicales ou liées au bien-être et aux soins de santé. Pour votre question, veuillez consulter une autre source."

            Spécialités disponibles dans notre clinique :
            Cardiologie, Dermatologie, Ophtalmologie, Neurologie, Pneumologie,
            Gastro-entérologie, Orthopédie, Gynécologie, Pédiatrie, Médecine générale,
            Endocrinologie, Rhumatologie, ORL, Urologie, Psychiatrie, Diabétologie.

            Règles impératives :
            - Réponds TOUJOURS en français.
            - Sois empathique, rassurant et professionnel.
            - Tes réponses doivent être concises (4 à 6 lignes maximum).
            - Ne pose JAMAIS de diagnostic définitif — tu fournis des informations générales.
            - Rappelle que tu ne remplaces pas un médecin et que toute décision médicale nécessite une consultation.
            - Si le patient pose une NOUVELLE question médicale, traite-la IMMÉDIATEMENT
              sans tenir compte du sujet précédent. Ne reste jamais bloqué sur une ancienne spécialité.
            - Pour les urgences vitales (douleur thoracique intense, difficultés respiratoires sévères,
              perte de conscience, saignement abondant, signes d'AVC), recommande IMMÉDIATEMENT
              d'appeler le 15 (SAMU) ou de se rendre aux urgences.
            - Après avoir recommandé une spécialité, propose de consulter les médecins disponibles dans la clinique.
            """;

    private final RestTemplate restTemplate = new RestTemplate();

    // ══════════════════════════════════════════════════════════════════════
    // Point d'entrée — cascade : Gemini primaire → Gemini secondaire → fallback
    // ══════════════════════════════════════════════════════════════════════

    public String generateResponse(String userMessage, List<MessageDto> history) {

        if (isConfigured(primaryApiKey)) {
            try {
                String response = callGemini(primaryApiKey, userMessage, history);
                if (response != null) {
                    log.debug("Gemini primary key responded successfully");
                    return response;
                }
            } catch (Exception e) {
                log.warn("Gemini primary key failed: {} — trying secondary key", e.getMessage());
            }
        } else {
            log.warn("Gemini primary API key not configured");
        }

        if (isConfigured(secondaryApiKey)) {
            try {
                String response = callGemini(secondaryApiKey, userMessage, history);
                if (response != null) {
                    log.info("Gemini secondary key responded (primary unavailable)");
                    return response;
                }
            } catch (Exception e) {
                log.warn("Gemini secondary key failed: {} — trying tertiary key", e.getMessage());
            }
        } else {
            log.warn("Gemini secondary API key not configured");
        }

        if (isConfigured(tertiaryApiKey)) {
            try {
                String response = callGemini(tertiaryApiKey, userMessage, history);
                if (response != null) {
                    log.info("Gemini tertiary key responded (primary and secondary unavailable)");
                    return response;
                }
            } catch (Exception e) {
                log.warn("Gemini tertiary key failed: {} — activating rule-based fallback", e.getMessage());
            }
        } else {
            log.warn("Gemini tertiary API key not configured");
        }

        log.info("All Gemini keys unavailable — activating rule-based fallback");
        return fallback(userMessage, history);
    }

    private boolean isConfigured(String key) {
        return key != null && !key.isBlank();
    }

    // ══════════════════════════════════════════════════════════════════════
    // Appel API Gemini
    // ══════════════════════════════════════════════════════════════════════

    private String callGemini(String apiKey, String userMessage, List<MessageDto> history) {
        List<Map<String, Object>> contents = new ArrayList<>();

        if (history != null) {
            for (MessageDto msg : history) {
                // Gemini utilise "model" là où Anthropic utilisait "assistant"
                String role = "assistant".equals(msg.getRole()) ? "model" : "user";
                contents.add(Map.of(
                        "role", role,
                        "parts", List.of(Map.of("text", msg.getContent()))
                ));
            }
        }
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", userMessage))
        ));

        Map<String, Object> body = new HashMap<>();
        body.put("system_instruction", Map.of("parts", List.of(Map.of("text", SYSTEM_PROMPT))));
        body.put("contents", contents);
        body.put("generationConfig", Map.of("maxOutputTokens", MAX_TOKENS, "temperature", 0.7));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restTemplate.postForObject(
                GEMINI_BASE_URL + apiKey,
                new HttpEntity<>(body, headers),
                Map.class
        );

        if (response == null) return null;

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
        if (candidates == null || candidates.isEmpty()) return null;

        @SuppressWarnings("unchecked")
        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        if (content == null) return null;

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        if (parts == null || parts.isEmpty()) return null;

        return (String) parts.get(0).get("text");
    }

    // ══════════════════════════════════════════════════════════════════════
    // FALLBACK — ordre de priorité strict (PRÉSERVÉ INTÉGRALEMENT)
    // ══════════════════════════════════════════════════════════════════════

    private String fallback(String userMessage, List<MessageDto> history) {
        String msg = userMessage.toLowerCase().trim();

        // ── P1 : demande explicite de changement de sujet ─────────────────
        if (isTopicChangeRequest(msg)) {
            return "Bien sûr ! Quelle est votre nouvelle question médicale ?\n\n"
                    + "Décrivez vos symptômes ou posez votre question et je vous orienterai vers la bonne spécialité.";
        }

        // ── P2 : détection de nouveau sujet médical (PRIORITÉ ABSOLUE) ────
        //    Si le message contient un mot-clé médical, on traite la nouvelle
        //    question IMMÉDIATEMENT, sans regarder l'historique.
        String medicalReply = detectMedicalContent(msg);
        if (medicalReply != null) {
            return medicalReply;
        }

        // ── P3 : réponse de type "oui / je veux / rendez-vous" ────────────
        //    Seulement si aucun sujet médical n'a été détecté ci-dessus
        if (isAffirmative(msg) || wantsAppointment(msg)) {
            String specialty = lastSpecialtyInHistory(history);
            return buildAppointmentGuide(specialty);
        }

        // ── P4 : salutation ───────────────────────────────────────────────
        if (containsAny(msg, "bonjour", "salut", "bonsoir", "hello", "coucou")) {
            return "Bonjour ! Je suis **MediBot**, votre assistant médical.\n\n"
                    + "Je peux vous aider à :\n"
                    + "• Répondre à vos questions médicales générales\n"
                    + "• Vous orienter vers la bonne spécialité selon vos symptômes\n"
                    + "• Vous guider pour prendre rendez-vous\n\n"
                    + "Comment puis-je vous aider ?";
        }

        // ── P5 : remerciement / au revoir ─────────────────────────────────
        if (containsAny(msg, "merci", "au revoir", "bye", "à bientôt", "a bientot")) {
            return "De rien, prenez soin de vous ! 😊\n"
                    + "N'hésitez pas à revenir si vous avez d'autres questions médicales.";
        }

        // ── P6 : défaut ───────────────────────────────────────────────────
        return "Je suis votre assistant médical **MediBot**.\n\n"
                + "Décrivez vos symptômes ou posez-moi une question médicale et je vous orienterai "
                + "vers la bonne spécialité.\n\n"
                + "*Exemples : \"J'ai des douleurs à la poitrine\", \"Quels sont les symptômes du diabète ?\"*";
    }

    // ══════════════════════════════════════════════════════════════════════
    // Détection du contenu médical — retourne null si rien détecté
    // ══════════════════════════════════════════════════════════════════════

    private String detectMedicalContent(String msg) {

        // Cardiologie & hypertension
        if (containsAny(msg, "douleur poitrine", "douleur à la poitrine", "mal à la poitrine",
                "douleur au cœur", "douleur au coeur", "cardiaque", "palpitation",
                "infarctus", "angine de poitrine", "hypertension", "tension artérielle",
                "tension arterielle", "pression artérielle", "cœur qui bat", "arythmie")) {
            return "⚠️ Ces symptômes peuvent être liés au système cardiovasculaire et nécessitent une attention rapide.\n\n"
                    + "Je vous recommande une consultation en **Cardiologie**.\n\n"
                    + "L'hypertension artérielle est souvent asymptomatique, mais peut provoquer des maux de tête, "
                    + "des vertiges et de l'essoufflement. Un cardiologue pourra mesurer votre tension et adapter votre traitement.\n\n"
                    + "⚠️ Si la douleur est intense ou accompagnée d'essoufflement, **appelez le 15 immédiatement**.\n\n"
                    + "Souhaitez-vous voir la liste des cardiologues disponibles ?";
        }

        // Dermatologie
        if (containsAny(msg, "problème de peau", "probleme de peau", "peau", "bouton", "acné", "acne",
                "eczéma", "eczema", "psoriasis", "urticaire", "démangeaison", "demangeaison",
                "éruption cutanée", "eruption", "tache sur la peau", "rougeur", "dermatite",
                "allergie cutanée")) {
            return "Vos symptômes cutanés semblent relever de la **Dermatologie**.\n\n"
                    + "Les problèmes de peau peuvent avoir plusieurs causes : allergie, eczéma, infection ou irritation. "
                    + "Un dermatologue pourra établir un diagnostic précis et prescrire le traitement adapté.\n\n"
                    + "Souhaitez-vous voir la liste des dermatologues disponibles ?";
        }

        // Diabète
        if (containsAny(msg, "diabète", "diabete", "glycémie", "glycemie", "insuline",
                "hyperglycémie", "hypoglycemie", "soif excessive", "uriner souvent",
                "symptôme diabète", "symptomes diabete")) {
            return "Les principaux symptômes du **diabète** sont :\n\n"
                    + "• Soif excessive (polydipsie)\n"
                    + "• Envies fréquentes d'uriner (polyurie)\n"
                    + "• Fatigue importante\n"
                    + "• Perte de poids inexpliquée\n"
                    + "• Vision floue\n\n"
                    + "Je vous recommande une consultation en **Diabétologie** ou **Endocrinologie** "
                    + "pour un bilan complet.\n\n"
                    + "Souhaitez-vous voir la liste des endocrinologues disponibles ?";
        }

        // Endocrinologie / hormones (hors diabète)
        if (containsAny(msg, "thyroïde", "thyroide", "hormone", "endocrinologie",
                "hyperthyroïdie", "hypothyroïdie", "surrenale", "cortisol")) {
            return "Vos symptômes semblent relever de l'**Endocrinologie**.\n\n"
                    + "Un endocrinologue peut évaluer votre fonctionnement hormonal (thyroïde, surrénales, etc.) "
                    + "et vous proposer un traitement adapté.\n\n"
                    + "Souhaitez-vous voir la liste des endocrinologues disponibles ?";
        }

        // Ophtalmologie
        if (containsAny(msg, "yeux", "œil", "oeil", "vision", "voir flou", "vue baissée",
                "conjonctivite", "cataracte", "glaucome", "ophtalmologie", "lunettes",
                "mal aux yeux", "brûlure yeux")) {
            return "Pour vos problèmes oculaires, je vous recommande une consultation en **Ophtalmologie**.\n\n"
                    + "Un ophtalmologue pourra examiner vos yeux et vous prescrire le traitement approprié.\n\n"
                    + "Souhaitez-vous voir la liste des ophtalmologues disponibles ?";
        }

        // Neurologie
        if (containsAny(msg, "migraine", "céphalée", "cephalee", "mal de tête", "mal de tete",
                "vertige", "mémoire", "memoire", "tremblement", "paralysie",
                "avc", "épilepsie", "epilepsie", "sclérose", "neuropathie")) {
            return "Vos symptômes neurologiques semblent relever de la **Neurologie**.\n\n"
                    + "Un neurologue pourra évaluer votre état et proposer le traitement le plus adapté.\n\n"
                    + "Souhaitez-vous voir la liste des neurologues disponibles ?";
        }

        // Pneumologie
        if (containsAny(msg, "toux", "essoufflement", "souffle court", "poumon", "asthme",
                "bronchite", "pneumonie", "respiration difficile", "pneumologie",
                "crachat", "expectoration", "bpco")) {
            return "Vos symptômes respiratoires semblent relever de la **Pneumologie**.\n\n"
                    + "Un pneumologue pourra évaluer votre capacité respiratoire et adapter votre traitement.\n\n"
                    + "Souhaitez-vous voir la liste des pneumologues disponibles ?";
        }

        // Gastro-entérologie
        if (containsAny(msg, "ventre", "estomac", "digestion", "intestin", "nausée", "nausee",
                "vomissement", "diarrhée", "diarrhee", "constipation", "reflux",
                "gastrite", "ulcère", "ulcere", "colon", "foie", "brûlure estomac",
                "brulure estomac", "mal au ventre")) {
            return "Vos symptômes digestifs semblent relever de la **Gastro-entérologie**.\n\n"
                    + "Un gastro-entérologue pourra diagnostiquer précisément votre problème et vous soigner.\n\n"
                    + "Souhaitez-vous voir la liste des gastro-entérologues disponibles ?";
        }

        // Orthopédie / rhumatologie
        if (containsAny(msg, "dos", "colonne", "scoliose", "arthrose", "arthrite",
                "articulation", "genou", "hanche", "épaule", "epaule", "cheville",
                "poignet", "fracture", "entorse", "tendinite", "mal au dos",
                "lombalgie", "sciatique", "rhumatisme")) {
            boolean isRhuma = containsAny(msg, "arthrite", "arthrose", "rhumatisme", "polyarthrite");
            String spec = isRhuma ? "Rhumatologie" : "Orthopédie";
            return "Vos symptômes semblent relever de la **" + spec + "**.\n\n"
                    + "Un spécialiste pourra évaluer votre situation et vous proposer un traitement adapté.\n\n"
                    + "Souhaitez-vous voir la liste des spécialistes en " + spec + " disponibles ?";
        }

        // ORL
        if (containsAny(msg, "oreille", "nez", "gorge", "sinusite", "angine", "amygdale",
                "bourdonnement", "surdité", "orl", "otite", "rhinite", "pharyngite")) {
            return "Vos symptômes semblent relever de l'**ORL** (Oto-rhino-laryngologie).\n\n"
                    + "Un ORL pourra examiner vos oreilles, votre nez et votre gorge.\n\n"
                    + "Souhaitez-vous voir la liste des ORL disponibles ?";
        }

        // Fièvre / médecine générale
        if (containsAny(msg, "fièvre", "fievre", "grippe", "rhume", "infection",
                "température élevée", "temperature elevee", "frisson", "antibiotique",
                "médecine générale", "medecine generale")) {
            return "Pour ces symptômes, une consultation en **Médecine générale** est recommandée.\n\n"
                    + "💡 En attendant : hydratez-vous bien et reposez-vous.\n"
                    + "⚠️ Si la fièvre dépasse 39,5°C ou persiste plus de 3 jours, consultez rapidement.\n\n"
                    + "Souhaitez-vous prendre rendez-vous avec un médecin généraliste ?";
        }

        // Allergies générales
        if (containsAny(msg, "allergie", "allergies", "intolérance", "intolerance",
                "rhinite allergique", "hay fever", "pollen", "acarien", "allergie alimentaire")) {
            return "Les allergies peuvent être traitées selon leur nature :\n\n"
                    + "• **Allergies cutanées** → Dermatologie\n"
                    + "• **Rhinite, allergie respiratoire** → ORL ou Pneumologie\n"
                    + "• **Allergie alimentaire** → Médecine générale ou Gastro-entérologie\n\n"
                    + "Souhaitez-vous voir la liste des médecins disponibles ?";
        }

        // Symptômes vagues — demander précision
        if (containsAny(msg, "j'ai mal", "je souffre", "je ressens", "douleur", "symptôme",
                "symptome", "pas bien", "je me sens mal")) {
            return "Je comprends que vous ne vous sentez pas bien. Pour vous orienter au mieux, "
                    + "pourriez-vous me préciser :\n\n"
                    + "• **Où** avez-vous mal ? (poitrine, ventre, tête, dos…)\n"
                    + "• **Depuis quand** ressentez-vous ces symptômes ?\n"
                    + "• **Intensité** : légère, modérée ou sévère ?\n\n"
                    + "Ces informations m'aideront à vous orienter vers la bonne spécialité.";
        }

        return null; // aucun sujet médical détecté
    }

    // ══════════════════════════════════════════════════════════════════════
    // Helpers
    // ══════════════════════════════════════════════════════════════════════

    private boolean isTopicChangeRequest(String msg) {
        return containsAny(msg,
                "autre question", "autre sujet", "changer de sujet", "nouvelle question",
                "j'ai une autre", "je veux autre chose", "différent", "differente",
                "on change", "parlons d'autre chose", "autre chose", "rien d'autre");
    }

    private boolean isAffirmative(String msg) {
        return containsAny(msg, "oui", "yes", "d'accord", "bien sûr", "bien sur",
                "ok", "correct", "absolument", "pourquoi pas", "avec plaisir",
                "je veux bien", "volontiers", "effectivement", "tout à fait");
    }

    private boolean wantsAppointment(String msg) {
        return containsAny(msg, "rendez-vous", "rdv", "prendre rendez",
                "liste des médecins", "liste des medecins", "voir les médecins",
                "voir les medecins", "consulter", "spécialiste disponible",
                "specialiste disponible", "médecin disponible", "medecin disponible");
    }

    private String buildAppointmentGuide(String specialty) {
        String label = specialty != null ? specialty : "la spécialité recommandée";
        return "Voici comment prendre rendez-vous avec un spécialiste en **" + label + "** :\n\n"
                + "👉 Cliquez sur **Liste des médecins** dans le menu de gauche\n"
                + "👉 Filtrez par spécialité : **" + label + "**\n"
                + "👉 Choisissez un médecin disponible\n"
                + "👉 Cliquez sur **Prendre rendez-vous** et sélectionnez votre créneau\n\n"
                + "Avez-vous d'autres questions médicales ?";
    }

    /** Remonte l'historique pour trouver la dernière spécialité mentionnée par l'assistant. */
    private String lastSpecialtyInHistory(List<MessageDto> history) {
        if (history == null || history.isEmpty()) return null;
        String[] specialties = {
            "Cardiologie", "Dermatologie", "Ophtalmologie", "Neurologie", "Pneumologie",
            "Gastro-entérologie", "Orthopédie", "Gynécologie", "Pédiatrie",
            "Médecine générale", "Endocrinologie", "Diabétologie", "Rhumatologie",
            "ORL", "Urologie", "Psychiatrie"
        };
        for (int i = history.size() - 1; i >= 0; i--) {
            MessageDto m = history.get(i);
            if ("assistant".equals(m.getRole())) {
                for (String sp : specialties) {
                    if (m.getContent().contains(sp)) return sp;
                }
            }
        }
        return null;
    }

    private boolean containsAny(String text, String... keywords) {
        for (String kw : keywords) {
            if (text.contains(kw)) return true;
        }
        return false;
    }
}
