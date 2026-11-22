package com.shrambazar.service.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shrambazar.entity.Application;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
public class ApplicationConfirmationEmailService {
    private static final Logger log = LoggerFactory.getLogger(ApplicationConfirmationEmailService.class);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm");

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient;
    private final String apiKey;
    private final String from;

    public ApplicationConfirmationEmailService(
            @Value("${app.email.resend-api-key:}") String apiKey,
            @Value("${app.email.from:}") String from) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.from = from == null ? "" : from.trim();
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    }

    public boolean sendApplicationConfirmation(Application application) {
        if (apiKey.isBlank() || from.isBlank()) {
            log.warn("Application {} was saved, but confirmation email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.", application.getId());
            return false;
        }

        String applicant = application.getApplicantName();
        String jobTitle = application.getJobPost().getTitle();
        String employer = application.getJobPost().getProviderProfile().getBusinessName();
        if (employer == null || employer.isBlank()) employer = application.getJobPost().getProviderProfile().getUser().getFullName();
        String submittedAt = application.getAppliedAt().format(DATE_FORMAT);
        String subject = "Your application for " + jobTitle + " has been submitted successfully!";
        String html = """
                <!doctype html><html><body style="margin:0;background:#f6f3ef;font-family:Arial,sans-serif;color:#29231e">
                <div style="max-width:600px;margin:24px auto;background:#fff;border:1px solid #e8dfd6">
                <div style="background:#70472f;padding:22px 28px;color:#fff;font-size:20px;font-weight:700">Shram Bazar</div>
                <div style="padding:28px"><h1 style="font-size:22px;margin:0 0 18px">Application received</h1>
                <p>Hello %s,</p><p>We received your application. Here are the details:</p>
                <p><strong>Job:</strong> %s<br><strong>Employer:</strong> %s<br><strong>Application ID:</strong> %s<br><strong>Submitted:</strong> %s<br><strong>Status:</strong> Pending</p>
                <p>The employer will review your application and contact you if you are shortlisted.</p>
                <p style="font-size:13px;color:#70665e">This is an automatic confirmation from Shram Bazar.</p></div></div></body></html>
                """.formatted(escapeHtml(applicant), escapeHtml(jobTitle), escapeHtml(employer), application.getId(), escapeHtml(submittedAt));
        String text = "Hello " + applicant + ",\n\nWe received your application.\n"
                + "Job: " + jobTitle + "\nEmployer: " + employer + "\nApplication ID: " + application.getId()
                + "\nSubmitted: " + submittedAt + "\nStatus: Pending\n\n"
                + "The employer will review your application and contact you if you are shortlisted.";
        try {
            String body = objectMapper.writeValueAsString(Map.of(
                    "from", from,
                    "to", List.of(application.getApplicantEmail()),
                    "subject", subject,
                    "html", html,
                    "text", text));
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.resend.com/emails"))
                    .timeout(Duration.ofSeconds(12))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() >= 200 && response.statusCode() < 300) return true;
            log.warn("Confirmation email delivery failed for application {} with Resend HTTP status {}.", application.getId(), response.statusCode());
            return false;
        } catch (IOException error) {
            log.warn("Confirmation email delivery failed for application {}: {}", application.getId(), error.getMessage());
            return false;
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            log.warn("Confirmation email delivery was interrupted for application {}.", application.getId());
            return false;
        } catch (RuntimeException error) {
            log.warn("Confirmation email delivery failed for application {}: {}", application.getId(), error.getMessage());
            return false;
        }
    }

    private static String escapeHtml(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
