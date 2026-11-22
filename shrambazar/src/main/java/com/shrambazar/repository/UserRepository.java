package com.shrambazar.repository;

import com.shrambazar.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

import com.shrambazar.enums.UserRole;
import com.shrambazar.enums.AccountStatus;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("select count(u) from User u where u.role = :role")
    long countByRole(@Param("role") UserRole role);

    @Query("select count(u) from User u where u.role = :role and u.status = :status")
    long countByRoleAndStatus(@Param("role") UserRole role, @Param("status") AccountStatus status);

    @Query("select count(u) from User u where u.status = :status")
    long countByStatus(@Param("status") AccountStatus status);
}
