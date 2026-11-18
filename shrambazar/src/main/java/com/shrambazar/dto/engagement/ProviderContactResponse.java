package com.shrambazar.dto.engagement;

public record ProviderContactResponse(
        String providerName,
        String phoneNumber,
        String businessName,
        String businessLocation
) {
}