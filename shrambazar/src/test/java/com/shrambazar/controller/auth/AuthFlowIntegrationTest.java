package com.shrambazar.controller.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import javax.sql.DataSource;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.nullValue;

@SpringBootTest
@AutoConfigureMockMvc
class AuthFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void registrationRejectsPasswordLongerThanBcryptLimitWithHelpfulError() throws Exception {
        String longPassword = "a".repeat(73);
        mockMvc.perform(post("/api/auth/register/job-seeker")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Long Password Worker",
                                  "email":"long-password-worker@example.com",
                                  "password":"%s",
                                  "confirmPassword":"%s",
                                  "phoneNumber":"+9779800000059",
                                  "dateOfBirth":"1990-01-01"
                                }
                                """.formatted(longPassword, longPassword)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void privateNotificationRequestWithoutSessionPromptsForAuthentication() throws Exception {
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void workerCanRegisterAndLogIn() throws Exception {
        String email = "worker-auth-flow@example.com";
        String password = "worker-password-123";

        // Model the older profile schema that caused live worker signup to fail.
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            statement.execute("ALTER TABLE seeker_profiles DROP COLUMN accepting_work");
            statement.execute("DROP TABLE IF EXISTS seeker_preferred_categories");
        }
        new ResourceDatabasePopulator(new ClassPathResource("schema.sql")).execute(dataSource);

        mockMvc.perform(post("/api/auth/register/job-seeker")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Test Worker",
                                  "email": "%s",
                                  "password": "%s",
                                  "confirmPassword": "%s",
                                  "phoneNumber": "+9779800000001",
                                  "dateOfBirth": "1990-01-01"
                                }
                                """.formatted(email, password, password)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.role").value("JOB_SEEKER"));

        String loginResponse = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email.toUpperCase(), password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.email").value(email))
                .andReturn().getResponse().getContentAsString();
        String token = objectMapper.readTree(loginResponse).get("accessToken").asText();

        mockMvc.perform(get("/api/seeker/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.acceptingWork").value(true))
                .andExpect(jsonPath("$.preferredCategories").isArray());

        // Retrying registration with the same credentials recovers the account.
        mockMvc.perform(post("/api/auth/register/job-seeker")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Test Worker",
                                  "email": "%s",
                                  "password": "%s",
                                  "confirmPassword": "%s",
                                  "phoneNumber": "+9779800000001",
                                  "dateOfBirth": "1990-01-01",
                                  "address": "Kathmandu, Bagmati"
                                }
                                """.formatted(email, password, password)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userId").isNotEmpty())
                .andExpect(jsonPath("$.role").value("JOB_SEEKER"));
    }

    @Test
    void providerCanRegisterAndLogIn() throws Exception {
        String email = "provider-auth-flow@example.com";
        String password = "provider-password-123";

        mockMvc.perform(post("/api/auth/register/job-provider")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Test Provider",
                                  "email": "%s",
                                  "password": "%s",
                                  "confirmPassword": "%s",
                                  "phoneNumber": "+9779800000002",
                                  "dateOfBirth": "1990-01-01",
                                  "hasBusiness": false
                                }
                                """.formatted(email, password, password)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.role").value("JOB_PROVIDER"));

        mockMvc.perform(post("/api/auth/register/job-provider")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Test Provider",
                                  "email": "%s",
                                  "password": "%s",
                                  "confirmPassword": "%s",
                                  "phoneNumber": "+9779800000002",
                                  "dateOfBirth": "1990-01-01",
                                  "address": "Lalitpur, Bagmati",
                                  "hasBusiness": false
                                }
                                """.formatted(email, password, password)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.role").value("JOB_PROVIDER"));

        String token = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andReturn().getResponse().getContentAsString();
        String providerToken = objectMapper.readTree(token).get("accessToken").asText();
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/seeker/calendar")
                        .param("startDate", "2026-11-21")
                        .param("endDate", "2026-11-27")
                        .header("Authorization", "Bearer " + providerToken))
                .andExpect(status().isForbidden());

        String taskResponse = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/provider/jobs")
                        .header("Authorization", "Bearer " + providerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"Repair kitchen pipe",
                                  "category":"Plumbing",
                                  "description":"Repair a leaking kitchen pipe.",
                                  "responsibilities":"Inspect and repair the leak.",
                                  "address":"Kathmandu",
                                  "municipality":"Kathmandu Metropolitan City",
                                  "district":"Kathmandu",
                                  "province":"Bagmati",
                                  "startDate":"2026-11-22",
                                  "endDate":"2026-11-22",
                                  "startTime":"08:00:00",
                                  "endTime":"09:00:00",
                                  "durationDescription":"1 hour",
                                  "paymentAmount":null,
                                  "paymentMaxAmount":null,
                                  "budgetNegotiable":true,
                                  "paymentPeriod":"FIXED",
                                  "paymentMethod":"CASH",
                                  "requiredExperienceMonths":0,
                                  "numberOfWorkersRequired":1,
                                  "requiredSkillIds":[]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.budgetNegotiable").value(true))
                .andExpect(jsonPath("$.paymentAmount").value(nullValue()))
                .andExpect(jsonPath("$.applicationCount").value(0))
                .andReturn().getResponse().getContentAsString();
        long jobId = objectMapper.readTree(taskResponse).get("id").asLong();

        // Model a database that predates the latest JobPost fields, then verify
        // the startup SQL safely restores compatibility without losing job rows.
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            for (String column : new String[]{"category", "qualification_required", "latitude", "longitude", "payment_max_amount", "budget_negotiable", "payment_period"}) {
                statement.execute("ALTER TABLE job_posts DROP COLUMN " + column);
            }
        }
        new ResourceDatabasePopulator(new ClassPathResource("schema.sql")).execute(dataSource);

        mockMvc.perform(get("/api/jobs").param("keyword", "Repair kitchen pipe"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(jobId))
                .andExpect(jsonPath("$[0].paymentPeriod").value("PER_DAY"))
                .andExpect(jsonPath("$[0].applicationCount").value(0));
        // Restore the modern fixture values needed by the rest of this flow;
        // the preceding default assertions exercise the legacy migration.
        jdbcTemplate.update("UPDATE job_posts SET category = 'Plumbing', budget_negotiable = TRUE, payment_period = 'FIXED' WHERE id = ?", jobId);

        String workerEmail = "market-worker-" + UUID.randomUUID() + "@example.com";
        String workerRegistration = mockMvc.perform(post("/api/auth/register/job-seeker")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Marketplace Worker",
                                  "email":"%s",
                                  "password":"worker-password-123",
                                  "confirmPassword":"worker-password-123",
                                  "phoneNumber":"+9779800000400",
                                  "dateOfBirth":"1990-01-01",
                                  "address":"Kathmandu, Bagmati"
                                }
                                """.formatted(workerEmail)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String workerToken = objectMapper.readTree(workerRegistration).get("accessToken").asText();
        long workerUserId = objectMapper.readTree(workerRegistration).get("userId").asLong();
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/seeker/availability")
                        .header("Authorization", "Bearer " + workerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"dayOfWeek":"SUNDAY","startDate":"2026-11-22","endDate":"2026-11-29","startTime":"08:00:00","endTime":"09:00:00"}
                                """))
                .andExpect(status().isCreated());

        String workerServiceResponse = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/seeker/services")
                        .header("Authorization", "Bearer " + workerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"category":"Plumbing","title":"Pipe repair","description":"Leak repairs","skills":["Pipe fitting"],"pricingType":"PER_HOUR","price":600,"minimumDurationHours":1,"serviceArea":"Kathmandu","active":true,"negotiable":true}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long workerServiceId = objectMapper.readTree(workerServiceResponse).get("id").asLong();
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/seeker/availability")
                        .header("Authorization", "Bearer " + workerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"startDate":"2026-11-25","endDate":"2026-11-25","startTime":"10:00:00","endTime":"12:00:00","serviceListingId":%d}
                                """.formatted(workerServiceId)))
                .andExpect(status().isCreated());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/provider/workers/search")
                        .header("Authorization", "Bearer " + providerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.userId == " + workerUserId + ")].services[0].availability[0].startDate")
                        .value(org.hamcrest.Matchers.hasItem("2026-11-25")));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/provider/jobs/{jobId}/workers/{seekerUserId}/request", jobId, workerUserId)
                        .header("Authorization", "Bearer " + providerToken))
                .andExpect(status().isConflict());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/jobs/{jobId}/applications", jobId)
                        .header("Authorization", "Bearer " + workerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"applicantName":"Test Worker","applicantEmail":"not-an-email","applicantPhone":"+9779800000400","applicantLocation":"Kathmandu","skills":["Pipe fitting"],"experienceLevel":"Experienced","introduction":"I have experience with plumbing repair tasks."}
                                """))
                .andExpect(status().isBadRequest());

        String offerResponse = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/jobs/{jobId}/applications", jobId)
                        .header("Authorization", "Bearer " + workerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "offeredAmount":1800,
                                  "message":"I can inspect the leak and replace the damaged section.",
                                  "estimatedDurationHours":1,
                                  "proposedStartAt":"2026-11-22T08:00:00",
                                  "applicantName":"Test Worker",
                                  "applicantEmail":"worker-flow@example.com",
                                  "applicantPhone":"+9779800000400",
                                  "applicantLocation":"Kathmandu",
                                  "skills":["Pipe fitting","Repair"],
                                  "experienceLevel":"Experienced",
                                  "introduction":"I have hands-on plumbing repair experience and can complete this task safely."
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.offeredAmount").value(1800))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.applicantEmail").value("worker-flow@example.com"))
                .andExpect(jsonPath("$.skills[0]").value("Pipe fitting"))
                .andExpect(jsonPath("$.confirmationEmailSent").value(false))
                .andReturn().getResponse().getContentAsString();
        long applicationId = objectMapper.readTree(offerResponse).get("applicationId").asLong();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/jobs/{jobId}/applications", jobId)
                        .header("Authorization", "Bearer " + workerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isConflict());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/seeker/applications")
                        .header("Authorization", "Bearer " + workerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].applicationId").value(applicationId))
                .andExpect(jsonPath("$[0].jobId").value(jobId))
                .andExpect(jsonPath("$[0].applicantEmail").value("worker-flow@example.com"));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/provider/jobs/{jobId}/applications", jobId)
                        .header("Authorization", "Bearer " + providerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].offeredAmount").value(1800))
                .andExpect(jsonPath("$[0].offerMessage").value("I can inspect the leak and replace the damaged section."))
                .andExpect(jsonPath("$[0].applicantEmail").value("worker-flow@example.com"))
                .andExpect(jsonPath("$[0].applicationSkills[0]").value("Pipe fitting"))
                .andExpect(jsonPath("$[0].introduction").value("I have hands-on plumbing repair experience and can complete this task safely."));

        String engagementResponse = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/provider/jobs/{jobId}/applications/{applicationId}/select", jobId, applicationId)
                        .header("Authorization", "Bearer " + providerToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("AWAITING_RESPONSE"))
                .andReturn().getResponse().getContentAsString();
        long engagementId = objectMapper.readTree(engagementResponse).get("engagementId").asLong();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/seeker/engagements/{engagementId}/confirm", engagementId)
                        .header("Authorization", "Bearer " + workerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/seeker/calendar")
                        .param("startDate", "2026-11-22")
                        .param("endDate", "2026-11-22")
                        .header("Authorization", "Bearer " + workerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.status == 'OCCUPIED')].jobTitle")
                        .value(org.hamcrest.Matchers.hasItem("Repair kitchen pipe")));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/provider/jobs")
                        .header("Authorization", "Bearer " + providerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("ASSIGNED"));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/jobs/{jobId}", jobId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ASSIGNED"));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/provider/jobs/{jobId}/cancel", jobId)
                        .header("Authorization", "Bearer " + providerToken))
                .andExpect(status().isNoContent());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/seeker/engagements")
                        .header("Authorization", "Bearer " + workerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("CANCELLED"));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/seeker/calendar")
                        .param("startDate", "2026-11-22")
                        .param("endDate", "2026-11-22")
                        .header("Authorization", "Bearer " + workerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.status == 'OCCUPIED')].jobTitle").isEmpty());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void workerCanPersistAcceptingWorkPreference() throws Exception {
        String email = "availability-" + UUID.randomUUID() + "@example.com";
        String password = "worker-password-123";
        String registration = mockMvc.perform(post("/api/auth/register/job-seeker")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Availability Worker",
                                  "email": "%s",
                                  "password": "%s",
                                  "confirmPassword": "%s",
                                  "phoneNumber": "+9779800000091",
                                  "dateOfBirth": "1990-01-01",
                                  "address": "Kathmandu, Bagmati"
                                }
                                """.formatted(email, password, password)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String token = objectMapper.readTree(registration).get("accessToken").asText();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/seeker/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.acceptingWork").value(true));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/seeker/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Availability Worker",
                                  "phoneNumber": "+9779800000091",
                                  "address": "Kathmandu, Bagmati",
                                  "acceptingWork": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.acceptingWork").value(false));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/seeker/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.acceptingWork").value(false));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/seeker/calendar")
                        .param("startDate", "2026-11-21")
                        .param("endDate", "2026-11-27")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        String serviceResponse = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/seeker/services")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "category":"Plumbing",
                                  "title":"Pipe repair",
                                  "description":"Leak repair and tap fitting",
                                  "skills":["Leak repair","Tap replacement"],
                                  "pricingType":"PER_HOUR",
                                  "price":600,
                                  "minimumDurationHours":2,
                                  "serviceArea":"Kathmandu",
                                  "active":true
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Pipe repair"))
                .andExpect(jsonPath("$.price").value(600))
                .andReturn().getResponse().getContentAsString();
        long serviceId = objectMapper.readTree(serviceResponse).get("id").asLong();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/seeker/services")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"category":"Plumbing","title":"Pipe repair","description":"Leak repair and tap fitting","skills":["Leak repair","Tap replacement"],"pricingType":"PER_HOUR","price":600,"minimumDurationHours":2,"serviceArea":"Kathmandu","active":true}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(serviceId));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/seeker/services")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].skills[0]").value("Leak repair"));

        String availabilityResponse = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/seeker/availability")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"startDate":"2026-11-24","endDate":"2026-11-24","startTime":"10:00:00","endTime":"13:00:00","serviceListingId":%d}
                                """.formatted(serviceId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.serviceListingId").value(serviceId))
                .andReturn().getResponse().getContentAsString();
        long availabilityId = objectMapper.readTree(availabilityResponse).get("id").asLong();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/seeker/calendar")
                        .param("startDate", "2026-11-24")
                        .param("endDate", "2026-11-24")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.serviceTitle == 'Pipe repair')].serviceListingId")
                        .value(org.hamcrest.Matchers.hasItem((int) serviceId)))
                .andExpect(jsonPath("$[?(@.serviceTitle == 'Pipe repair')].availabilityId")
                        .value(org.hamcrest.Matchers.hasItem((int) availabilityId)));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/seeker/availability/{id}", availabilityId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/seeker/services")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(serviceId));
    }
}
