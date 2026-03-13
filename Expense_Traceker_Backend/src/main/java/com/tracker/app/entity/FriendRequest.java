package com.tracker.app.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "friend_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class FriendRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fromUsername;

    @Column(nullable = false)
    private String toUsername;

    @Column(nullable = false)
    private String status = "PENDING";  // PENDING | ACCEPTED | REJECTED
}