
package com.shrambazar.dto.dashboard;

import com.shrambazar.enums.JobPostStatus;
import com.shrambazar.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class ProviderDashboardResponse {

    private long totalJobPosts;
    private long activeJobPosts;

    private List<JobPostSummaryResponse> activeJobPostList;
    private List<JobPostSummaryResponse> recentJobPosts;

    public ProviderDashboardResponse(
            long totalJobPosts,
            long activeJobPosts,
            List<JobPostSummaryResponse> activeJobPostList,
            List<JobPostSummaryResponse> recentJobPosts
    ) {
        this.totalJobPosts = totalJobPosts;
        this.activeJobPosts = activeJobPosts;
        this.activeJobPostList = activeJobPostList;
        this.recentJobPosts = recentJobPosts;
    }

    public long getTotalJobPosts() {
        return totalJobPosts;
    }

    public long getActiveJobPosts() {
        return activeJobPosts;
    }

    public List<JobPostSummaryResponse> getActiveJobPostList() {
        return activeJobPostList;
    }

    public List<JobPostSummaryResponse> getRecentJobPosts() {
        return recentJobPosts;
    }

    public static class JobPostSummaryResponse {

        private Long jobId;
        private String title;

        private String address;
        private String municipality;
        private String district;
        private String province;

        private BigDecimal paymentAmount;
        private PaymentMethod paymentMethod;

        private Integer numberOfWorkersRequired;

        private JobPostStatus status;

        private LocalDateTime createdAt;

        public JobPostSummaryResponse(
                Long jobId,
                String title,
                String address,
                String municipality,
                String district,
                String province,
                BigDecimal paymentAmount,
                PaymentMethod paymentMethod,
                Integer numberOfWorkersRequired,
                JobPostStatus status,
                LocalDateTime createdAt
        ) {
            this.jobId = jobId;
            this.title = title;
            this.address = address;
            this.municipality = municipality;
            this.district = district;
            this.province = province;
            this.paymentAmount = paymentAmount;
            this.paymentMethod = paymentMethod;
            this.numberOfWorkersRequired = numberOfWorkersRequired;
            this.status = status;
            this.createdAt = createdAt;
        }

        public Long getJobId() {
            return jobId;
        }

        public String getTitle() {
            return title;
        }

        public String getAddress() {
            return address;
        }

        public String getMunicipality() {
            return municipality;
        }

        public String getDistrict() {
            return district;
        }

        public String getProvince() {
            return province;
        }

        public BigDecimal getPaymentAmount() {
            return paymentAmount;
        }

        public PaymentMethod getPaymentMethod() {
            return paymentMethod;
        }

        public Integer getNumberOfWorkersRequired() {
            return numberOfWorkersRequired;
        }

        public JobPostStatus getStatus() {
            return status;
        }

        public LocalDateTime getCreatedAt() {
            return createdAt;
        }
    }
}
