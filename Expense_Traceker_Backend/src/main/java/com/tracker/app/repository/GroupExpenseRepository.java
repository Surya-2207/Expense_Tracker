package com.tracker.app.repository;

import com.tracker.app.entity.GroupExpense;
import com.tracker.app.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupExpenseRepository extends JpaRepository<GroupExpense, Long> {

    // All expenses including settlements (for display in group feed)
    List<GroupExpense> findByGroupOrderByCreatedAtDesc(Group group);

    // Only real expenses, excludes settlements (for balance calculation)
    List<GroupExpense> findByGroupAndIsSettlementFalseOrderByCreatedAtDesc(Group group);
}