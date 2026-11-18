
package com.shrambazar.dto.verification;

import com.shrambazar.enums.VerificationType;
import jakarta.validation.constraints.NotNull;

public record VerificationRequestCreate(

        @NotNull
        VerificationType type

) {
}
