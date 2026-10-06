package com.ssagarwal.smartshop.controller;

import com.ssagarwal.smartshop.model.WorkAssignment;
import com.ssagarwal.smartshop.service.WorkAssignmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
@RequestMapping("/api/work-assignments")
public class WorkAssignmentController {

    private final WorkAssignmentService workAssignmentService;

    public WorkAssignmentController(WorkAssignmentService workAssignmentService) {
        this.workAssignmentService = workAssignmentService;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody WorkAssignment assignment) {
        try {
            return ResponseEntity.ok(workAssignmentService.createAssignment(assignment));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to create work assignment: " + safeMessage(ex)));
        }
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<?> getForEmployee(@PathVariable String employeeId) {
        try {
            List<WorkAssignment> assignments = workAssignmentService.getEmployeeAssignments(employeeId);
            return ResponseEntity.ok(assignments);
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to load work assignments: " + safeMessage(ex)));
        }
    }

    @PutMapping("/{assignmentId}/read")
    public ResponseEntity<?> markRead(@PathVariable String assignmentId) {
        try {
            return ResponseEntity.ok(workAssignmentService.markAsRead(assignmentId));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to mark assignment as read: " + safeMessage(ex)));
        }
    }

    private String safeMessage(Exception ex) {
        return ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
    }
}
