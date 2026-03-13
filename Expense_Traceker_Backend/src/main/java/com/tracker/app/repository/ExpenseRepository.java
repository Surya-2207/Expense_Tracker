package com.tracker.app.repository;

import com.tracker.app.entity.Expense;
import com.tracker.app.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByUser(User user);
}