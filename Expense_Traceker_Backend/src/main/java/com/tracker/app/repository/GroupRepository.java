package com.tracker.app.repository;

import com.tracker.app.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GroupRepository extends JpaRepository<Group, Long> {

    Optional<Group> findByInviteCode(String inviteCode);

    // Find all groups where username is in the members list
    @Query("SELECT g FROM Group g JOIN g.members m WHERE m = :username")
    List<Group> findByMembersContaining(@Param("username") String username);
}