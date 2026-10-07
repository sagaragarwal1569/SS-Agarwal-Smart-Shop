package com.ssagarwal.smartshop.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initializeFirebase() throws IOException {

        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }

        String firebaseCredentials = System.getenv("FIREBASE_SERVICE_ACCOUNT");

        GoogleCredentials credentials;

        if (firebaseCredentials != null && !firebaseCredentials.isBlank()) {

            credentials = GoogleCredentials.fromStream(
                    new ByteArrayInputStream(
                            firebaseCredentials.getBytes(StandardCharsets.UTF_8)
                    )
            );

            System.out.println("Firebase credentials loaded from environment variable.");

        } else {

            FileInputStream serviceAccount =
                    new FileInputStream("config/firebase-service-account.json");

            credentials = GoogleCredentials.fromStream(serviceAccount);

            System.out.println("Firebase credentials loaded from local service-account file.");
        }

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(credentials)
                .build();

        FirebaseApp.initializeApp(options);

        System.out.println("======================================");
        System.out.println(" Firebase connected successfully!");
        System.out.println(" S.S. Agarwal Smart Shop Backend");
        System.out.println("======================================");
    }
}