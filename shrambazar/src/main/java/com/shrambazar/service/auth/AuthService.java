
package com.shrambazar.service.auth;

import com.shrambazar.dto.auth.AuthResponse;
import com.shrambazar.dto.auth.LoginRequest;
import com.shrambazar.dto.auth.ProviderRegisterRequest;
import com.shrambazar.dto.auth.SeekerRegisterRequest;
import com.shrambazar.entity.*;
import com.shrambazar.enums.*;
import com.shrambazar.repository.*;
import com.shrambazar.security.JwtService;
import com.shrambazar.security.CustomUserDetailsService;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final SeekerProfileRepository seekerProfileRepository;
    private final ProviderProfileRepository providerProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    private final TokenRevocationService tokenRevocationService;

    public AuthService(
            UserRepository userRepository,
            SeekerProfileRepository seekerProfileRepository,
            ProviderProfileRepository providerProfileRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            CustomUserDetailsService userDetailsService,
            TokenRevocationService tokenRevocationService) {

        this.userRepository = userRepository;
        this.seekerProfileRepository = seekerProfileRepository;
        this.providerProfileRepository = providerProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.tokenRevocationService = tokenRevocationService;
    }

    @Transactional
    public AuthResponse registerJobSeeker(SeekerRegisterRequest request) {

        validateRegistration(
                request.email(),
                request.password(),
                request.confirmPassword()
        );

        AuthResponse retryResponse = reuseMatchingRegistration(
                request.email(), request.password(), UserRole.JOB_SEEKER);
        if (retryResponse != null) {
            return retryResponse;
        }

        User user = createUser(
                request.fullName(),
                request.email(),
                request.password(),
                request.phoneNumber(),
                request.dateOfBirth(),
                UserRole.JOB_SEEKER
        );

        SeekerProfile profile = new SeekerProfile();
        profile.setUser(user);
        profile.setAddress(request.address());

        seekerProfileRepository.save(profile);

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse registerJobProvider(ProviderRegisterRequest request) {

        validateRegistration(
                request.email(),
                request.password(),
                request.confirmPassword()
        );

        AuthResponse retryResponse = reuseMatchingRegistration(
                request.email(), request.password(), UserRole.JOB_PROVIDER);
        if (retryResponse != null) {
            return retryResponse;
        }

        if (request.hasBusiness()) {

            if (request.businessName() == null || request.businessName().isBlank()) {
                throw new IllegalArgumentException("Business name is required.");
            }

        }

        User user = createUser(
                request.fullName(),
                request.email(),
                request.password(),
                request.phoneNumber(),
                request.dateOfBirth(),
                UserRole.JOB_PROVIDER
        );

        ProviderProfile profile = new ProviderProfile();
        profile.setUser(user);
        profile.setAddress(request.address());

        profile.setHasBusiness(request.hasBusiness());

        if (request.hasBusiness()) {
            profile.setBusinessName(request.businessName());
            profile.setBusinessLocation(request.businessLocation());
            profile.setBusinessDescription(request.businessDescription());
            profile.setBusinessWebsite(request.businessWebsite());
        }

        providerProfileRepository.save(profile);

        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {

        String email = normalizeEmail(request.email());

        var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        email,
                        request.password()
                )
        );

        UserDetails userDetails =
                (UserDetails) authentication.getPrincipal();

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Invalid email or password"
                        )
                );

        String token = jwtService.generateToken(userDetails);

        return new AuthResponse(
                token,
                "Bearer",
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole()
        );
    }

    private User createUser(
            String fullName,
            String email,
            String password,
            String phoneNumber,
            java.time.LocalDate dateOfBirth,
            UserRole role) {

        User user = new User();

        user.setFullName(fullName.trim());
        user.setEmail(normalizeEmail(email));
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setPhoneNumber(phoneNumber);
        user.setDateOfBirth(dateOfBirth);
        user.setRole(role);
        user.setStatus(AccountStatus.ACTIVE);

        return userRepository.save(user);
    }

    private void validateRegistration(
            String email,
            String password,
            String confirmPassword) {

        if (!password.equals(confirmPassword)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Passwords do not match"
            );
        }

        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must be 72 UTF-8 bytes or fewer"
            );
        }

    }

    /**
     * Signup is safe to retry after a lost response: the same email, role, and
     * password returns the already-created account instead of a duplicate error.
     * A different password or role still requires the existing account's login.
     */
    private AuthResponse reuseMatchingRegistration(String email, String password, UserRole role) {
        User existing = userRepository.findByEmailIgnoreCase(normalizeEmail(email)).orElse(null);
        if (existing == null) {
            return null;
        }
        if (existing.getRole() == role && passwordEncoder.matches(password, existing.getPasswordHash())) {
            return buildAuthResponse(existing);
        }
        throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "This email already has an account. Sign in with its existing password."
        );
    }

    private AuthResponse buildAuthResponse(User user) {

        UserDetails userDetails =
                userDetailsService.loadUserByUsername(user.getEmail());

        String token = jwtService.generateToken(userDetails);

        return new AuthResponse(
                token,
                "Bearer",
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole()
        );
    }

    public void logout(String token) {
        tokenRevocationService.revokeToken(token);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(java.util.Locale.ROOT);
    }
}
