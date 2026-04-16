package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.entity.ServiceMedical;
import com.pfe.gestioncliniquebackend.repository.ServiceMedicalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceMedicalService {

    private final ServiceMedicalRepository repository;

    public List<ServiceMedical> getAll() {
        return repository.findAll();
    }

    public ServiceMedical add(ServiceMedical service) {
        return repository.save(service);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}