package com.ssagarwal.smartshop.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import com.ssagarwal.smartshop.model.AuthUser;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutionException;

@Service
public class AuthService {

    private static final String COLLECTION = "authUsers";

    private final PasswordEncoder passwordEncoder;

    public AuthService(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    public AuthUser createAuthUser(
            String employeeId,
            String phoneNumber,
            String temporaryPassword,
            String role)
            throws ExecutionException, InterruptedException {

        Firestore db = FirestoreClient.getFirestore();

        String passwordHash =
                passwordEncoder.encode(temporaryPassword);

        AuthUser authUser = new AuthUser();

        authUser.setEmployeeId(employeeId);
        authUser.setPhoneNumber(phoneNumber);
        authUser.setPasswordHash(passwordHash);
        authUser.setRole(role);

        authUser.setPasswordActive(false);
        authUser.setTemporaryPassword(true);

        ApiFuture<WriteResult> future =
                db.collection(COLLECTION)
                        .document(employeeId)
                        .set(authUser);

        future.get();

        return authUser;
    }

    // Find employee using Employee ID
    public AuthUser getAuthUserByEmployeeId(String employeeId)
            throws ExecutionException, InterruptedException {

        Firestore db = FirestoreClient.getFirestore();

        DocumentSnapshot document =
                db.collection(COLLECTION)
                        .document(employeeId)
                        .get()
                        .get();

        if (!document.exists()) {
            return null;
        }

        return document.toObject(AuthUser.class);
    }

    // Existing phone-number lookup
    public AuthUser getAuthUserByPhone(String phoneNumber)
            throws ExecutionException, InterruptedException {

        Firestore db = FirestoreClient.getFirestore();

        ApiFuture<QuerySnapshot> future =
                db.collection(COLLECTION)
                        .whereEqualTo("phoneNumber", phoneNumber)
                        .limit(1)
                        .get();

        QuerySnapshot snapshot = future.get();

        if (snapshot.isEmpty()) {
            return null;
        }

        return snapshot.getDocuments()
                .get(0)
                .toObject(AuthUser.class);
    }

    // Verify password using BCrypt
    public boolean verifyPassword(
            String rawPassword,
            String passwordHash) {

        return passwordEncoder.matches(
                rawPassword,
                passwordHash
        );
    }

    // Change temporary password to permanent password
    public void changePassword(
            String employeeId,
            String newPassword)
            throws ExecutionException, InterruptedException {

        Firestore db = FirestoreClient.getFirestore();

        DocumentReference userRef =
                db.collection(COLLECTION)
                        .document(employeeId);

        DocumentSnapshot document =
                userRef.get().get();

        if (!document.exists()) {
            throw new IllegalArgumentException(
                    "Employee not found"
            );
        }

        String newPasswordHash =
                passwordEncoder.encode(newPassword);

        userRef.update(
                "passwordHash",
                newPasswordHash,
                "passwordActive",
                true,
                "temporaryPassword",
                false
        ).get();
    }
}