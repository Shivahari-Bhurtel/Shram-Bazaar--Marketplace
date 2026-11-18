package com.shrambazar.config;

import com.shrambazar.entity.Skill;
import com.shrambazar.repository.SkillRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DefaultSkillInitializer implements CommandLineRunner {

    private static final List<String> DEFAULT_SKILLS = List.of(
            "Cooking", "Cleaning", "Driving", "Plumbing", "Electrical work",
            "Customer service", "Event assistance", "Delivery", "Gardening",
            "Painting", "Construction", "Data entry", "Graphic design",
            "Programming", "Teaching", "Waitering", "Housekeeping"
    );

    private final SkillRepository skillRepository;

    public DefaultSkillInitializer(SkillRepository skillRepository) {
        this.skillRepository = skillRepository;
    }

    @Override
    public void run(String... args) {
        DEFAULT_SKILLS.stream()
                .filter(name -> !skillRepository.existsByNameIgnoreCase(name))
                .map(name -> {
                    Skill skill = new Skill();
                    skill.setName(name);
                    skill.setActive(true);
                    return skill;
                })
                .forEach(skillRepository::save);
    }
}
