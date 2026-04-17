package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.entity.ServiceMedical;
import com.pfe.gestioncliniquebackend.service.ServiceMedicalService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class ServiceMedicalController {

    private final ServiceMedicalService service;

    @GetMapping
    public List<ServiceMedical> getAll() {
        return service.getAll();
    }

    @PostMapping
    public ServiceMedical add(@RequestBody ServiceMedical s) {
        return service.add(s);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}