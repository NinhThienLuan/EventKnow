package com.eventknow.backend.common.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    public void setUp() {
        // Base64 secret key containing at least 256 bits for HMAC-SHA256
        JwtProperties jwtProperties = new JwtProperties(
                "dGhpcy1pcy1hLXNlY3JldC1rZXktZm9yLWV2ZW50a25vdy1iYWNrZW5kLXNlY3VyaXR5LXRva2Vu",
                60);
        jwtService = new JwtService(jwtProperties);
    }

    @Test
    public void testGenerateAndParseToken() {
        String email = "admin@eventknow.com";
        String role = "ROLE_ADMIN";

        String token = jwtService.generateAccessToken(email, role);
        assertNotNull(token);

        Claims claims = jwtService.parseClaims(token);
        assertEquals(email, claims.getSubject());
        assertEquals(email, claims.get("email"));
        assertEquals(role, claims.get("role"));
        assertEquals("access", claims.get("typ"));
    }
}
