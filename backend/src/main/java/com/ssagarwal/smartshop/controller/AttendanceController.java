package com.ssagarwal.smartshop.controller;

import com.ssagarwal.smartshop.model.Attendance;
import com.ssagarwal.smartshop.service.AttendanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "*")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(
            AttendanceService attendanceService) {

        this.attendanceService =
                attendanceService;
    }

    @PostMapping
    public ResponseEntity<?> saveAttendance(
            @RequestBody Attendance attendance) {

        try {

            Attendance saved =
                    attendanceService.saveAttendance(
                            attendance
                    );

            return ResponseEntity.ok(saved);

        } catch (IllegalArgumentException e) {

            return ResponseEntity.badRequest()
                    .body(e.getMessage());

        } catch (ExecutionException |
                 InterruptedException e) {

            return ResponseEntity
                    .internalServerError()
                    .body(
                            "Unable to save attendance"
                    );
        }
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<?> getEmployeeAttendance(
            @PathVariable String employeeId) {

        try {

            List<Attendance> attendance =
                    attendanceService
                            .getEmployeeAttendance(
                                    employeeId
                            );

            return ResponseEntity.ok(
                    attendance
            );

        } catch (ExecutionException |
                 InterruptedException e) {

            return ResponseEntity
                    .internalServerError()
                    .body(
                            "Unable to load attendance"
                    );
        }
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<?> getAttendanceByDate(
            @PathVariable String date) {

        try {

            List<Attendance> attendance =
                    attendanceService
                            .getAttendanceByDate(
                                    date
                            );

            return ResponseEntity.ok(
                    attendance
            );

        } catch (ExecutionException |
                 InterruptedException e) {

            return ResponseEntity
                    .internalServerError()
                    .body(
                            "Unable to load attendance"
                    );
        }
    }
}