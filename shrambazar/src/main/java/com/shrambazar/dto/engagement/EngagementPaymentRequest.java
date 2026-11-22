package com.shrambazar.dto.engagement;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.math.BigDecimal;

public record EngagementPaymentRequest(
        @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @NotBlank @Pattern(regexp = "CASH|ESEWA|KHALTI|BANK_TRANSFER|OTHER") String method,
        @NotNull @PastOrPresent LocalDate paymentDate,
        @Size(max = 120) String transactionReference,
        @Size(max = 1000) String note
) {}
