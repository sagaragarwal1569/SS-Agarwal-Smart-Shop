package com.ssagarwal.smartshop.model;

public class SalaryTransaction {

    private String transactionId;
    private String employeeId;
    private String employeeName;
    private String type;
    private double amount;
    private String description;
    private String date;
    private String week;
    private String createdAt;

    public SalaryTransaction() {
    }

    public SalaryTransaction(
            String transactionId,
            String employeeId,
            String employeeName,
            String type,
            double amount,
            String description,
            String date,
            String week,
            String createdAt
    ) {
        this.transactionId = transactionId;
        this.employeeId = employeeId;
        this.employeeName = employeeName;
        this.type = type;
        this.amount = amount;
        this.description = description;
        this.date = date;
        this.week = week;
        this.createdAt = createdAt;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public String getEmployeeName() {
        return employeeName;
    }

    public void setEmployeeName(String employeeName) {
        this.employeeName = employeeName;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getWeek() {
        return week;
    }

    public void setWeek(String week) {
        this.week = week;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
