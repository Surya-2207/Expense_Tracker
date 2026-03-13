package com.tracker.app.repository;

import com.tracker.app.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    // For friend search — case-insensitive partial match
    List<User> findByUsernameContainingIgnoreCase(String username);
}