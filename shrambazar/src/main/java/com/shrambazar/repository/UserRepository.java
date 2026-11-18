package com.shrambazar.repository;

import com.shrambazar.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

import com.shrambazar.enums.UserRole;
import com.shrambazar.enums.AccountStatus;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    long countByRole(UserRole role);

    long countByRoleAndStatus(UserRole role, AccountStatus status);

    long countByStatus(AccountStatus status);
}
