package com.pfe.gestioncliniquebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class NotificationScheduler {

    private final NotificationService notificationService;

    @Scheduled(cron = "0 15 3 * * *")
    public void nightlyArchiveAndPurge() {
        notificationService.archiveAndPurgeOld();
    }
}
