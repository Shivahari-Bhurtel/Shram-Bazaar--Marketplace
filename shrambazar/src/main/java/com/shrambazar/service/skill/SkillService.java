
package com.shrambazar.service.skill;

import com.shrambazar.dto.skill.*;
import com.shrambazar.entity.*;
import com.shrambazar.repository.*;
import com.shrambazar.service.CurrentUserService;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class SkillService {

    private final SkillRepository skillRepository;
    private final SeekerSkillRepository seekerSkillRepository;
    private final CurrentUserService currentUserService;

    public SkillService(
            SkillRepository skillRepository,
            SeekerSkillRepository seekerSkillRepository,
            CurrentUserService currentUserService) {

        this.skillRepository = skillRepository;
        this.seekerSkillRepository = seekerSkillRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<SkillResponse> getAllSkills() {

        return skillRepository.findByActiveTrueOrderByNameAsc()
                .stream()
                .map(skill -> new SkillResponse(
                        skill.getId(),
                        skill.getName(),
                        skill.isActive()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SeekerSkillResponse> getMySkills() {

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        return seekerSkillRepository.findBySeekerProfileId(profile.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public SeekerSkillResponse addSkill(SeekerSkillRequest request) {

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        Skill skill = skillRepository.findById(request.skillId())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Skill not found"
                        )
                );

        if (!skill.isActive()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This skill is currently unavailable"
            );
        }

        if (seekerSkillRepository
                .findBySeekerProfileIdAndSkillId(
                        profile.getId(), skill.getId()
                ).isPresent()) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Skill already added"
            );
        }

        SeekerSkill seekerSkill = new SeekerSkill();
        seekerSkill.setSeekerProfile(profile);
        seekerSkill.setSkill(skill);

        return mapToResponse(
                seekerSkillRepository.save(seekerSkill)
        );
    }


    @Transactional
    public void removeSkill(Long id) {

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        SeekerSkill seekerSkill =
                seekerSkillRepository.findByIdAndSeekerProfileId(
                        id, profile.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Skill not found in your profile"
                        )
                );

        seekerSkillRepository.delete(seekerSkill);
    }

    private SeekerSkillResponse mapToResponse(SeekerSkill seekerSkill) {

        return new SeekerSkillResponse(
                seekerSkill.getId(),
                seekerSkill.getSkill().getId(),
                seekerSkill.getSkill().getName()
        );
    }
}
