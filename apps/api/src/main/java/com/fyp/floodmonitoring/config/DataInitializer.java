package com.fyp.floodmonitoring.config;

import com.fyp.floodmonitoring.entity.User;
import com.fyp.floodmonitoring.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds a default admin account on startup if none exists.
 * Credentials: admin@example.com / Admin@123
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final String ADMIN_EMAIL    = "admin@example.com";
    private static final String ADMIN_PASSWORD = "Admin@123";

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        userRepository.findByEmail(ADMIN_EMAIL).ifPresentOrElse(
            existing -> {
                if (!"admin".equals(existing.getRole())) {
                    existing.setRole("admin");
                    userRepository.save(existing);
                    log.info("DataInitializer: promoted {} to admin", ADMIN_EMAIL);
                }
            },
            () -> {
                User admin = User.builder()
                        .firstName("Admin")
                        .lastName("User")
                        .email(ADMIN_EMAIL)
                        .passwordHash(passwordEncoder.encode(ADMIN_PASSWORD))
                        .role("admin")
                        .build();
                userRepository.save(admin);
                log.info("DataInitializer: created admin account {}", ADMIN_EMAIL);
            }
        );
    }
}
