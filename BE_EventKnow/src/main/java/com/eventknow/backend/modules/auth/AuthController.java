package com.eventknow.backend.modules.auth;

import com.eventknow.backend.common.security.CustomUserDetailService;
import com.eventknow.backend.common.security.JwtProperties;
import com.eventknow.backend.common.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Map;

/**
 * Module 4 — Auth Controller.
 *
 * <p>
 * Handles Google OAuth ID token exchange for internal application HttpOnly
 * session cookies,
 * and session termination (logout).
 * </p>
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final JwtService jwtService;
    private final CustomUserDetailService userDetailsService;
    private final JwtProperties jwtProperties;
    private final RestClient restClient = RestClient.builder().build();

    public record CallbackRequest(String idToken, String accessToken) {
    }

    /**
     * POST /api/auth/google/callback
     *
     * <p>
     * Verifies the Google idToken or accessToken against Google's tokeninfo API,
     * fetches user profile, generates a secure HttpOnly JWT cookie, and returns
     * basic user info for UI layout.
     * </p>
     */
    @PostMapping("/google/callback")
    public ResponseEntity<?> googleCallback(@RequestBody CallbackRequest request) {
        String verifyUrl;
        if (request.idToken() != null && !request.idToken().trim().isEmpty()) {
            verifyUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + request.idToken().trim();
        } else if (request.accessToken() != null && !request.accessToken().trim().isEmpty()) {
            verifyUrl = "https://oauth2.googleapis.com/tokeninfo?access_token=" + request.accessToken().trim();
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing idToken or accessToken in request body"));
        }

        try {
            log.debug("Exchanging Google token for app session using verifyUrl: {}", verifyUrl);

            // Try to fetch profile from Google TOKENINFO API
            Map<?, ?> tokenInfo = restClient.get()
                    .uri(verifyUrl)
                    .retrieve()
                    .body(Map.class);

            if (tokenInfo == null || !tokenInfo.containsKey("email")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid or expired Google Token"));
            }

            String email = (String) tokenInfo.get("email");
            String emailVerified = (String) tokenInfo.get("email_verified");

            // email_verified is not always present in tokeninfo for access_tokens, if so we
            // assume true if email is present
            if (emailVerified != null && !"true".equals(emailVerified)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Google email is not verified"));
            }

            String name = (String) tokenInfo.get("name");
            String picture = (String) tokenInfo.get("picture");

            // Look up permissions & roles
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            String role = userDetails.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(a -> a.equals("ROLE_ADMIN"))
                    .findFirst()
                    .orElse("ROLE_USER");

            // Generate internal JWT token
            String accessToken = jwtService.generateAccessToken(email, role);

            // Set cookie: access_token, HttpOnly, SameSite=Lax
            ResponseCookie cookie = ResponseCookie.from("access_token", accessToken)
                    .httpOnly(true)
                    .secure(false) // Set to false to support local HTTP dev (standard localhost)
                    .path("/")
                    .maxAge(Duration.ofMinutes(jwtProperties.accessTokenExpMinutes()))
                    .sameSite("Lax")
                    .build();

            log.info("Successfully authenticated user: email={} role={}", email, role);

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, cookie.toString())
                    .body(Map.of(
                            "email", email,
                            "role", role,
                            "name", name != null ? name : email,
                            "picture", picture != null ? picture : ""));

        } catch (Exception e) {
            log.error("Failed Google ID Token verification:", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "error", "Failed Google ID Token verification",
                            "details", e.getMessage()));
        }
    }

    /**
     * POST /api/auth/logout
     *
     * <p>
     * Clears the HTTP-only access_token cookie.
     * </p>
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        ResponseCookie cookie = ResponseCookie.from("access_token", "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0) // Expire immediately
                .sameSite("Lax")
                .build();

        log.debug("Clearing application access_token cookie on logout");

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(Map.of("status", "logged_out"));
    }
}
