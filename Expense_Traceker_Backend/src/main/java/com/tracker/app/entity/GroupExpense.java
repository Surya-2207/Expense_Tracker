package com.tracker.app.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "group_expenses")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class GroupExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private double amount;

    @Column(nullable = false)
    private String paidBy;   // username

    // ── true for settlements — excluded from balance calculations ──
    @Column(nullable = false)
    private boolean isSettlement = false;

    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    @JsonIgnoreProperties({"expenses", "members", "hibernateLazyInitializer"})
    private Group group;
}