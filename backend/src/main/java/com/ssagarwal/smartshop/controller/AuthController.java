package com.ssagarwal.smartshop.controller;

import com.ssagarwal.smartshop.model.AuthUser;
import com.ssagarwal.smartshop.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Employee/Admin login using:
     *
     * Employee ID
     *      +
     * Password
     *      ↓
     * Find employee in Firestore
     *      ↓
     * Verify BCrypt password
     *      ↓
     * Check temporary password
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestParam String employeeId,
            @RequestParam String password) {

        try {

            // Find authentication record using Employee ID
            AuthUser authUser =
                    authService.getAuthUserByEmployeeId(employeeId);

            // Employee does not exist
            if (authUser == null) {

                return ResponseEntity
                        .status(401)
                        .body("Invalid employee ID or password");
            }

            // Verify password using BCrypt
            boolean passwordMatches =
                    authService.verifyPassword(
                            password,
                            authUser.getPasswordHash()
                    );

            // Wrong password
            if (!passwordMatches) {

                return ResponseEntity
                        .status(401)
                        .body("Invalid employee ID or password");
            }

            /*
             * Temporary password means the employee
             * must create a new permanent password.
             */
            boolean requiresPasswordChange =
                    Boolean.TRUE.equals(
                            authUser.getTemporaryPassword()
                    );

            // Safe response — never send passwordHash
            Map<String, Object> response =
                    new HashMap<>();

            response.put(
                    "success",
                    true
            );

            response.put(
                    "employeeId",
                    authUser.getEmployeeId()
            );

            response.put(
                    "phoneNumber",
                    authUser.getPhoneNumber()
            );

            response.put(
                    "role",
                    authUser.getRole()
            );

            response.put(
                    "requiresPasswordChange",
                    requiresPasswordChange
            );

            if (requiresPasswordChange) {

                response.put(
                        "message",
                        "Temporary password verified. Please create a new password."
                );

            } else {

                response.put(
                        "message",
                        "Login successful."
                );
            }

            return ResponseEntity.ok(response);

        } catch (ExecutionException e) {

            return ResponseEntity
                    .internalServerError()
                    .body("Authentication service error");

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            return ResponseEntity
                    .internalServerError()
                    .body("Authentication service interrupted");
        }
    }

    /**
     * Change temporary password to permanent password.
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestParam String employeeId,
            @RequestParam String newPassword) {

        try {

            if (newPassword == null ||
                    newPassword.trim().length() < 8) {

                return ResponseEntity
                        .badRequest()
                        .body("Password must be at least 8 characters long.");
            }

            authService.changePassword(
                    employeeId,
                    newPassword
            );

            Map<String, Object> response =
                    new HashMap<>();

            response.put(
                    "success",
                    true
            );

            response.put(
                    "employeeId",
                    employeeId
            );

            response.put(
                    "message",
                    "Password changed successfully."
            );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());

        } catch (ExecutionException e) {

            return ResponseEntity
                    .internalServerError()
                    .body("Authentication service error");

        } catch (InterruptedException e) {

            Thread.currentThread().interrupt();

            return ResponseEntity
                    .internalServerError()
                    .body("Authentication service interrupted");
        }
    }
}