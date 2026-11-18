
package com.shrambazar.controller.skill;

import com.shrambazar.dto.skill.*;
import com.shrambazar.service.skill.SkillService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class SkillController {

    private final SkillService skillService;

    public SkillController(SkillService skillService) {
        this.skillService = skillService;
    }

    @GetMapping("/skills")
    public ResponseEntity<List<SkillResponse>> getAllSkills() {
        return ResponseEntity.ok(skillService.getAllSkills());
    }

    @GetMapping("/seeker/skills")
    public ResponseEntity<List<SeekerSkillResponse>> getMySkills() {
        return ResponseEntity.ok(skillService.getMySkills());
    }

    @PostMapping("/seeker/skills")
    public ResponseEntity<SeekerSkillResponse> addSkill(
            @Valid @RequestBody SeekerSkillRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(skillService.addSkill(request));
    }

    @DeleteMapping("/seeker/skills/{id}")
    public ResponseEntity<Void> removeSkill(
            @PathVariable Long id) {

        skillService.removeSkill(id);
        return ResponseEntity.noContent().build();
    }
}
