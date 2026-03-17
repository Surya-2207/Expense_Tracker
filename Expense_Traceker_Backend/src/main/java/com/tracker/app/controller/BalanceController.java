package com.tracker.app.controller;

import com.tracker.app.entity.Group;
import com.tracker.app.entity.GroupExpense;
import com.tracker.app.entity.Settlement;
import com.tracker.app.entity.Settlement.SettlementStatus;
import com.tracker.app.repository.GroupExpenseRepository;
import com.tracker.app.repository.GroupRepository;
import com.tracker.app.repository.SettlementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/split/balances")
@RequiredArgsConstructor
public class BalanceController {

    private final GroupRepository           groupRepository;
    private final GroupExpenseRepository    groupExpenseRepository;
    private final SettlementRepository      settlementRepository;

    private String currentUser() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @GetMapping("/settlements/{groupId}")
    public ResponseEntity<?> getGroupSettlements(@PathVariable Long groupId) {
        return ResponseEntity.ok(settlementRepository.findByGroupId(groupId));
    }

    @GetMapping("/pending-approvals")
    public ResponseEntity<?> getPendingApprovals() {
        String me = currentUser();
        return ResponseEntity.ok(
                settlementRepository.findByToUsernameAndStatus(me, SettlementStatus.PENDING)
        );
    }


    // GET raw totals for donut
    @GetMapping("/summary")
    public ResponseEntity<?> getSummary(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        String me = currentUser();
        List<Group> myGroups = groupRepository.findByMembersContaining(me);
        double owedToMe = 0; double iOwe = 0;
        for (Group group : myGroups) {
            List<GroupExpense> expenses = groupExpenseRepository.findByGroupAndIsSettlementFalseOrderByCreatedAtDesc(group);
            if (month != null && year != null) {
                expenses = expenses.stream().filter(e -> e.getCreatedAt() != null && e.getCreatedAt().getMonthValue() == month && e.getCreatedAt().getYear() == year).collect(Collectors.toList());
            }
            int memberCount = group.getMembers().size();
            if (memberCount == 0) continue;
            for (GroupExpense exp : expenses) {
                double share = exp.getAmount() / memberCount;
                if (exp.getPaidBy().equals(me)) { owedToMe += exp.getAmount() - share; }
                else if (group.getMembers().contains(me)) { iOwe += share; }
            }
        }
        return ResponseEntity.ok(Map.of("owedToMe", owedToMe, "iOwe", iOwe));
    }
    @GetMapping
    public ResponseEntity<?> getBalances(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {

        String me = currentUser();
        List<Group> myGroups = groupRepository.findByMembersContaining(me);
        Map<String, BalanceEntry> balanceMap = new LinkedHashMap<>();

        for (Group group : myGroups) {
            List<GroupExpense> expenses =
                    groupExpenseRepository.findByGroupAndIsSettlementFalseOrderByCreatedAtDesc(group);

            // Filter expenses by month/year if provided
            if (month != null && year != null) {
                expenses = expenses.stream()
                        .filter(e -> e.getCreatedAt() != null
                                && e.getCreatedAt().getMonthValue() == month
                                && e.getCreatedAt().getYear() == year)
                        .collect(Collectors.toList());
            }

            List<String> members = group.getMembers();
            if (members.isEmpty()) continue;

            Map<String, Double> memberBalance = new HashMap<>();
            for (String m : members) memberBalance.put(m, 0.0);

            for (GroupExpense exp : expenses) {
                double share = exp.getAmount() / members.size();
                for (String m : members) {
                    if (m.equals(exp.getPaidBy()))
                        memberBalance.merge(m,  exp.getAmount() - share, Double::sum);
                    else
                        memberBalance.merge(m, -share, Double::sum);
                }
            }

            // Deduct APPROVED settlements — also filtered by month/year if provided
            List<Settlement> approvedSettlements = settlementRepository
                    .findByGroupId(group.getId()).stream()
                    .filter(s -> s.getStatus() == SettlementStatus.APPROVED)
                    .collect(Collectors.toList());

            if (month != null && year != null) {
                approvedSettlements = approvedSettlements.stream()
                        .filter(s -> s.getRespondedAt() != null
                                && s.getRespondedAt().getMonthValue() == month
                                && s.getRespondedAt().getYear() == year)
                        .collect(Collectors.toList());
            }

            approvedSettlements.forEach(s -> {
                memberBalance.merge(s.getFromUsername(),  s.getAmount(), Double::sum);
                memberBalance.merge(s.getToUsername(),   -s.getAmount(), Double::sum);
            });

            // Simplify debts
            Map<String, Double> bal = new HashMap<>(memberBalance);
            List<String> creditors  = new ArrayList<>();
            List<String> debtors    = new ArrayList<>();
            for (String m : members) {
                if (bal.getOrDefault(m, 0.0) >  0.001) creditors.add(m);
                if (bal.getOrDefault(m, 0.0) < -0.001) debtors.add(m);
            }

            for (String debtor : debtors) {
                double owes = -bal.getOrDefault(debtor, 0.0);
                for (String creditor : creditors) {
                    double owed = bal.getOrDefault(creditor, 0.0);
                    if (owed <= 0.001 || owes <= 0.001) continue;
                    double amount = Math.min(owes, owed);
                    String key = debtor + "::" + creditor + "::" + group.getId();
                    BalanceEntry entry = balanceMap.getOrDefault(key,
                            new BalanceEntry(UUID.randomUUID().toString(), debtor, creditor,
                                    group.getId(), group.getName(), 0.0, false, null));
                    entry.amount += amount;
                    Optional<Settlement> pending = settlementRepository
                            .findByToUsernameAndStatus(creditor, SettlementStatus.PENDING)
                            .stream().filter(s -> s.getFromUsername().equals(debtor)
                                    && s.getGroupId().equals(group.getId()))
                            .findFirst();
                    entry.settlementPending = pending.isPresent();
                    if (pending.isPresent()) entry.settlementId = pending.get().getId();
                    balanceMap.put(key, entry);
                    owes -= amount;
                    bal.merge(creditor, -amount, Double::sum);
                }
            }
        }

        List<BalanceEntry> result = balanceMap.values().stream()
                .filter(b -> b.from.equals(me) || b.to.equals(me))
                .filter(b -> b.amount > 0.01)
                .toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/request-settle")
    public ResponseEntity<?> requestSettle(@RequestBody Map<String, Object> body) {
        String me        = currentUser();
        String from      = (String) body.get("from");
        String to        = (String) body.get("to");
        double amount    = Double.parseDouble(body.get("amount").toString());
        Long groupId     = Long.parseLong(body.get("groupId").toString());
        String groupName = (String) body.getOrDefault("groupName", "");
        Long expenseId   = body.get("expenseId") != null
                ? Long.parseLong(body.get("expenseId").toString()) : null;

        if (!me.equals(from)) {
            return ResponseEntity.status(403).body(Map.of("message", "Only the debtor can request settlement"));
        }

        if (expenseId != null) {
            Optional<Settlement> existing = settlementRepository
                    .findByFromUsernameAndExpenseIdAndStatus(from, expenseId, SettlementStatus.PENDING);
            if (existing.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Settlement request already pending"));
            }
        }

        Settlement s = new Settlement();
        s.setFromUsername(from);
        s.setToUsername(to);
        s.setAmount(amount);
        s.setGroupId(groupId);
        s.setGroupName(groupName);
        s.setExpenseId(expenseId);
        s.setStatus(SettlementStatus.PENDING);
        settlementRepository.save(s);

        return ResponseEntity.ok(Map.of("message", "Payment request sent. Waiting for approval."));
    }

    @PostMapping("/respond-settle/{id}")
    public ResponseEntity<?> respondSettle(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        String me = currentUser();
        Settlement s = settlementRepository.findById(id).orElse(null);
        if (s == null) return ResponseEntity.notFound().build();

        if (!s.getToUsername().equals(me)) {
            return ResponseEntity.status(403).body(Map.of("message", "Only the creditor can approve"));
        }
        if (s.getStatus() != SettlementStatus.PENDING) {
            return ResponseEntity.badRequest().body(Map.of("message", "Already responded"));
        }

        boolean approved = Boolean.parseBoolean(body.get("approved").toString());
        s.setStatus(approved ? SettlementStatus.APPROVED : SettlementStatus.REJECTED);
        s.setRespondedAt(LocalDateTime.now());
        settlementRepository.save(s);

        if (approved) {
            Group group = groupRepository.findById(s.getGroupId()).orElse(null);
            if (group != null) {
                GroupExpense record = new GroupExpense();
                record.setDescription("✅ Settlement");
                record.setAmount(s.getAmount());
                record.setPaidBy(s.getFromUsername());
                record.setSettlement(true);
                record.setGroup(group);
                groupExpenseRepository.save(record);
            }
        }

        return ResponseEntity.ok(Map.of(
                "message", approved ? "Payment confirmed! Balance cleared." : "Payment rejected."
        ));
    }

    static class BalanceEntry {
        public String  id;
        public String  from;
        public String  to;
        public Long    groupId;
        public String  groupName;
        public double  amount;
        public boolean settlementPending;
        public Long    settlementId;

        BalanceEntry(String id, String from, String to, Long groupId, String groupName,
                     double amount, boolean settlementPending, Long settlementId) {
            this.id = id; this.from = from; this.to = to;
            this.groupId = groupId; this.groupName = groupName;
            this.amount = amount; this.settlementPending = settlementPending;
            this.settlementId = settlementId;
        }
    }
}