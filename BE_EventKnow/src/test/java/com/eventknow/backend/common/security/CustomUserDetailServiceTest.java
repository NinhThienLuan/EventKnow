package com.eventknow.backend.common.security;

import com.eventknow.backend.model.entity.Audit.AppAdminEntity;
import com.eventknow.backend.modules.auth.AppAdminRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class CustomUserDetailServiceTest {

    private AppAdminRepository appAdminRepository;
    private CustomUserDetailService customUserDetailService;

    @BeforeEach
    public void setUp() {
        appAdminRepository = mock(AppAdminRepository.class);
        customUserDetailService = new CustomUserDetailService(appAdminRepository);
    }

    @Test
    public void testLoadUserByUsername_RegularUser() {
        String email = "user@eventknow.com";
        when(appAdminRepository.findByEmailAndRevokedAtIsNull(email)).thenReturn(Optional.empty());

        UserDetails userDetails = customUserDetailService.loadUserByUsername(email);

        assertNotNull(userDetails);
        assertEquals(email, userDetails.getUsername());
        assertTrue(userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_USER")));
        assertFalse(userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
    }

    @Test
    public void testLoadUserByUsername_DatabaseAdmin() {
        String email = "admin@eventknow.com";
        AppAdminEntity admin = AppAdminEntity.builder()
                .email(email)
                .build();
        when(appAdminRepository.findByEmailAndRevokedAtIsNull(email)).thenReturn(Optional.of(admin));

        UserDetails userDetails = customUserDetailService.loadUserByUsername(email);

        assertNotNull(userDetails);
        assertEquals(email, userDetails.getUsername());
        assertTrue(userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_USER")));
        assertTrue(userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
    }
}
