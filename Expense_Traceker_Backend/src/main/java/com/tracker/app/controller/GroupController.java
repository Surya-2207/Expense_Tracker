package com.tracker.app.controller;

import com.tracker.app.entity.Group;
import com.tracker.app.entity.GroupExpense;
import com.tracker.app.repository.GroupExpenseRepository;
import com.tracker.app.repository.GroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/split/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupRepository groupRepository;
    private final GroupExpenseRepository groupExpenseRepository;

    private String currentUser() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    private String generateInviteCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        Random r = new Random();
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) sb.append(chars.charAt(r.nextInt(chars.length())));
        return sb.toString();
    }

    // ── GET all groups for current user ──────────────────────────────────────
    @GetMapping
    public List<Group> getMyGroups() {
        return groupRepository.findByMembersContaining(currentUser());
    }

    // ── POST create group ────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> createGroup(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String emoji = (String) body.getOrDefault("emoji", "🏖️");
        @SuppressWarnings("unchecked")
        List<String> memberUsernames = (List<String>) body.getOrDefault("memberUsernames", new ArrayList<>());

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Group name is required"));
        }

        String creator = currentUser();

        Group group = new Group();
        group.setName(name.trim());
        group.setEmoji(emoji);
        group.setCreatedBy(creator);

        // Ensure unique invite code
        String code;
        do { code = generateInviteCode(); } while (groupRepository.findByInviteCode(code).isPresent());
        group.setInviteCode(code);

        // Add creator + selected members (no duplicates)
        List<String> members = new ArrayList<>();
        members.add(creator);
        for (String m : memberUsernames) {
            if (!m.equals(creator) && !members.contains(m)) members.add(m);
        }
        group.setMembers(members);

        return ResponseEntity.ok(groupRepository.save(group));
    }

    // ── POST join group by invite code ───────────────────────────────────────
    @PostMapping("/join")
    public ResponseEntity<?> joinGroup(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Code is required"));
        }

        Group group = groupRepository.findByInviteCode(code.trim().toUpperCase())
                .orElse(null);
        if (group == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid invite code"));
        }

        String user = currentUser();
        if (!group.getMembers().contains(user)) {
            group.getMembers().add(user);
            groupRepository.save(group);
        }

        return ResponseEntity.ok(group);
    }

    // ── GET expenses for a group ─────────────────────────────────────────────
    @GetMapping("/{id}/expenses")
    public ResponseEntity<?> getGroupExpenses(@PathVariable Long id) {
        Group group = groupRepository.findById(id)
                .orElse(null);
        if (group == null) return ResponseEntity.notFound().build();

        if (!group.getMembers().contains(currentUser())) {
            return ResponseEntity.status(403).body(Map.of("message", "Not a member"));
        }

        return ResponseEntity.ok(groupExpenseRepository.findByGroupOrderByCreatedAtDesc(group));
    }

    // ── POST add expense to group ────────────────────────────────────────────
    @PostMapping("/{id}/expenses")
    public ResponseEntity<?> addGroupExpense(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        Group group = groupRepository.findById(id).orElse(null);
        if (group == null) return ResponseEntity.notFound().build();

        if (!group.getMembers().contains(currentUser())) {
            return ResponseEntity.status(403).body(Map.of("message", "Not a member"));
        }

        String description = (String) body.get("description");
        double amount = Double.parseDouble(body.get("amount").toString());
        String paidBy = (String) body.getOrDefault("paidBy", currentUser());

        if (description == null || description.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Description required"));
        }

        GroupExpense expense = new GroupExpense();
        expense.setDescription(description.trim());
        expense.setAmount(amount);
        expense.setPaidBy(paidBy);
        expense.setGroup(group);

        return ResponseEntity.ok(groupExpenseRepository.save(expense));
    }
}