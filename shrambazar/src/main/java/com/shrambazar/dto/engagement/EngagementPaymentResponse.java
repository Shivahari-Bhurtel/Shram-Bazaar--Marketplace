package com.shrambazar.dto.engagement;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EngagementPaymentResponse(
        Long id,
        Long engagementId,
        String workerName,
        String workTitle,
        BigDecimal amount,
        String method,
        LocalDate paymentDate,
        String transactionReference,
        String note
) {}
