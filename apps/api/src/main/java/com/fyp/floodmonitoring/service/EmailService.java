package com.fyp.floodmonitoring.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Sends transactional emails via Resend's SMTP relay.
 *
 * Behaviour:
 *   - RESEND_API_KEY is set (production)  → sends a real email through smtp.resend.com
 *   - RESEND_API_KEY is empty (dev/local) → logs the email body to console instead
 *
 * Wiring:
 *   application.yml configures spring.mail.* to point at smtp.resend.com:465.
 *   The SMTP password is the Resend API key.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.email.from-address}")
    private String fromAddress;

    @Value("${app.email.resend-api-key}")
    private String resendApiKey;

    /**
     * Sends a password-reset verification code to the user's email address.
     * Runs asynchronously so the /forgot-password endpoint returns immediately.
     *
     * @param toEmail recipient email
     * @param code    6-digit verification code
     */
    @Async
    public void sendPasswordResetCode(String toEmail, String code) {
        String subject = "Your Flood Monitor password reset code";
        String body = String.format(
                "Hi,%n%n" +
                "You requested a password reset for your Flood Monitor account.%n%n" +
                "Your verification code is:%n%n" +
                "    %s%n%n" +
                "This code expires in 10 minutes.%n%n" +
                "If you did not request this, you can safely ignore this email.%n%n" +
                "— Flood Monitor Team",
                code);

        if (resendApiKey == null || resendApiKey.isBlank()) {
            // Development fallback — log instead of sending
            log.info("[Email DEV] To={} Subject='{}' Code={}", toEmail, subject, code);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("[Email] Password reset code sent to {}", toEmail);
        } catch (MailException e) {
            // Log but don't rethrow — the reset code is still valid, user can retry
            log.error("[Email] Failed to send reset email to {}: {}", toEmail, e.getMessage());
        }
    }

    /**
     * Sends a broadcast alert email.
     * Currently used for admin notification only — push notifications handle mobile users.
     */
    @Async
    public void sendBroadcastAlert(String toEmail, String title, String body) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            log.info("[Email DEV] Broadcast to={} title='{}'", toEmail, title);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(toEmail);
            message.setSubject("[Flood Alert] " + title);
            message.setText(body + "\n\n— Flood Monitor System");
            mailSender.send(message);
        } catch (MailException e) {
            log.error("[Email] Failed to send broadcast email to {}: {}", toEmail, e.getMessage());
        }
    }
}
