package com.tracker.app.controller;

import com.tracker.app.entity.Expense;
import com.tracker.app.entity.User;
import com.tracker.app.repository.ExpenseRepository;
import com.tracker.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;

    private User getLoggedInUser() {
        String username = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();
        return userRepository
                .findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public List<Expense> getAllExpenses() {
        User user = getLoggedInUser();
        return expenseRepository.findByUser(user);
    }

    @PostMapping
    public Expense addExpense(@RequestBody Expense expense) {
        User user = getLoggedInUser();
        expense.setUser(user);
        return expenseRepository.save(expense);
    }

    // ✅ ADDED: Update expense
    @PutMapping("/{id}")
    public Expense updateExpense(@PathVariable Long id, @RequestBody Expense updated) {
        User user = getLoggedInUser();
        Expense expense = expenseRepository
                .findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found"));

        if (!expense.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You cannot edit this expense");
        }

        expense.setTitle(updated.getTitle());
        expense.setAmount(updated.getAmount());
        expense.setCategory(updated.getCategory());
        expense.setDate(updated.getDate());

        return expenseRepository.save(expense);
    }

    @DeleteMapping("/{id}")
    public String deleteExpense(@PathVariable Long id) {
        User user = getLoggedInUser();
        Expense expense = expenseRepository
                .findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found"));

        if (!expense.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You cannot delete this expense");
        }

        expenseRepository.delete(expense);
        return "Deleted Successfully";
    }
}   