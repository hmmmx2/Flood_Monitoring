package com.fyp.floodmonitoring;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=",                              // DB not needed for context load test
        "spring.jpa.hibernate.ddl-auto=none",
        "app.jwt.secret=test_secret_key_at_least_32_chars_long_for_hmac",
        "app.jwt.refresh-secret=test_refresh_secret_key_also_32_chars_long",
        "app.jwt.access-token-expiry-ms=900000",
        "app.jwt.refresh-token-expiry-ms=604800000",
        "app.environment=test"
})
class FloodMonitoringApplicationTests {

    @Test
    void contextLoads() {
        // Verifies that the Spring application context can be assembled correctly
    }
}
