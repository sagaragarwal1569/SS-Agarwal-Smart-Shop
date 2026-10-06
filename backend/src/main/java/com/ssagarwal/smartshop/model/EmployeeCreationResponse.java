package com.ssagarwal.smartshop.model;

public class EmployeeCreationResponse {

    private Employee employee;
    private String temporaryPassword;

    public EmployeeCreationResponse() {
    }

    public EmployeeCreationResponse(
            Employee employee,
            String temporaryPassword) {

        this.employee = employee;
        this.temporaryPassword = temporaryPassword;
    }

    public Employee getEmployee() {
        return employee;
    }

    public void setEmployee(Employee employee) {
        this.employee = employee;
    }

    public String getTemporaryPassword() {
        return temporaryPassword;
    }

    public void setTemporaryPassword(String temporaryPassword) {
        this.temporaryPassword = temporaryPassword;
    }
}