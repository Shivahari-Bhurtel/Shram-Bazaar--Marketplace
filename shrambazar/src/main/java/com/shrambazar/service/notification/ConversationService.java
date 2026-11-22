package com.shrambazar.service.notification;

import com.shrambazar.dto.notification.ConversationDtos.*;
import com.shrambazar.entity.*;
import com.shrambazar.enums.NotificationType;
import com.shrambazar.repository.*;
import com.shrambazar.service.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class ConversationService {
 private final ConversationRepository conversations; private final ConversationMessageRepository messages; private final ApplicationRepository applications; private final CurrentUserService current; private final NotificationService notifications;
 public ConversationService(ConversationRepository c, ConversationMessageRepository m, ApplicationRepository a, CurrentUserService u, NotificationService n){conversations=c;messages=m;applications=a;current=u;notifications=n;}
 @Transactional(readOnly=true) public List<ConversationResponse> list(){ User user=current.getCurrentUser(); return conversations.findMine(user.getId()).stream().map(c->map(c,user.getId())).toList(); }
 @Transactional public ConversationResponse open(Long applicationId){
  if(applicationId==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"An application is required to start a conversation");
  Application a=applications.findById(applicationId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Application not found")); User user=current.getCurrentUser();
  boolean worker=a.getSeekerProfile().getUser().getId().equals(user.getId()); boolean provider=a.getJobPost().getProviderProfile().getUser().getId().equals(user.getId());
  if(!worker&&!provider) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Application not found");
  Conversation c=conversations.findByApplicationId(applicationId).orElseGet(()->conversations.findByJobPostIdAndSeekerProfileIdAndProviderProfileId(a.getJobPost().getId(),a.getSeekerProfile().getId(),a.getJobPost().getProviderProfile().getId()).orElseGet(()->{Conversation value=new Conversation(); value.setApplication(a); value.setJobPost(a.getJobPost()); value.setSeekerProfile(a.getSeekerProfile()); value.setProviderProfile(a.getJobPost().getProviderProfile()); return conversations.save(value);}));
  return map(c,user.getId());
 }
 @Transactional(readOnly=true) public ThreadResponse thread(Long id){User user=current.getCurrentUser(); Conversation c=owned(id,user.getId()); var list=messages.findThread(id).stream().map(this::mapMessage).toList(); return new ThreadResponse(map(c,user.getId()),list);}
 @Transactional public MessageResponse send(Long id,String text){User user=current.getCurrentUser(); Conversation c=owned(id,user.getId()); String content=text==null?"":text.trim(); if(content.isEmpty())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Message cannot be empty"); if(content.length()>4000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Message is too long"); ConversationMessage m=new ConversationMessage();m.setConversation(c);m.setSender(user);m.setContent(content);m=messages.save(m);c.touch(); User recipient=c.getSeekerProfile().getUser().getId().equals(user.getId())?c.getProviderProfile().getUser():c.getSeekerProfile().getUser(); String preview=content.length()>180?content.substring(0,177)+"...":content; notifications.createNotification(recipient,NotificationType.MESSAGE,"Message from "+user.getFullName(),preview,"CONVERSATION",c.getId());return mapMessage(m);}
 @Transactional public void markRead(Long id){User user=current.getCurrentUser();owned(id,user.getId());messages.markRead(id,user.getId(),LocalDateTime.now());}
 @Transactional(readOnly=true) public UnreadResponse unread(){return new UnreadResponse(messages.countUnread(current.getCurrentUser().getId()));}
 private Conversation owned(Long id,Long uid){return conversations.findMineById(id,uid).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Conversation not found"));}
 private ConversationResponse map(Conversation c,Long uid){List<ConversationMessage> all=messages.findThread(c.getId()); ConversationMessage last=all.isEmpty()?null:all.get(all.size()-1);long unread=all.stream().filter(m->!m.getSender().getId().equals(uid)&&m.getReadAt()==null).count();return new ConversationResponse(c.getId(),c.getSeekerProfile().getUser().getId(),c.getSeekerProfile().getUser().getFullName(),c.getProviderProfile().getUser().getId(),c.getProviderProfile().getBusinessName()==null?c.getProviderProfile().getUser().getFullName():c.getProviderProfile().getBusinessName(),c.getJobPost()==null?null:c.getJobPost().getId(),c.getJobPost()==null?null:c.getJobPost().getTitle(),c.getApplication()==null?null:c.getApplication().getId(),c.getStatus(),c.getCreatedAt(),c.getUpdatedAt(),unread,last==null?null:mapMessage(last));}
 private MessageResponse mapMessage(ConversationMessage m){return new MessageResponse(m.getId(),m.getSender().getId(),m.getSender().getFullName(),m.getContent(),m.getCreatedAt(),m.getReadAt());}
}
