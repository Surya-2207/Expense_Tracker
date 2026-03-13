package com.tracker.app.controller;

import com.tracker.app.entity.User;
import com.tracker.app.repository.UserRepository;
import com.tracker.app.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {

        // Check if username already exists
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", "Username already exists"));
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername());

        // ✅ Return { token, username } so frontend can read res.data.token
        return ResponseEntity.ok(Map.of(
                "token", token,
                "username", user.getUsername()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User user) {

        User existingUser = userRepository
                .findByUsername(user.getUsername())
                .orElse(null);

        if (existingUser == null || !passwordEncoder.matches(
                user.getPassword(), existingUser.getPassword())) {
            return ResponseEntity
                    .status(401)
                    .body(Map.of("message", "Invalid username or password"));
        }

        String token = jwtUtil.generateToken(existingUser.getUsername());

        // ✅ Return { token, username } so frontend can read res.data.token
        return ResponseEntity.ok(Map.of(
                "token", token,
                "username", existingUser.getUsername()
        ));
    }
}