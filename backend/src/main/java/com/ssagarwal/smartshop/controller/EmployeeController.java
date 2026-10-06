package com.ssagarwal.smartshop.controller;

import com.ssagarwal.smartshop.model.Employee;
import com.ssagarwal.smartshop.model.EmployeeCreationResponse;
import com.ssagarwal.smartshop.service.EmployeeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/employees")
@CrossOrigin(origins = "http://localhost:5173")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @PostMapping
    public ResponseEntity<?> addEmployee(
            @RequestBody Employee employee) {

        try {

            EmployeeCreationResponse response =
                    employeeService.addEmployee(employee);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {

            return ResponseEntity.badRequest()
                    .body(e.getMessage());

        } catch (ExecutionException | InterruptedException e) {

            Thread.currentThread().interrupt();

            return ResponseEntity.internalServerError()
                    .body("Failed to add employee");
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllEmployees() {

        try {

            List<Employee> employees =
                    employeeService.getAllEmployees();

            return ResponseEntity.ok(employees);

        } catch (ExecutionException | InterruptedException e) {

            Thread.currentThread().interrupt();

            return ResponseEntity.internalServerError()
                    .body("Failed to retrieve employees");
        }
    }

    @GetMapping("/{employeeId}")
    public ResponseEntity<?> getEmployee(
            @PathVariable String employeeId) {

        try {

            Employee employee =
                    employeeService.getEmployee(employeeId);

            if (employee == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(employee);

        } catch (ExecutionException | InterruptedException e) {

            Thread.currentThread().interrupt();

            return ResponseEntity.internalServerError()
                    .body("Failed to retrieve employee");
        }
    }

    @PutMapping("/{employeeId}")
    public ResponseEntity<?> updateEmployee(
            @PathVariable String employeeId,
            @RequestBody Employee employee) {

        try {

            Employee updatedEmployee =
                    employeeService.updateEmployee(
                            employeeId,
                            employee
                    );

            if (updatedEmployee == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(updatedEmployee);

        } catch (IllegalArgumentException e) {

            return ResponseEntity.badRequest()
                    .body(e.getMessage());

        } catch (ExecutionException | InterruptedException e) {

            Thread.currentThread().interrupt();

            return ResponseEntity.internalServerError()
                    .body("Failed to update employee");
        }
    }

    @DeleteMapping("/{employeeId}")
    public ResponseEntity<?> deleteEmployee(
            @PathVariable String employeeId) {

        try {

            employeeService.deleteEmployee(employeeId);

            return ResponseEntity.ok(
                    "Employee deleted successfully"
            );

        } catch (ExecutionException | InterruptedException e) {

            Thread.currentThread().interrupt();

            return ResponseEntity.internalServerError()
                    .body("Failed to delete employee");
        }
    }
}