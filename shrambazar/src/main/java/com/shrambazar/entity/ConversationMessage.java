package com.shrambazar.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;
import java.time.LocalDateTime;

@Entity
@Table(name="conversation_messages", indexes=@Index(name="idx_message_conversation_created", columnList="conversation_id, created_at"))
public class ConversationMessage {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="conversation_id", nullable=false) private Conversation conversation;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="sender_id", nullable=false) private User sender;
    @Column(nullable=false, length=4000) private String content;
    @Column(name="message_type", nullable=false, length=12) @ColumnDefault("'USER'") private String messageType="USER";
    @Column(nullable=false, updatable=false) private LocalDateTime createdAt;
    private LocalDateTime readAt;
    @PrePersist void create(){createdAt=LocalDateTime.now();}
    public Long getId(){return id;} public Conversation getConversation(){return conversation;} public void setConversation(Conversation v){conversation=v;}
    public User getSender(){return sender;} public void setSender(User v){sender=v;} public String getContent(){return content;} public void setContent(String v){content=v;}
    public String getMessageType(){return messageType;} public void setMessageType(String v){messageType=v;}
    public LocalDateTime getCreatedAt(){return createdAt;} public LocalDateTime getReadAt(){return readAt;} public void setReadAt(LocalDateTime v){readAt=v;}
}
