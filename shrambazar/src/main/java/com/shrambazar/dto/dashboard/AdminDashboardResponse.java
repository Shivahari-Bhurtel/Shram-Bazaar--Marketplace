package com.shrambazar.dto.dashboard;

public record AdminDashboardResponse(
        long totalWorkers,
        long totalProviders,
        long verifiedWorkers,
        long verifiedProviders,
        long pendingKycRequests,
        long activeJobListings,
        long totalApplications,
        long successfulHiring,
        long openComplaints,
        long suspendedAccounts
) {
}