package com.tracker.app.repository;

import com.tracker.app.entity.FriendRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

    // Incoming pending requests for a user
    List<FriendRequest> findByToUsernameAndStatus(String toUsername, String status);

    // Check if friendship already exists in either direction
    @Query("""
        SELECT f FROM FriendRequest f
        WHERE f.status = 'ACCEPTED'
        AND ((f.fromUsername = :a AND f.toUsername = :b)
          OR (f.fromUsername = :b AND f.toUsername = :a))
    """)
    Optional<FriendRequest> findAcceptedFriendship(@Param("a") String a, @Param("b") String b);

    // All accepted friends for a user (either direction)
    @Query("""
        SELECT f FROM FriendRequest f
        WHERE f.status = 'ACCEPTED'
        AND (f.fromUsername = :username OR f.toUsername = :username)
    """)
    List<FriendRequest> findAllFriends(@Param("username") String username);

    // Check duplicate pending request
    Optional<FriendRequest> findByFromUsernameAndToUsernameAndStatus(
            String fromUsername, String toUsername, String status);
}