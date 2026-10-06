package com.ssagarwal.smartshop.controller;

import com.ssagarwal.smartshop.model.SalaryTransaction;
import com.ssagarwal.smartshop.service.SalaryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
@RequestMapping("/api/salary")
public class SalaryController {

    private final SalaryService salaryService;

    public SalaryController(SalaryService salaryService) {
        this.salaryService = salaryService;
    }

    @PostMapping("/transaction")
    public ResponseEntity<?> saveTransaction(@RequestBody SalaryTransaction transaction) {
        try {
            return ResponseEntity.ok(salaryService.saveTransaction(transaction));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to save salary transaction: " + safeMessage(ex)));
        }
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<?> getEmployeeSalary(@PathVariable String employeeId) {
        try {
            List<SalaryTransaction> transactions = salaryService.getEmployeeSalary(employeeId);
            return ResponseEntity.ok(transactions);
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to load salary transactions: " + safeMessage(ex)));
        }
    }

    private String safeMessage(Exception ex) {
        return ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
    }
}
