package com.chatly.service;

import com.chatly.model.postgres.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;

import java.time.Instant;
import org.thymeleaf.spring6.SpringTemplateEngine;

@Service
@RequiredArgsConstructor
public class EmailVerificationMailService {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${app.mail.from}")
    private String fromEmail;

    @Value("${app.auth.verification.expiration-minutes:15}")
    private long verificationExpirationMinutes;

    public void sendVerificationLink(User user, String verificationLink) {
        Context context = new Context();
        context.setVariable("displayName", user.getDisplayName());
        context.setVariable("verificationLink", verificationLink);
        context.setVariable("expiresInMinutes", verificationExpirationMinutes);

        String htmlBody = templateEngine.process("email-verification-otp", context);
        sendHtmlEmail(user.getEmail(), "Chatly - Verify your email", htmlBody);
    }

    public void sendNewPassword(User user, String rawPassword) {
        Context context = new Context();
        context.setVariable("displayName", user.getDisplayName());
        context.setVariable("newPassword", rawPassword);

        String htmlBody = templateEngine.process("forgot-password-new-password", context);
        sendHtmlEmail(user.getEmail(), "Chatly - Your new password", htmlBody);
    }

    /** Security notice after user changes password (sessions invalidated). */
    public void sendPasswordChangedNotice(User user, Instant occurredAt) {
        Context context = new Context();
        context.setVariable("displayName", user.getDisplayName());
        context.setVariable("occurredAt", occurredAt.toString());

        String htmlBody = templateEngine.process("password-changed-notice", context);
        sendHtmlEmail(user.getEmail(), "Chatly - Your password was changed", htmlBody);
    }

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
        } catch (MessagingException ex) {
            throw new IllegalStateException("Failed to send verification email", ex);
        }
    }
}
