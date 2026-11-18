
package com.shrambazar.service.skill;

import com.shrambazar.dto.skill.SkillRequest;
import com.shrambazar.dto.skill.SkillResponse;
import com.shrambazar.entity.Skill;
import com.shrambazar.repository.SkillRepository;
import com.shrambazar.service.CurrentUserService;
import com.shrambazar.enums.UserRole;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class SkillManagementService {

    private final SkillRepository skillRepository;
    private final CurrentUserService currentUserService;

    public SkillManagementService(
            SkillRepository skillRepository,
            CurrentUserService currentUserService) {

        this.skillRepository = skillRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public SkillResponse createSkill(SkillRequest request) {

        requireAdmin();

        String name = request.name().trim();

        if (skillRepository.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A skill with this name already exists"
            );
        }

        Skill skill = new Skill();

        skill.setName(name);
        skill.setActive(true);

        return mapToResponse(skillRepository.save(skill));
    }

    @Transactional(readOnly = true)
    public List<SkillResponse> getAllSkills() {

        requireAdmin();

        return skillRepository.findAllByOrderByNameAsc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SkillResponse getSkill(Long skillId) {

        requireAdmin();

        return mapToResponse(findSkill(skillId));
    }

    @Transactional
    public SkillResponse updateSkill(
            Long skillId,
            SkillRequest request) {

        requireAdmin();

        Skill skill = findSkill(skillId);

        String name = request.name().trim();

        if (skillRepository.existsByNameIgnoreCaseAndIdNot(
                name, skillId)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Another skill already uses this name"
            );
        }

        skill.setName(name);


        return mapToResponse(skill);
    }

    @Transactional
    public SkillResponse deactivateSkill(Long skillId) {

        requireAdmin();

        Skill skill = findSkill(skillId);

        if (!skill.isActive()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Skill is already inactive"
            );
        }

        skill.setActive(false);

        return mapToResponse(skill);
    }

    @Transactional
    public SkillResponse activateSkill(Long skillId) {

        requireAdmin();

        Skill skill = findSkill(skillId);

        if (skill.isActive()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Skill is already active"
            );
        }

        skill.setActive(true);

        return mapToResponse(skill);
    }

    private Skill findSkill(Long skillId) {

        return skillRepository.findById(skillId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Skill not found"
                        )
                );
    }

    private void requireAdmin() {

        if (currentUserService.getCurrentUser().getRole()
                != UserRole.ADMIN) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Administrator access required"
            );
        }
    }

    private SkillResponse mapToResponse(Skill skill) {

        return new SkillResponse(
                skill.getId(),
                skill.getName(),
                skill.isActive()
        );
    }
}
