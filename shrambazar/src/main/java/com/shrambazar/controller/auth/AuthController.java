
package com.shrambazar.controller.auth;

import com.shrambazar.dto.auth.AuthResponse;
import com.shrambazar.dto.auth.LoginRequest;
import com.shrambazar.dto.auth.SeekerRegisterRequest;
import com.shrambazar.dto.auth.ProviderRegisterRequest;
import com.shrambazar.service.auth.AuthService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register/job-seeker")
    public ResponseEntity<AuthResponse> registerJobSeeker(
            @Valid @RequestBody SeekerRegisterRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(authService.registerJobSeeker(request));
    }

    @PostMapping("/register/job-provider")
    public ResponseEntity<AuthResponse> registerJobProvider(
            @Valid @RequestBody ProviderRegisterRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(authService.registerJobProvider(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request) {

        return ResponseEntity.ok(authService.login(request));
    }


    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request) {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String token = authHeader.substring(7);

        authService.logout(token);

        return ResponseEntity.noContent().build();
    }
}
