package com.shrambazar.controller.engagement;

import com.shrambazar.dto.engagement.EngagementPaymentRequest;
import com.shrambazar.dto.engagement.EngagementPaymentResponse;
import com.shrambazar.service.engagement.EngagementPaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
public class EngagementPaymentController {
    private final EngagementPaymentService paymentService;
    public EngagementPaymentController(EngagementPaymentService paymentService) { this.paymentService = paymentService; }

    @GetMapping("/provider/engagement-payments")
    public ResponseEntity<List<EngagementPaymentResponse>> getPayments() {
        return ResponseEntity.ok(paymentService.getProviderPayments());
    }

    @GetMapping("/seeker/engagement-payments")
    public ResponseEntity<List<EngagementPaymentResponse>> getWorkerPayments() {
        return ResponseEntity.ok(paymentService.getWorkerPayments());
    }

    @PostMapping("/provider/engagements/{engagementId}/payment")
    public ResponseEntity<EngagementPaymentResponse> recordPayment(@PathVariable Long engagementId,
                                                                   @Valid @RequestBody EngagementPaymentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentService.recordPayment(engagementId, request));
    }
}
