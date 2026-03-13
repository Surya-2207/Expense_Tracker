package com.tracker.app.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "settlements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fromUsername;   // debtor — who owes / requested settle
    private String toUsername;     // creditor — who paid / must approve
    private double amount;
    private Long   groupId;
    private String groupName;
    private Long   expenseId;      // which specific expense this settlement is for

    @Enumerated(EnumType.STRING)
    private SettlementStatus status = SettlementStatus.PENDING;

    private LocalDateTime settledAt    = LocalDateTime.now();
    private LocalDateTime respondedAt;

    public enum SettlementStatus {
        PENDING, APPROVED, REJECTED
    }
}