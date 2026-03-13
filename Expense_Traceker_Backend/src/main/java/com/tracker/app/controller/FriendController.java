package com.tracker.app.controller;

import com.tracker.app.entity.FriendRequest;
import com.tracker.app.repository.FriendRequestRepository;
import com.tracker.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/split/friends")
@RequiredArgsConstructor
public class FriendController {

    private final FriendRequestRepository friendRequestRepository;
    private final UserRepository userRepository;

    private String currentUser() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    // ── GET search users by username ─────────────────────────────────────────
    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(@RequestParam String username) {
        String me = currentUser();
        List<Map<String, String>> results = userRepository
                .findByUsernameContainingIgnoreCase(username)
                .stream()
                .filter(u -> !u.getUsername().equals(me))
                .map(u -> Map.of("username", u.getUsername()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(results);
    }

    // ── GET my friends list ──────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getMyFriends() {
        String me = currentUser();
        List<FriendRequest> accepted = friendRequestRepository.findAllFriends(me);

        List<Map<String, String>> friends = accepted.stream()
                .map(f -> {
                    String other = f.getFromUsername().equals(me)
                            ? f.getToUsername() : f.getFromUsername();
                    return Map.of("username", other);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(friends);
    }

    // ── GET incoming pending requests ────────────────────────────────────────
    @GetMapping("/requests")
    public ResponseEntity<?> getIncomingRequests() {
        String me = currentUser();
        List<FriendRequest> pending =
                friendRequestRepository.findByToUsernameAndStatus(me, "PENDING");
        return ResponseEntity.ok(pending);
    }

    // ── POST send friend request ─────────────────────────────────────────────
    @PostMapping("/request")
    public ResponseEntity<?> sendRequest(@RequestBody Map<String, String> body) {
        String me = currentUser();
        String to = body.get("username");

        if (to == null || to.isBlank() || to.equals(me)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid username"));
        }

        // Check target user exists
        if (userRepository.findByUsername(to).isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }

        // Already friends?
        if (friendRequestRepository.findAcceptedFriendship(me, to).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Already friends"));
        }

        // Duplicate pending?
        if (friendRequestRepository
                .findByFromUsernameAndToUsernameAndStatus(me, to, "PENDING")
                .isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Request already sent"));
        }

        FriendRequest req = new FriendRequest();
        req.setFromUsername(me);
        req.setToUsername(to);
        req.setStatus("PENDING");

        friendRequestRepository.save(req);
        return ResponseEntity.ok(Map.of("message", "Friend request sent"));
    }

    // ── DELETE remove a friend ───────────────────────────────────────────────
    @DeleteMapping("/{username}")
    public ResponseEntity<?> removeFriend(@PathVariable String username) {
        String me = currentUser();

        FriendRequest friendship = friendRequestRepository
                .findAcceptedFriendship(me, username)
                .orElse(null);

        if (friendship == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "You are not friends with " + username));
        }

        friendRequestRepository.delete(friendship);
        return ResponseEntity.ok(Map.of("message", "Friend removed successfully"));
    }

    // ── POST accept or reject ────────────────────────────────────────────────
    @PostMapping("/request/{id}/{action}")
    public ResponseEntity<?> respondRequest(
            @PathVariable Long id,
            @PathVariable String action) {

        String me = currentUser();
        FriendRequest req = friendRequestRepository.findById(id).orElse(null);

        if (req == null || !req.getToUsername().equals(me)) {
            return ResponseEntity.status(403).body(Map.of("message", "Not authorized"));
        }

        if (action.equalsIgnoreCase("accept")) {
            req.setStatus("ACCEPTED");
            friendRequestRepository.save(req);
            return ResponseEntity.ok(Map.of("message", "Friend request accepted"));
        } else if (action.equalsIgnoreCase("reject")) {
            req.setStatus("REJECTED");
            friendRequestRepository.save(req);
            return ResponseEntity.ok(Map.of("message", "Friend request rejected"));
        }

        return ResponseEntity.badRequest().body(Map.of("message", "Unknown action"));
    }
}