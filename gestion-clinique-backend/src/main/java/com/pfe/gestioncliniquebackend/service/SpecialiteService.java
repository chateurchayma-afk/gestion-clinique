package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.entity.Specialite;
import com.pfe.gestioncliniquebackend.repository.SpecialiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SpecialiteService {

    private final SpecialiteRepository specialiteRepository;

    public List<Specialite> getAllSpecialites() {
        return specialiteRepository.findAll();
    }

    public Specialite addSpecialite(Specialite specialite) {
        return specialiteRepository.save(specialite);
    }

    public void deleteSpecialite(Long id) {
        specialiteRepository.deleteById(id);
    }
}