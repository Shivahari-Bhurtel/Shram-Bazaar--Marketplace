package com.shrambazar.dto.notification;
import java.time.LocalDateTime;
import java.util.List;
public final class ConversationDtos {
 private ConversationDtos() {}
 public record OpenRequest(Long applicationId) {}
 public record SendRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=4000) String content) {}
 public record MessageResponse(Long id, Long senderId, String senderName, String content, LocalDateTime createdAt, LocalDateTime readAt) {}
 public record ConversationResponse(Long id, Long workerId, String workerName, Long providerId, String providerName, Long jobId, String jobTitle, Long applicationId, String status, LocalDateTime createdAt, LocalDateTime updatedAt, long unreadCount, MessageResponse lastMessage) {}
 public record ThreadResponse(ConversationResponse conversation, List<MessageResponse> messages) {}
 public record UnreadResponse(long count) {}
}
