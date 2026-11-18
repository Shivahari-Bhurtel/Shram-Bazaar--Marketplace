
package com.shrambazar.service;

import com.shrambazar.entity.User;
import com.shrambazar.entity.SeekerProfile;
import com.shrambazar.entity.ProviderProfile;
import com.shrambazar.enums.UserRole;
import com.shrambazar.repository.UserRepository;
import com.shrambazar.repository.SeekerProfileRepository;
import com.shrambazar.repository.ProviderProfileRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
@Service
public class CurrentUserService {

    private final UserRepository userRepository;
    private final SeekerProfileRepository seekerProfileRepository;
    private final ProviderProfileRepository providerProfileRepository;

    private static final Logger log =
            LoggerFactory.getLogger(CurrentUserService.class);

    public CurrentUserService(
            UserRepository userRepository,
            SeekerProfileRepository seekerProfileRepository,
            ProviderProfileRepository providerProfileRepository) {

        this.userRepository = userRepository;
        this.seekerProfileRepository = seekerProfileRepository;
        this.providerProfileRepository = providerProfileRepository;
    }

    public User getCurrentUser() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null ||
                !authentication.isAuthenticated() ||
                "anonymousUser".equals(authentication.getPrincipal())) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not authenticated"
            );
        }

        return userRepository.findByEmailIgnoreCase(
                authentication.getName()
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                )
        );
    }

    public SeekerProfile getCurrentSeekerProfile() {

        User user = getCurrentUser();

        log.info("Authenticated user: email={}, role={}",
                user.getEmail(), user.getRole());

        if (user.getRole() != UserRole.JOB_SEEKER) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Access denied"
            );
        }

        return seekerProfileRepository.findByUserId(user.getId())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Seeker profile not found"
                        )
                );
    }

    public ProviderProfile getCurrentProviderProfile() {

        User user = getCurrentUser();

        if (user.getRole() != UserRole.JOB_PROVIDER) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Access denied"
            );
        }

        return providerProfileRepository.findByUserId(user.getId())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Provider profile not found"
                        )
                );
    }
}
