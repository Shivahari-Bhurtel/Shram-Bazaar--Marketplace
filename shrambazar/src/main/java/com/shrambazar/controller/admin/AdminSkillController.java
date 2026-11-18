
package com.shrambazar.controller.admin;

import com.shrambazar.dto.skill.SkillRequest;
import com.shrambazar.dto.skill.SkillResponse;
import com.shrambazar.service.skill.SkillManagementService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/skills")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSkillController {

    private final SkillManagementService skillService;

    public AdminSkillController(
            SkillManagementService skillService) {
        this.skillService = skillService;
    }

    @PostMapping
    public ResponseEntity<SkillResponse> createSkill(
            @Valid @RequestBody SkillRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(skillService.createSkill(request));
    }

    @GetMapping
    public ResponseEntity<List<SkillResponse>> getAllSkills() {

        return ResponseEntity.ok(
                skillService.getAllSkills()
        );
    }

    @GetMapping("/{skillId}")
    public ResponseEntity<SkillResponse> getSkill(
            @PathVariable Long skillId) {

        return ResponseEntity.ok(
                skillService.getSkill(skillId)
        );
    }

    @PutMapping("/{skillId}")
    public ResponseEntity<SkillResponse> updateSkill(
            @PathVariable Long skillId,
            @Valid @RequestBody SkillRequest request) {

        return ResponseEntity.ok(
                skillService.updateSkill(skillId, request)
        );
    }

    @PatchMapping("/{skillId}/deactivate")
    public ResponseEntity<SkillResponse> deactivateSkill(
            @PathVariable Long skillId) {

        return ResponseEntity.ok(
                skillService.deactivateSkill(skillId)
        );
    }

    @PatchMapping("/{skillId}/activate")
    public ResponseEntity<SkillResponse> activateSkill(
            @PathVariable Long skillId) {

        return ResponseEntity.ok(
                skillService.activateSkill(skillId)
        );
    }
}
