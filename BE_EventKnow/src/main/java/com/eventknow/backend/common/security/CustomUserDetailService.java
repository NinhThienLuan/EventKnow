package com.eventknow.backend.common.security;

import com.eventknow.backend.modules.auth.AppAdminRepository;
import com.eventknow.backend.model.entity.Audit.AppAdminEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Component
public class CustomUserDetailService implements UserDetailsService {

    private final AppAdminRepository appAdminRepository;

    @org.springframework.beans.factory.annotation.Value("${recovery.admin.emails:}")
    private String recoveryEmailsConfig;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_USER"));

        Optional<AppAdminEntity> adminOpt = appAdminRepository.findByEmailAndRevokedAtIsNull(email);
        if (adminOpt.isPresent()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }

        // Recovery Admin override (Break-glass mechanic)
        String recoveryEmails = System.getenv("RECOVERY_ADMIN_EMAILS");
        if (recoveryEmails == null || recoveryEmails.isEmpty()) {
            recoveryEmails = recoveryEmailsConfig;
        }
        if (recoveryEmails != null && !recoveryEmails.isEmpty()) {
            for (String recEmail : recoveryEmails.split(",")) {
                if (recEmail.trim().equalsIgnoreCase(email)) {
                    // Check if already is ROLE_ADMIN
                    if (!authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                    }
                    break;
                }
            }
        }

        return new User(email, "", authorities);
    }
}
