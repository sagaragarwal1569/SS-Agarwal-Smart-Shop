package com.ssagarwal.smartshop.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import com.ssagarwal.smartshop.model.Attendance;
import com.ssagarwal.smartshop.model.Employee;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

@Service
public class AttendanceService {

    private static final String COLLECTION = "attendance";

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public Attendance saveAttendance(Attendance attendance)
            throws ExecutionException, InterruptedException {

        Firestore db = FirestoreClient.getFirestore();

        if (attendance.getEmployeeId() == null ||
                attendance.getEmployeeId().isBlank()) {

            throw new IllegalArgumentException(
                    "Employee ID is required"
            );
        }

        if (attendance.getDate() == null ||
                attendance.getDate().isBlank()) {

            throw new IllegalArgumentException(
                    "Attendance date is required"
            );
        }

        if (attendance.getStatus() == null ||
                attendance.getStatus().isBlank()) {

            throw new IllegalArgumentException(
                    "Attendance status is required"
            );
        }

        LocalDate attendanceDate;

        try {
            attendanceDate =
                    LocalDate.parse(
                            attendance.getDate(),
                            DATE_FORMAT
                    );
        } catch (Exception e) {
            throw new IllegalArgumentException(
                    "Invalid attendance date"
            );
        }

        LocalDate today = LocalDate.now();

        if (!attendanceDate.equals(today)) {
            throw new IllegalArgumentException(
                    "Attendance can only be entered for today"
            );
        }

        String status =
                attendance.getStatus()
                        .trim()
                        .toUpperCase();

        if (!status.equals("PRESENT") &&
                !status.equals("ABSENT") &&
                !status.equals("HALF DAY")) {

            throw new IllegalArgumentException(
                    "Attendance must be Present, Absent, or Half Day"
            );
        }

        DocumentSnapshot employeeDocument =
                db.collection("employees")
                        .document(attendance.getEmployeeId())
                        .get()
                        .get();

        if (!employeeDocument.exists()) {
            throw new IllegalArgumentException(
                    "Employee not found"
            );
        }

        Employee employee =
                employeeDocument.toObject(
                        Employee.class
                );

        double monthlySalary =
                employee.getMonthlySalary() == null
                        ? 0.0
                        : employee.getMonthlySalary();

        /*
         * The monthly salary is divided by 30
         * to calculate one day's salary.
         */
        double dailySalary =
                monthlySalary / 30.0;

        double salaryAmount;

        if (status.equals("PRESENT")) {
            salaryAmount = dailySalary;
        } else if (status.equals("HALF DAY")) {
            salaryAmount = dailySalary / 2.0;
        } else {
            salaryAmount = 0.0;
        }

        attendance.setStatus(status);
        attendance.setSalaryAmount(salaryAmount);

        String attendanceId =
                attendance.getEmployeeId()
                        + "_"
                        + attendance.getDate();

        attendance.setAttendanceId(attendanceId);

        db.collection(COLLECTION)
                .document(attendanceId)
                .set(attendance)
                .get();

        return attendance;
    }

    public List<Attendance> getEmployeeAttendance(
            String employeeId)
            throws ExecutionException, InterruptedException {

        Firestore db =
                FirestoreClient.getFirestore();

        ApiFuture<QuerySnapshot> future =
                db.collection(COLLECTION)
                        .whereEqualTo(
                                "employeeId",
                                employeeId
                        )
                        .get();

        List<Attendance> attendanceList =
                new ArrayList<>();

        for (QueryDocumentSnapshot document :
                future.get().getDocuments()) {

            Attendance attendance =
                    document.toObject(
                            Attendance.class
                    );

            attendanceList.add(attendance);
        }

        return attendanceList;
    }

    public List<Attendance> getAttendanceByDate(
            String date)
            throws ExecutionException, InterruptedException {

        Firestore db =
                FirestoreClient.getFirestore();

        ApiFuture<QuerySnapshot> future =
                db.collection(COLLECTION)
                        .whereEqualTo(
                                "date",
                                date
                        )
                        .get();

        List<Attendance> attendanceList =
                new ArrayList<>();

        for (QueryDocumentSnapshot document :
                future.get().getDocuments()) {

            Attendance attendance =
                    document.toObject(
                            Attendance.class
                    );

            attendanceList.add(attendance);
        }

        return attendanceList;
    }
}