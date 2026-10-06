package com.ssagarwal.smartshop.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.ssagarwal.smartshop.model.SalaryTransaction;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class SalaryService {

    private static final String COLLECTION = "salary";

    public SalaryTransaction saveTransaction(SalaryTransaction transaction) throws Exception {
        validate(transaction);

        Firestore db = FirestoreClient.getFirestore();

        // A deduction always reduces the outstanding advance.
        // It is rejected when it is greater than the currently outstanding advance.
        if ("DEDUCTION".equals(transaction.getType())) {
            double outstanding = calculateAdvanceOutstanding(transaction.getEmployeeId());
            if (transaction.getAmount() > outstanding) {
                throw new IllegalArgumentException(
                        "Deduction cannot be greater than the outstanding advance of ₹" +
                                String.format("%.2f", outstanding));
            }
        }

        DocumentReference document = db.collection(COLLECTION).document();
        transaction.setTransactionId(document.getId());
        transaction.setCreatedAt(Instant.now().toString());
        document.set(transaction).get();

        return transaction;
    }

    public List<SalaryTransaction> getEmployeeSalary(String employeeId) throws Exception {
        if (employeeId == null || employeeId.isBlank()) {
            return List.of();
        }

        Firestore db = FirestoreClient.getFirestore();
        ApiFuture<QuerySnapshot> future = db.collection(COLLECTION)
                .whereEqualTo("employeeId", employeeId)
                .get();

        List<SalaryTransaction> transactions = new ArrayList<>();
        for (DocumentSnapshot document : future.get().getDocuments()) {
            SalaryTransaction transaction = document.toObject(SalaryTransaction.class);
            if (transaction != null) {
                transactions.add(transaction);
            }
        }

        transactions.sort(
                Comparator.comparing(
                                SalaryTransaction::getDate,
                                Comparator.nullsLast(String::compareTo)
                        ).reversed()
                        .thenComparing(
                                SalaryTransaction::getCreatedAt,
                                Comparator.nullsLast(String::compareTo)
                        .reversed())
        );

        return transactions;
    }

    private void validate(SalaryTransaction transaction) {
        if (transaction == null) {
            throw new IllegalArgumentException("Salary transaction is required.");
        }
        if (transaction.getEmployeeId() == null || transaction.getEmployeeId().isBlank()) {
            throw new IllegalArgumentException("Employee ID is required.");
        }
        if (transaction.getDate() == null || transaction.getDate().isBlank()) {
            throw new IllegalArgumentException("Transaction date is required.");
        }
        if (transaction.getAmount() <= 0) {
            throw new IllegalArgumentException("Transaction amount must be greater than zero.");
        }

        String type = transaction.getType() == null ? "" : transaction.getType().trim().toUpperCase();

        // PAYMENT = Salary Given, ADVANCE = Advance Amount, DEDUCTION = Deduction of Advance.
        if (!"PAYMENT".equals(type) && !"ADVANCE".equals(type) && !"DEDUCTION".equals(type)) {
            throw new IllegalArgumentException(
                    "Transaction type must be PAYMENT, ADVANCE or DEDUCTION.");
        }

        transaction.setType(type);
    }

    private double calculateAdvanceOutstanding(String employeeId) throws Exception {
        Firestore db = FirestoreClient.getFirestore();
        ApiFuture<QuerySnapshot> future = db.collection(COLLECTION)
                .whereEqualTo("employeeId", employeeId)
                .get();

        double taken = 0;
        double deducted = 0;

        for (DocumentSnapshot document : future.get().getDocuments()) {
            String type = document.getString("type");
            Double amount = document.getDouble("amount");
            double value = amount == null ? 0 : amount;

            // ADDITION is supported only as a legacy record from the previous version.
            if ("ADVANCE".equalsIgnoreCase(type) || "ADDITION".equalsIgnoreCase(type)) {
                taken += value;
            } else if ("DEDUCTION".equalsIgnoreCase(type)) {
                deducted += value;
            }
        }

        return Math.max(0, taken - deducted);
    }
}
