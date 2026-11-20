package com.shrambazar.controller.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void workerCanRegisterAndLogIn() throws Exception {
        String email = "worker-auth-flow@example.com";
        String password = "worker-password-123";

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
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.role").value("JOB_SEEKER"));

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
                                  "address": "Lalitpur, Bagmati",
                                  "hasBusiness": false
                                }
                                """.formatted(email, password, password)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.role").value("JOB_PROVIDER"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.email").value(email));
    }
}
