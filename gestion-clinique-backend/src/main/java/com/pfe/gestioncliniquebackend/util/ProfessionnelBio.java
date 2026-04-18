package com.pfe.gestioncliniquebackend.util;

/**
 * Regroupe les champs « formation / département / … » en un texte {@code biographie} (colonne unique).
 */
public final class ProfessionnelBio {

    private ProfessionnelBio() {
    }

    public static String merge(String biographieBrute,
                               String qualifications,
                               String formation,
                               String certifications,
                               String departement,
                               String position) {
        String trimmed = normalize(biographieBrute);
        if (trimmed != null) {
            return trimmed;
        }
        StringBuilder sb = new StringBuilder();
        append(sb, "Qualifications", qualifications);
        append(sb, "Formation", formation);
        append(sb, "Certifications", certifications);
        append(sb, "Département", departement);
        append(sb, "Position", position);
        return sb.length() == 0 ? null : sb.toString().trim();
    }

    private static void append(StringBuilder sb, String label, String value) {
        String v = normalize(value);
        if (v == null) {
            return;
        }
        if (sb.length() > 0) {
            sb.append("\n");
        }
        sb.append(label).append(" : ").append(v);
    }

    private static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
