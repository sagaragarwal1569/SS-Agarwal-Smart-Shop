package com.ssagarwal.smartshop.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import com.ssagarwal.smartshop.model.Employee;
import com.ssagarwal.smartshop.model.EmployeeCreationResponse;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

@Service
public class EmployeeService {

    private static final String COLLECTION = "employees";
    private static final String EMPLOYEE_ID_PREFIX = "SSA-EMP-";

    private final AuthService authService;

    public EmployeeService(AuthService authService) {
        this.authService = authService;
    }

    public EmployeeCreationResponse addEmployee(Employee employee)
            throws ExecutionException, InterruptedException {

        Firestore db = FirestoreClient.getFirestore();

        ApiFuture<QuerySnapshot> existingEmployees =
                db.collection(COLLECTION)
                        .whereEqualTo(
                                "phoneNumber",
                                employee.getPhoneNumber()
                        )
                        .limit(1)
                        .get();

        if (!existingEmployees.get().isEmpty()) {
            throw new IllegalArgumentException(
                    "An employee with this phone number already exists"
            );
        }

        String employeeId = generateEmployeeId(db);

        employee.setEmployeeId(employeeId);
        employee.setActive(true);
        employee.setTemporaryPassword(true);

        String temporaryPassword =
                generateTemporaryPassword();

        ApiFuture<WriteResult> future =
                db.collection(COLLECTION)
                        .document(employeeId)
                        .set(employee);

        future.get();

        authService.createAuthUser(
                employeeId,
                employee.getPhoneNumber(),
                temporaryPassword,
                employee.getRole()
        );

        return new EmployeeCreationResponse(
                employee,
                temporaryPassword
        );
    }

    private String generateEmployeeId(Firestore db)
            throws ExecutionException, InterruptedException {

        ApiFuture<QuerySnapshot> future =
                db.collection(COLLECTION).get();

        List<QueryDocumentSnapshot> documents =
                future.get().getDocuments();

        int highestNumber = 0;

        for (QueryDocumentSnapshot document :
                documents) {

            String existingId =
                    document.getId();

            if (existingId.startsWith(EMPLOYEE_ID_PREFIX)) {

                String numberPart =
                        existingId.substring(
                                EMPLOYEE_ID_PREFIX.length()
                        );

                try {

                    int number =
                            Integer.parseInt(numberPart);

                    if (number > highestNumber) {
                        highestNumber = number;
                    }

                } catch (NumberFormatException ignored) {
                }
            }
        }

        int nextNumber = highestNumber + 1;

        return String.format(
                "%s%03d",
                EMPLOYEE_ID_PREFIX,
                nextNumber
        );
    }

    private String generateTemporaryPassword() {

        SecureRandom random =
                new SecureRandom();

        String characters =
                "ABCDEFGHJKLMNPQRSTUVWXYZ"
                + "abcdefghijkmnopqrstuvwxyz"
                + "23456789"
                + "@#$";

        StringBuilder password =
                new StringBuilder();

        for (int i = 0; i < 10; i++) {

            int index =
                    random.nextInt(
                            characters.length()
                    );

            password.append(
                    characters.charAt(index)
            );
        }

        return password.toString();
    }

    public List<Employee> getAllEmployees()
            throws ExecutionException, InterruptedException {

        Firestore db =
                FirestoreClient.getFirestore();

        ApiFuture<QuerySnapshot> future =
                db.collection(COLLECTION).get();

        List<QueryDocumentSnapshot> documents =
                future.get().getDocuments();

        List<Employee> employees =
                new ArrayList<>();

        for (QueryDocumentSnapshot document :
                documents) {

            Employee employee =
                    document.toObject(
                            Employee.class
                    );

            employees.add(employee);
        }

        return employees;
    }

    public Employee getEmployee(String employeeId)
            throws ExecutionException, InterruptedException {

        Firestore db =
                FirestoreClient.getFirestore();

        DocumentSnapshot document =
                db.collection(COLLECTION)
                        .document(employeeId)
                        .get()
                        .get();

        if (!document.exists()) {
            return null;
        }

        return document.toObject(
                Employee.class
        );
    }

    public Employee updateEmployee(
            String employeeId,
            Employee updatedEmployee)
            throws ExecutionException, InterruptedException {

        Firestore db =
                FirestoreClient.getFirestore();

        DocumentReference employeeRef =
                db.collection(COLLECTION)
                        .document(employeeId);

        DocumentSnapshot document =
                employeeRef.get().get();

        if (!document.exists()) {
            return null;
        }

        ApiFuture<QuerySnapshot> existingEmployees =
                db.collection(COLLECTION)
                        .whereEqualTo(
                                "phoneNumber",
                                updatedEmployee.getPhoneNumber()
                        )
                        .get();

        for (QueryDocumentSnapshot existingDocument :
                existingEmployees.get().getDocuments()) {

            if (!existingDocument.getId()
                    .equals(employeeId)) {

                throw new IllegalArgumentException(
                        "An employee with this phone number already exists"
                );
            }
        }

        Employee existingEmployee =
                document.toObject(
                        Employee.class
                );

        existingEmployee.setName(
                updatedEmployee.getName()
        );

        existingEmployee.setPhoneNumber(
                updatedEmployee.getPhoneNumber()
        );

        existingEmployee.setRole(
                updatedEmployee.getRole()
        );

        existingEmployee.setMonthlySalary(
                updatedEmployee.getMonthlySalary()
        );

        employeeRef.set(
                existingEmployee
        ).get();

        return existingEmployee;
    }

    public void deleteEmployee(String employeeId)
            throws ExecutionException, InterruptedException {

        Firestore db =
                FirestoreClient.getFirestore();

        db.collection(COLLECTION)
                .document(employeeId)
                .delete()
                .get();

        db.collection("authUsers")
                .document(employeeId)
                .delete()
                .get();
    }
}