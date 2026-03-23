package com.tracker.app.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    // ← FIXED: must be at least 32 characters (256 bits) for HS256.
    //   Previous key was too short and would throw WeakKeyException in strict JJWT versions.
    private static final String SECRET =
            "SpendWiseAppSuperSecretJwtKey2024!!XyZ#$%AbCdEfGh";

    // Token valid for 7 days (in milliseconds)
    private static final long EXPIRATION_MS = 1000L * 60 * 60 * 24;
    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes());
    }

    public String generateToken(String username) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + EXPIRATION_MS);

        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (ExpiredJwtException e) {
            // Token expired — user must log in again
            System.out.println("JWT expired: " + e.getMessage());
        } catch (UnsupportedJwtException e) {
            System.out.println("JWT unsupported: " + e.getMessage());
        } catch (MalformedJwtException e) {
            System.out.println("JWT malformed: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            System.out.println("JWT empty/null: " + e.getMessage());
        } catch (Exception e) {
            System.out.println("JWT validation error: " + e.getMessage());
        }
        return false;
    }
}