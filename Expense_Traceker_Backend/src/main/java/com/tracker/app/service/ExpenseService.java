package com.tracker.app.service;

import com.tracker.app.entity.Expense;
import com.tracker.app.repository.ExpenseRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ExpenseService {

    private final ExpenseRepository repo;

    public ExpenseService(ExpenseRepository repo){
        this.repo = repo;
    }

    public List<Expense> getAllExpenses(){
        return repo.findAll();
    }

    public Expense addExpense(Expense expense){
        return repo.save(expense);
    }

    public void deleteExpense(Long id){
        repo.deleteById(id);
    }

    public Expense updateExpense(Long id,Expense expense){
        Expense existing = repo.findById(id).orElseThrow(() -> new RuntimeException("Expense not found: " + id));
        existing.setAmount(expense.getAmount());
        existing.setCategory(expense.getCategory());
        existing.setDate(expense.getDate());
        existing.setTitle(expense.getTitle());
        return repo.save(existing);
    }
}
