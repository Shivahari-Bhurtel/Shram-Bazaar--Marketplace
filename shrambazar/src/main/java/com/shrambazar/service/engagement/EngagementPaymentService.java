package com.shrambazar.service.engagement;

import com.shrambazar.dto.engagement.EngagementPaymentRequest;
import com.shrambazar.dto.engagement.EngagementPaymentResponse;
import com.shrambazar.entity.EngagementPayment;
import com.shrambazar.entity.WorkerEngagement;
import com.shrambazar.enums.EngagementStatus;
import com.shrambazar.enums.NotificationType;
import com.shrambazar.repository.EngagementPaymentRepository;
import com.shrambazar.repository.WorkerEngagementRepository;
import com.shrambazar.service.CurrentUserService;
import com.shrambazar.service.notification.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
public class EngagementPaymentService {
    private final EngagementPaymentRepository paymentRepository;
    private final WorkerEngagementRepository engagementRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    public EngagementPaymentService(EngagementPaymentRepository paymentRepository,
                                    WorkerEngagementRepository engagementRepository,
                                    CurrentUserService currentUserService,
                                    NotificationService notificationService) {
        this.paymentRepository = paymentRepository;
        this.engagementRepository = engagementRepository;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<EngagementPaymentResponse> getProviderPayments() {
        Long providerId = currentUserService.getCurrentProviderProfile().getId();
        return paymentRepository.findByEngagementApplicationJobPostProviderProfileIdOrderByPaymentDateDesc(providerId)
                .stream().map(this::map).toList();
    }

    @Transactional(readOnly = true)
    public List<EngagementPaymentResponse> getWorkerPayments() {
        Long seekerId = currentUserService.getCurrentSeekerProfile().getId();
        return paymentRepository.findByEngagementApplicationSeekerProfileIdOrderByPaymentDateDesc(seekerId)
                .stream().map(this::map).toList();
    }

    @Transactional
    public EngagementPaymentResponse recordPayment(Long engagementId, EngagementPaymentRequest request) {
        Long providerId = currentUserService.getCurrentProviderProfile().getId();
        WorkerEngagement engagement = engagementRepository.findForProviderForUpdate(engagementId, providerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hiring record not found"));
        if (engagement.getStatus() != EngagementStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payment can be recorded only after both sides confirm completion");
        }
        EngagementPayment payment = paymentRepository.findByEngagementId(engagementId).orElseGet(EngagementPayment::new);
        if ("PAID".equals(payment.getStatus())) throw new ResponseStatusException(HttpStatus.CONFLICT, "This payment is already recorded as paid");
        BigDecimal agreedAmount = engagement.getApplication().getOfferedAmount();
        if (agreedAmount == null) agreedAmount = engagement.getApplication().getJobPost().getPaymentAmount();
        if (agreedAmount == null || agreedAmount.compareTo(request.amount()) != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment amount must match the agreed amount");
        }
        payment.setEngagement(engagement);
        payment.setAmount(agreedAmount);
        payment.setMethod(request.method());
        payment.setPaymentDate(request.paymentDate());
        payment.setTransactionReference(request.transactionReference());
        payment.setNote(request.note());
        payment.setStatus("PAID");
        EngagementPayment saved = paymentRepository.save(payment);
        notificationService.createNotification(
                engagement.getApplication().getSeekerProfile().getUser(),
                NotificationType.PAYMENT_RECORDED,
                "Payment marked as paid",
                "Your provider marked NPR " + agreedAmount.stripTrailingZeros().toPlainString() + " for “" + engagement.getApplication().getJobPost().getTitle() + "” as paid.",
                "ENGAGEMENT",
                engagement.getId()
        );
        return map(saved);
    }

    private EngagementPaymentResponse map(EngagementPayment payment) {
        var application = payment.getEngagement().getApplication();
        return new EngagementPaymentResponse(payment.getId(), payment.getEngagement().getId(),
                application.getSeekerProfile().getUser().getFullName(), application.getJobPost().getTitle(),
                payment.getAmount(), payment.getMethod(), payment.getPaymentDate(),
                payment.getTransactionReference(), payment.getNote(), payment.getStatus());
    }
}
