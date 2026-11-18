package com.shrambazar.service.auth;

import com.shrambazar.entity.RevokedToken;
import com.shrambazar.repository.RevokedTokenRepository;
import com.shrambazar.security.JwtService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class TokenRevocationService {

    private final RevokedTokenRepository revokedTokenRepository;
    private final JwtService jwtService;

    public TokenRevocationService(
            RevokedTokenRepository revokedTokenRepository,
            JwtService jwtService) {

        this.revokedTokenRepository = revokedTokenRepository;
        this.jwtService = jwtService;
    }

    @Transactional
    public void revokeToken(String token) {

        String tokenHash = hashToken(token);

        if (revokedTokenRepository.existsByTokenHash(tokenHash)) {
            return;
        }

        RevokedToken revokedToken = new RevokedToken();

        revokedToken.setTokenHash(tokenHash);
        revokedToken.setExpiresAt(jwtService.extractExpiration(token));

        revokedTokenRepository.save(revokedToken);
    }

    @Transactional(readOnly = true)
    public boolean isRevoked(String token) {

        String tokenHash = hashToken(token);

        return revokedTokenRepository.existsByTokenHash(tokenHash);
    }

    private String hashToken(String token) {

        try {
            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    token.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hash);

        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(
                    "SHA-256 algorithm is unavailable", e
            );
        }
    }
}