package com.eventknow.backend.modules.ingestion.controller;

import com.eventknow.backend.model.entity.Audit.DepartmentEntity;
import com.eventknow.backend.modules.ingestion.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
public class DepartmentController {

    private final DepartmentRepository departmentRepository;

    @GetMapping
    public ResponseEntity<List<DepartmentEntity>> getAllDepartments() {
        log.info("Fetching all departments from database");
        return ResponseEntity.ok(departmentRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<DepartmentEntity> createDepartment(@RequestBody DepartmentEntity department) {
        log.info("Creating new department: {}", department.getCode());
        return ResponseEntity.ok(departmentRepository.save(department));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DepartmentEntity> updateDepartment(@PathVariable UUID id,
            @RequestBody DepartmentEntity updatedDept) {
        log.info("Updating department with ID: {}", id);
        return departmentRepository.findById(id)
                .map(existing -> {
                    existing.setCode(updatedDept.getCode());
                    existing.setName(updatedDept.getName());
                    existing.setNameEn(updatedDept.getNameEn());
                    existing.setAliases(updatedDept.getAliases());
                    return ResponseEntity.ok(departmentRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDepartment(@PathVariable UUID id) {
        log.info("Deleting department with ID: {}", id);
        if (departmentRepository.existsById(id)) {
            departmentRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
