
package com.shrambazar.dto.skill;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record SeekerSkillRequest(

        @NotNull
        Long skillId

) {
}
