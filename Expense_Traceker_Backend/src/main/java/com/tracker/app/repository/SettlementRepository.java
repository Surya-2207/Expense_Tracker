package com.tracker.app.repository;

import com.tracker.app.entity.Settlement;
import com.tracker.app.entity.Settlement.SettlementStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    // Pending approvals waiting for creditor
    List<Settlement> findByToUsernameAndStatus(String toUsername, SettlementStatus status);

    // All settlements for a group (for display)
    List<Settlement> findByGroupId(Long groupId);

    // Check if pending request already exists for this debtor+expense
    Optional<Settlement> findByFromUsernameAndExpenseIdAndStatus(
            String fromUsername, Long expenseId, SettlementStatus status);
}