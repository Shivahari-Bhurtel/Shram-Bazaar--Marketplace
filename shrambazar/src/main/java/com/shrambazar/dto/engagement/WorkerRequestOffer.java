package com.shrambazar.dto.engagement;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record WorkerRequestOffer(
        @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal agreedAmount,
        @Size(max = 1200) String message
) {}
