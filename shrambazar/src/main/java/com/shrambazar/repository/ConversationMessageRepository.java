package com.shrambazar.repository;
import com.shrambazar.entity.ConversationMessage;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.*;
public interface ConversationMessageRepository extends JpaRepository<ConversationMessage,Long> {
 @Query("select m from ConversationMessage m join fetch m.sender where m.conversation.id=:id order by m.createdAt asc") List<ConversationMessage> findThread(@Param("id") Long id);
 @Query("select count(m) from ConversationMessage m where m.conversation.id in (select c.id from Conversation c where c.seekerProfile.user.id=:uid or c.providerProfile.user.id=:uid) and m.sender.id<>:uid and m.readAt is null") long countUnread(@Param("uid") Long uid);
 @Modifying @Query("update ConversationMessage m set m.readAt=:now where m.conversation.id=:cid and m.sender.id<>:uid and m.readAt is null") int markRead(@Param("cid") Long cid,@Param("uid") Long uid,@Param("now") LocalDateTime now);
}
