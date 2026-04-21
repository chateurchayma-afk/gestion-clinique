package com.pfe.gestioncliniquebackend;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.nio.file.Files;
import java.nio.file.Path;

@SpringBootApplication
public class GestionCliniqueBackendApplication {

    public static void main(String[] args) {
        loadEnvFileIntoSystemProperties();
        SpringApplication.run(GestionCliniqueBackendApplication.class, args);
    }

    /**
     * Spring ne lit pas {@code .env} tout seul. On injecte les clés dans les system properties
     * pour que {@code application.properties} ({@code ${GOOGLE_CLIENT_ID:}}) soit résolu.
     * Ne remplace pas une variable d'environnement déjà définie (CI, Docker).
     */
    private static void loadEnvFileIntoSystemProperties() {
        String dir = ".";
        if (Files.exists(Path.of("gestion-clinique-backend", ".env"))) {
            dir = "gestion-clinique-backend";
        }
        Dotenv dotenv = Dotenv.configure()
                .directory(dir)
                .ignoreIfMissing()
                .load();
        dotenv.entries().forEach(e -> {
            String key = e.getKey();
            if (System.getenv(key) == null && System.getProperty(key) == null) {
                System.setProperty(key, e.getValue());
            }
        });
    }
}
