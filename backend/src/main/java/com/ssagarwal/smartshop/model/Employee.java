package com.ssagarwal.smartshop.model;

public class Employee {

    private String employeeId;
    private String name;
    private String phoneNumber;
    private String role;
    private Boolean active;
    private Boolean temporaryPassword;
    private Double monthlySalary;

    public Employee() {
    }

    public Employee(
            String employeeId,
            String name,
            String phoneNumber,
            String role,
            Boolean active,
            Boolean temporaryPassword,
            Double monthlySalary) {

        this.employeeId = employeeId;
        this.name = name;
        this.phoneNumber = phoneNumber;
        this.role = role;
        this.active = active;
        this.temporaryPassword = temporaryPassword;
        this.monthlySalary = monthlySalary;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public Boolean getTemporaryPassword() {
        return temporaryPassword;
    }

    public void setTemporaryPassword(Boolean temporaryPassword) {
        this.temporaryPassword = temporaryPassword;
    }

    public Double getMonthlySalary() {
        return monthlySalary;
    }

    public void setMonthlySalary(Double monthlySalary) {
        this.monthlySalary = monthlySalary;
    }
}
