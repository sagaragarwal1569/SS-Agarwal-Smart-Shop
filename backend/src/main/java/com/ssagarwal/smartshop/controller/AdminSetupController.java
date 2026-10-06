package com.ssagarwal.smartshop.controller;

import com.ssagarwal.smartshop.model.AuthUser;
import com.ssagarwal.smartshop.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/setup")
@CrossOrigin(origins = "http://localhost:5173")
public class AdminSetupController {

    private final AuthService authService;

    public AdminSetupController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/admin")
    public ResponseEntity<?> createAdmin() {

        try {

            String employeeId = "ADMIN001";
            String phoneNumber = "9999999999";
            String temporaryPassword = "Admin@12345";

            AuthUser existing =
                    authService.getAuthUserByEmployeeId(employeeId);

            if (existing != null) {
                return ResponseEntity.badRequest()
                        .body("Admin account already exists.");
            }

            AuthUser admin =
                    authService.createAuthUser(
                            employeeId,
                            phoneNumber,
                            temporaryPassword,
                            "ADMIN"
                    );

            Map<String, Object> response =
                    new HashMap<>();

            response.put("success", true);
            response.put("employeeId", employeeId);
            response.put("phoneNumber", phoneNumber);
            response.put("role", "ADMIN");
            response.put("temporaryPassword", temporaryPassword);
            response.put(
                    "message",
                    "Admin account created successfully."
            );

            return ResponseEntity.ok(response);

        } catch (ExecutionException | InterruptedException e) {

            Thread.currentThread().interrupt();

            return ResponseEntity
                    .internalServerError()
                    .body("Failed to create admin account.");
        }
    }
}