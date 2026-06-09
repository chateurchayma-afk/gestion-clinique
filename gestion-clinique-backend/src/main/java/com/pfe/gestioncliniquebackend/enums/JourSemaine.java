package com.pfe.gestioncliniquebackend.enums;

import java.time.DayOfWeek;

public enum JourSemaine {
    LUNDI, MARDI, MERCREDI, JEUDI, VENDREDI, SAMEDI, DIMANCHE;

    public static JourSemaine fromDayOfWeek(DayOfWeek dow) {
        return switch (dow) {
            case MONDAY    -> LUNDI;
            case TUESDAY   -> MARDI;
            case WEDNESDAY -> MERCREDI;
            case THURSDAY  -> JEUDI;
            case FRIDAY    -> VENDREDI;
            case SATURDAY  -> SAMEDI;
            case SUNDAY    -> DIMANCHE;
        };
    }
}
