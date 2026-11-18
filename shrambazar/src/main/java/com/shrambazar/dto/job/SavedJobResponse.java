
package com.shrambazar.dto.job;

import com.shrambazar.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record SavedJobResponse(

        Long savedJobId,
        Long jobId,
        String title,
        String address,
        String district,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal paymentAmount,
        PaymentMethod paymentMethod,
        LocalDateTime savedAt

) {
}
