package com.ssagarwal.smartshop.model;

public class AuthUser {

    private String employeeId;
    private String phoneNumber;
    private String passwordHash;
    private String role;
    private Boolean passwordActive;
    private Boolean temporaryPassword;

    public AuthUser() {
    }

    public AuthUser(
            String employeeId,
            String phoneNumber,
            String passwordHash,
            String role,
            Boolean passwordActive,
            Boolean temporaryPassword) {

        this.employeeId = employeeId;
        this.phoneNumber = phoneNumber;
        this.passwordHash = passwordHash;
        this.role = role;
        this.passwordActive = passwordActive;
        this.temporaryPassword = temporaryPassword;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Boolean getPasswordActive() {
        return passwordActive;
    }

    public void setPasswordActive(Boolean passwordActive) {
        this.passwordActive = passwordActive;
    }

    public Boolean getTemporaryPassword() {
        return temporaryPassword;
    }

    public void setTemporaryPassword(Boolean temporaryPassword) {
        this.temporaryPassword = temporaryPassword;
    }
}