package com.eventknow.backend.modules.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Base64;

@Service
@Slf4j
public class DriveTokenService {

    @Value("${app.security.encryption-key:default-encryption-key-eventknow-2026}")
    private String encryptionKey;

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 16; // in bytes
    private static final int IV_LENGTH = 12; // GCM standard IV size

    public String decryptToken(String encryptedToken) {
        if (encryptedToken == null || encryptedToken.trim().isEmpty()) {
            return "";
        }
        try {
            byte[] decoded = Base64.getDecoder().decode(encryptedToken);
            if (decoded.length <= IV_LENGTH + GCM_TAG_LENGTH) {
                // Fallback: If it's too short for AES-GCM format, treat as plain text
                return encryptedToken;
            }

            byte[] iv = Arrays.copyOfRange(decoded, 0, IV_LENGTH);
            byte[] ciphertext = Arrays.copyOfRange(decoded, IV_LENGTH, decoded.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            SecretKeySpec keySpec = getSecretKeySpec();
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, parameterSpec);

            byte[] plaintext = cipher.doFinal(ciphertext);
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("Failed to decrypt Google token using AES. Falling back to plain text evaluation.", e);
            return encryptedToken; // Fallback to plain text for local testing
        }
    }

    public String encryptToken(String plainToken) {
        if (plainToken == null || plainToken.trim().isEmpty()) {
            return "";
        }
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            SecretKeySpec keySpec = getSecretKeySpec();
            byte[] iv = new byte[IV_LENGTH];
            // Simple deterministic/secure IV generation for demonstration/safety
            System.arraycopy(MessageDigest.getInstance("SHA-256").digest(plainToken.getBytes(StandardCharsets.UTF_8)),
                    0, iv, 0, IV_LENGTH);

            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, parameterSpec);

            byte[] ciphertext = cipher.doFinal(plainToken.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[IV_LENGTH + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, IV_LENGTH);
            System.arraycopy(ciphertext, 0, combined, IV_LENGTH, ciphertext.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            log.error("Failed to encrypt token:", e);
            throw new RuntimeException("Encryption failed", e);
        }
    }

    private SecretKeySpec getSecretKeySpec() throws Exception {
        byte[] keyBytes = encryptionKey.getBytes(StandardCharsets.UTF_8);
        MessageDigest sha = MessageDigest.getInstance("SHA-256");
        byte[] key = sha.digest(keyBytes);
        key = Arrays.copyOf(key, 16); // 128-bit key
        return new SecretKeySpec(key, "AES");
    }
}
