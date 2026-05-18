package com.pfe.gestioncliniquebackend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Aligne le schéma legacy (colonne {@code lu}) avec le modèle JPA ({@code is_read}).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationSchemaFix implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            if (!columnExists("notification", "is_read")) {
                jdbcTemplate.execute(
                        "ALTER TABLE notification ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0");
                log.info("Schema fix: colonne notification.is_read ajoutee.");
            }
            if (columnExists("notification", "lu")) {
                jdbcTemplate.execute(
                        "UPDATE notification SET is_read = lu WHERE lu IS NOT NULL");
                log.info("Schema fix: notification.lu synchronise vers is_read.");
            }
        } catch (Exception ex) {
            log.warn("NotificationSchemaFix non applique: {}", ex.getMessage());
        }
    }

    private boolean columnExists(String table, String column) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = ?
                  AND COLUMN_NAME = ?
                """,
                Integer.class,
                table,
                column
        );
        return count != null && count > 0;
    }
}
