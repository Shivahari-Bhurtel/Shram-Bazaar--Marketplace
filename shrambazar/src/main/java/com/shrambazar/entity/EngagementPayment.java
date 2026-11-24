package com.shrambazar.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "engagement_payments", uniqueConstraints = @UniqueConstraint(columnNames = "engagement_id"))
public class EngagementPayment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "engagement_id", nullable = false, unique = true)
    private WorkerEngagement engagement;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 24)
    private String method;

    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    @Column(name = "transaction_reference", length = 120)
    private String transactionReference;

    @Column(length = 1000)
    private String note;

    @Column(name = "payment_status", nullable = false, length = 16)
    @ColumnDefault("'PAID'")
    private String status = "UNPAID";

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public WorkerEngagement getEngagement() { return engagement; }
    public void setEngagement(WorkerEngagement engagement) { this.engagement = engagement; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }
    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }
    public String getTransactionReference() { return transactionReference; }
    public void setTransactionReference(String transactionReference) { this.transactionReference = transactionReference; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
