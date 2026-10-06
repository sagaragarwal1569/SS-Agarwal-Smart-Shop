package com.ssagarwal.smartshop.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.ssagarwal.smartshop.model.WorkAssignment;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class WorkAssignmentService {

    private static final String COLLECTION = "workAssignments";

    public WorkAssignment createAssignment(WorkAssignment assignment) throws Exception {
        if (assignment == null) {
            throw new IllegalArgumentException("Assignment is required.");
        }
        if (assignment.getEmployeeId() == null || assignment.getEmployeeId().isBlank()) {
            throw new IllegalArgumentException("Employee ID is required.");
        }
        if (assignment.getTitle() == null || assignment.getTitle().isBlank()) {
            throw new IllegalArgumentException("Work title is required.");
        }
        if (assignment.getMessage() == null || assignment.getMessage().isBlank()) {
            throw new IllegalArgumentException("Work message is required.");
        }

        Firestore db = FirestoreClient.getFirestore();
        DocumentReference document = db.collection(COLLECTION).document();

        assignment.setAssignmentId(document.getId());
        assignment.setStatus("PENDING");
        assignment.setCreatedAt(Instant.now().toString());

        document.set(assignment).get();
        return assignment;
    }

    public List<WorkAssignment> getEmployeeAssignments(String employeeId) throws Exception {
        if (employeeId == null || employeeId.isBlank()) {
            return List.of();
        }

        Firestore db = FirestoreClient.getFirestore();
        ApiFuture<QuerySnapshot> future = db.collection(COLLECTION)
                .whereEqualTo("employeeId", employeeId)
                .get();

        List<WorkAssignment> assignments = new ArrayList<>();
        for (DocumentSnapshot document : future.get().getDocuments()) {
            WorkAssignment assignment = document.toObject(WorkAssignment.class);
            if (assignment != null) {
                assignments.add(assignment);
            }
        }

        assignments.sort(
                Comparator.comparing(
                        WorkAssignment::getCreatedAt,
                        Comparator.nullsLast(String::compareTo)
                ).reversed()
        );

        return assignments;
    }

    public WorkAssignment markAsRead(String assignmentId) throws Exception {
        if (assignmentId == null || assignmentId.isBlank()) {
            throw new IllegalArgumentException("Assignment ID is required.");
        }

        Firestore db = FirestoreClient.getFirestore();
        DocumentReference document = db.collection(COLLECTION).document(assignmentId);

        DocumentSnapshot snapshot = document.get().get();
        if (!snapshot.exists()) {
            throw new IllegalArgumentException("Work assignment not found.");
        }

        document.update("status", "READ").get();
        return document.get().get().toObject(WorkAssignment.class);
    }
}
