
package com.shrambazar.dto.auth;

import com.shrambazar.enums.UserRole;

public record AuthResponse(

        String accessToken,
        String tokenType,
        Long userId,
        String fullName,
        String email,
        UserRole role

) {
}
