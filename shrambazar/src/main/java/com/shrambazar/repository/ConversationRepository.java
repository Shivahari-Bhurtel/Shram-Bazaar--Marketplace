package com.shrambazar.repository;
import com.shrambazar.entity.Conversation;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface ConversationRepository extends JpaRepository<Conversation,Long> {
 @Query("select c from Conversation c left join fetch c.jobPost left join fetch c.application where c.seekerProfile.user.id=:uid or c.providerProfile.user.id=:uid order by c.updatedAt desc") List<Conversation> findMine(@Param("uid") Long uid);
 @Query("select distinct c from Conversation c left join fetch c.jobPost left join fetch c.application where c.id=:id and (c.seekerProfile.user.id=:uid or c.providerProfile.user.id=:uid)") Optional<Conversation> findMineById(@Param("id") Long id,@Param("uid") Long uid);
 Optional<Conversation> findByJobPostIdAndSeekerProfileIdAndProviderProfileId(Long jobId,Long seekerId,Long providerId);
 Optional<Conversation> findByApplicationId(Long applicationId);
 Optional<Conversation> findFirstBySeekerProfileIdAndProviderProfileIdOrderByUpdatedAtDesc(Long seekerId,Long providerId);
}
