package com.pfe.gestioncliniquebackend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Corrige un ancien schema SQL ou ordonnance.consultation_id est NOT NULL,
 * alors que le flux actuel d'ordonnance n'utilise plus cette relation.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OrdonnanceSchemaFix implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            Integer exists = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'ordonnance'
                      AND COLUMN_NAME = 'consultation_id'
                    """,
                    Integer.class
            );
            if (exists == null || exists == 0) {
                return;
            }

            jdbcTemplate.execute("ALTER TABLE ordonnance MODIFY consultation_id BIGINT NULL");
            log.info("Schema fix applique: ordonnance.consultation_id est maintenant nullable.");
        } catch (Exception ex) {
            // Ne bloque pas le demarrage si le schema est deja correct ou incompatible.
            log.warn("Schema fix ignore pour ordonnance.consultation_id: {}", ex.getMessage());
        }
    }
}
