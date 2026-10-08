import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import {
  RecaptchaVerifier,
  getAuth,
  signInWithPhoneNumber,
  signOut,
} from "firebase/auth";
import * as FirebaseModule from "./firebase";

// The existing ./firebase file should initialize the Firebase app.
// If it also exports `auth`, we reuse that instance; otherwise getAuth()
// uses the already-initialized default Firebase app.
const getFirebaseAuth = () => FirebaseModule.auth || getAuth();

const API = "https://ss-agarwal-smart-shop.onrender.com";
const GlobalStyles = () => (
  <style>{`
    .smart-page{min-height:100dvh;height:100dvh;overflow:hidden;background:linear-gradient(135deg,#07111f 0%,#0f1f35 55%,#162d49 100%);color:#f8fafc;}
    .smart-inner{width:100%;max-width:1000px;height:100%;margin:0 auto;padding:14px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;}
    .smart-header{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 4px;}
    .eyebrow{font-size:12px;color:#f6c453;font-weight:800;letter-spacing:1.4px;}
    .smart-title{font-size:20px;font-weight:900;line-height:1.15;}
    .smart-subtitle{font-size:11px;color:rgba(255,255,255,.68);margin-top:3px;}
    .smart-card{width:100%;box-sizing:border-box;background:rgba(255,255,255,.97);color:#0f172a;border-radius:22px;padding:18px;box-shadow:0 18px 50px rgba(0,0,0,.28);}
    .module-card{flex:1;min-height:0;max-height:calc(100dvh - 120px);overflow:auto;margin:auto 0;}
    .smart-footer{text-align:center;color:rgba(255,255,255,.62);font-size:11px;padding:6px;}
    .top-button{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;border-radius:12px;padding:9px 12px;font-weight:800;cursor:pointer;}
    .menu-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;}
    .menu-box{min-height:105px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:16px;padding:13px;text-align:left;cursor:pointer;box-shadow:0 4px 14px rgba(15,23,42,.06);}
    .primary-action{width:100%;border:none;background:#1d4ed8;color:#fff;border-radius:10px;padding:10px 12px;font-size:12px;font-weight:900;cursor:pointer;}
    .primary-action:disabled{opacity:.65;cursor:not-allowed;}
    .small-button{border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:8px 9px;font-size:11px;font-weight:800;cursor:pointer;}
    .small-button.danger{background:#fee2e2;color:#dc2626;border-color:#fecaca;}
    .status-pill{padding:5px 7px;border-radius:8px;background:#dcfce7;color:#166534;font-size:10px;font-weight:900;height:max-content;}
    .item-card{padding:10px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-sizing:border-box;}
    .card-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
    .mini-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
    .form-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;}
    .status-choice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}
    .status-choice{padding:11px 8px;border:1px solid #cbd5e1;background:#fff;border-radius:10px;font-size:11px;font-weight:900;cursor:pointer;}
    .status-choice.selected{border:2px solid #1d4ed8;background:#eef6ff;color:#1d4ed8;}
    .smart-card select,.smart-card input,.smart-card textarea{width:100%;box-sizing:border-box;}
    @media (max-width:700px){.smart-inner{padding:10px;}.smart-card{padding:12px;border-radius:16px;}.form-grid-2,.card-grid-2{grid-template-columns:1fr;}.menu-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}.mini-info-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.status-choice-grid{grid-template-columns:1fr 1fr 1fr;}.module-card{max-height:calc(100dvh - 105px);}}
  `}</style>
);


const STATUS_OPTIONS = ["PRESENT", "HALF DAY", "ABSENT"];

const SALARY_TYPES = [
  { value: "PAYMENT", label: "Salary Given" },
  { value: "ADVANCE", label: "Advance Amount" },
  { value: "DEDUCTION", label: "Deduction of Advance" },
];

function todayLocal() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function getSalaryWeek(dateValue) {
  if (!dateValue) return "";
  const day = Number(String(dateValue).split("-")[2]);
  if (!Number.isFinite(day) || day <= 0) return "";
  if (day <= 7) return "Week 1";
  if (day <= 14) return "Week 2";
  if (day <= 21) return "Week 3";
  return "Week 4";
}

function salaryTypeLabel(type) {
  if (type === "ADDITION") return "Advance Amount";
  return SALARY_TYPES.find((item) => item.value === type)?.label || type || "—";
}

function salaryTypeColor(type) {
  if (type === "ADVANCE" || type === "ADDITION") return "#15803d";
  if (type === "DEDUCTION") return "#dc2626";
  return "#1d4ed8";
}

function salaryTypeIcon(type) {
  if (type === "ADVANCE" || type === "ADDITION") return "＋";
  if (type === "DEDUCTION") return "−";
  return "₹";
}

function getAdvanceLedger(transactions) {
  const ordered = (Array.isArray(transactions) ? transactions : [])
    .slice()
    .sort((a, b) => {
      const dateCompare = String(a?.date || "").localeCompare(String(b?.date || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(a?.createdAt || "").localeCompare(String(b?.createdAt || ""));
    });

  let outstanding = 0;
  let totalTaken = 0;
  let totalDeducted = 0;

  const rows = ordered.map((transaction) => {
    const amount = Number(transaction?.amount || 0);
    const isAdvance = transaction?.type === "ADVANCE" || transaction?.type === "ADDITION";
    const isDeduction = transaction?.type === "DEDUCTION";

    if (isAdvance) {
      totalTaken += amount;
      outstanding += amount;
    } else if (isDeduction) {
      totalDeducted += amount;
      outstanding = Math.max(0, outstanding - amount);
    }

    return {
      ...transaction,
      advanceBalanceAfter: outstanding,
      advanceEvent: isAdvance || isDeduction,
    };
  });

  return { rows, totalTaken, totalDeducted, outstanding: Math.max(0, outstanding) };
}

function money(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (String(phone || "").startsWith("+")) return String(phone).trim();
  return String(phone || "").trim();
}

function App() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  // Firebase phone OTP
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const confirmationResultRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);

  const [userRole, setUserRole] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const [currentPage, setCurrentPage] = useState("dashboard");

  // Employee management
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeName, setEmployeeName] = useState("");
  const [employeePhone, setEmployeePhone] = useState("");
  const [employeeRole, setEmployeeRole] = useState("EMPLOYEE");
  const [employeeSalary, setEmployeeSalary] = useState("");
  const [employeeError, setEmployeeError] = useState("");
  const [employeeMessage, setEmployeeMessage] = useState("");
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [createdTemporaryPassword, setCreatedTemporaryPassword] = useState("");
  const [createdEmployeeId, setCreatedEmployeeId] = useState("");

  // Attendance
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetailsView, setEmployeeDetailsView] = useState("home");
  const [adminModule, setAdminModule] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(todayLocal());
  const [attendanceStatus, setAttendanceStatus] = useState("PRESENT");

  // Language
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem("ssAgarwalLanguage") || "en";
    } catch {
      return "en";
    }
  });

  const translations = {
    en: {
      smartShop: "Smart Shop",
      adminDashboard: "Admin Dashboard",
      dashboardSub: "Manage your shop from one box-menu.",
      employees: "Employees",
      employeesSub: "Manage staff",
      attendance: "Attendance",
      attendanceSub: "Present / Half Day / Absent",
      salary: "Salary Updates",
      salarySub: "Salary, payments & balance",
      reports: "Reports",
      reportsSub: "Attendance & analytics",
      settings: "Settings",
      settingsSub: "Language",
      loggedInAdmin: "Logged in as ADMIN",
      language: "Language",
    },
    kn: {
      smartShop: "ಸ್ಮಾರ್ಟ್ ಶಾಪ್",
      adminDashboard: "ನಿರ್ವಾಹಕ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
      dashboardSub: "ಒಂದೇ ಬಾಕ್ಸ್ ಮೆನು ಮೂಲಕ ಅಂಗಡಿಯನ್ನು ನಿರ್ವಹಿಸಿ.",
      employees: "ಉದ್ಯೋಗಿಗಳು",
      employeesSub: "ಸಿಬ್ಬಂದಿ ನಿರ್ವಹಣೆ",
      attendance: "ಹಾಜರಾತಿ",
      attendanceSub: "ಹಾಜರು / ಅರ್ಧ ದಿನ / ಗೈರು",
      salary: "ವೇತನ ನವೀಕರಣ",
      salarySub: "ವೇತನ, ಪಾವತಿ ಮತ್ತು ಬಾಕಿ",
      reports: "ವರದಿಗಳು",
      reportsSub: "ಹಾಜರಾತಿ ಮತ್ತು ವಿಶ್ಲೇಷಣೆ",
      settings: "ಸೆಟ್ಟಿಂಗ್ಸ್",
      settingsSub: "ಭಾಷೆ",
      loggedInAdmin: "ADMIN ಆಗಿ ಲಾಗಿನ್ ಆಗಿದ್ದೀರಿ",
      language: "ಭಾಷೆ",
    },
    hi: {
      smartShop: "स्मार्ट शॉप",
      adminDashboard: "एडमिन डैशबोर्ड",
      dashboardSub: "एक ही बॉक्स मेनू से दुकान प्रबंधित करें।",
      employees: "कर्मचारी",
      employeesSub: "कर्मचारी प्रबंधन",
      attendance: "उपस्थिति",
      attendanceSub: "उपस्थित / आधा दिन / अनुपस्थित",
      salary: "वेतन अपडेट",
      salarySub: "वेतन, भुगतान और शेष",
      reports: "रिपोर्ट",
      reportsSub: "उपस्थिति और विश्लेषण",
      settings: "सेटिंग्स",
      settingsSub: "भाषा",
      loggedInAdmin: "ADMIN के रूप में लॉगिन",
      language: "भाषा",
    },
  };
  const ui = translations[language] || translations.en;

  useEffect(() => {
    try {
      localStorage.setItem("ssAgarwalLanguage", language);
    } catch {}
  }, [language]);

  // Salary
  const [salaryTransactions, setSalaryTransactions] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryTransactionType, setSalaryTransactionType] = useState("PAYMENT");
  const [salaryTransactionAmount, setSalaryTransactionAmount] = useState("");
  const [salaryTransactionDate, setSalaryTransactionDate] = useState(todayLocal());
  const [salaryDescription, setSalaryDescription] = useState("");

  // Reports
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [reportSelectedDate, setReportSelectedDate] = useState("");
  const [reportAttendanceRecords, setReportAttendanceRecords] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportCounts, setReportCounts] = useState({});

  // Work assignment
  const [assignmentEmployeeId, setAssignmentEmployeeId] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentDate, setAssignmentDate] = useState(todayLocal());
  const [assignmentSending, setAssignmentSending] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentSuccess, setAssignmentSuccess] = useState("");

  // ---- Login ----
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append("employeeId", employeeId.trim());
      params.append("password", password);

      const response = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(typeof data === "string" ? data : data?.message || "Invalid employee ID or password.");
        return;
      }

      setUserRole(data?.role || "");

      if (data?.requiresPasswordChange) {
        setRequiresPasswordChange(true);
        setOtpVerified(false);
        setOtp("");
        setOtpMessage("");
        setOtpPhone("");
        setOtpSent(false);
        setError("");
        setMessage("");

        // Load registered mobile number. OTP is sent only to the stored number.
        const employeeResponse = await fetch(`${API}/api/employees/${encodeURIComponent(employeeId.trim())}`);
        const employeeData = await employeeResponse.json().catch(() => null);
        if (!employeeResponse.ok || !employeeData?.phoneNumber) {
          setError("The employee's registered mobile number could not be found.");
          return;
        }
        setOtpPhone(normalizePhone(employeeData.phoneNumber));
      } else {
        setLoggedIn(true);
        setMessage("Login successful.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect to the Smart Shop server. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Initialize the visible reCAPTCHA after the OTP screen exists.
  // Firebase Phone Auth requires reCAPTCHA before an SMS can be requested.
  useEffect(() => {
    if (!requiresPasswordChange || otpVerified) return undefined;

    let cancelled = false;

    const setupRecaptcha = async () => {
      try {
        const auth = getFirebaseAuth();
        if (auth) auth.languageCode = "en";

        const container = document.getElementById("recaptcha-container");
        if (!container || recaptchaVerifierRef.current) return;

        const verifier = new RecaptchaVerifier(auth, container, {
          size: "normal",
          callback: () => {
            setError("");
          },
          "expired-callback": () => {
            confirmationResultRef.current = null;
            setOtpSent(false);
            setOtpMessage("Security verification expired. Please complete it again and resend the OTP.");
          },
        });

        recaptchaVerifierRef.current = verifier;
        await verifier.render();
        if (cancelled) {
          try { verifier.clear(); } catch {}
          recaptchaVerifierRef.current = null;
        }
      } catch (err) {
        console.error("reCAPTCHA initialization error:", err);
        if (!cancelled) setError(firebaseOtpError(err));
      }
    };

    const timer = window.setTimeout(setupRecaptcha, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [requiresPasswordChange, otpVerified]);

  const sendPasswordOtp = async () => {
    if (!otpPhone) {
      setError("Registered mobile number is not available.");
      return false;
    }

    setOtpSending(true);
    setError("");
    setMessage("");
    setOtpMessage("");

    try {
      const auth = getFirebaseAuth();
      auth.languageCode = "en";

      const verifier = recaptchaVerifierRef.current;
      if (!verifier) {
        throw { code: "auth/missing-app-credential" };
      }

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        normalizePhone(otpPhone),
        verifier
      );

      confirmationResultRef.current = confirmationResult;
      setOtpSent(true);
      setOtpMessage(`OTP sent to ${maskPhone(otpPhone)}.`);
      return true;
    } catch (err) {
      console.error("Firebase OTP send error:", err);
      confirmationResultRef.current = null;
      setOtpSent(false);

      try {
        recaptchaVerifierRef.current?.clear();
      } catch {}
      recaptchaVerifierRef.current = null;

      setError(firebaseOtpError(err));
      return false;
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setOtpMessage("");

    const enteredOtp = otp.trim();
    if (!/^\d{6}$/.test(enteredOtp)) {
      setError("Please enter the 6-digit OTP.");
      return;
    }
    if (!confirmationResultRef.current) {
      setError("Please request a fresh OTP first.");
      return;
    }

    setOtpVerifying(true);
    try {
      await confirmationResultRef.current.confirm(enteredOtp);
      setOtpVerified(true);
      setOtp("");
      setError("");
      setOtpMessage("Mobile number verified successfully.");
      try {
        await signOut(getFirebaseAuth());
      } catch {}
    } catch (err) {
      console.error("Firebase OTP verification error:", err);
      setError(firebaseOtpError(err, true));
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!otpVerified) {
      setError("Please verify your mobile number with OTP before creating the password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const params = new URLSearchParams();
      params.append("employeeId", employeeId.trim());
      params.append("newPassword", newPassword);

      const response = await fetch(`${API}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(typeof data === "string" ? data : data?.message || "Unable to change password.");
        return;
      }

      setRequiresPasswordChange(false);
      setOtpVerified(false);
      setOtpSent(false);
      confirmationResultRef.current = null;
      setLoggedIn(true);
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password created successfully. Welcome to Smart Shop!");
    } catch (err) {
      console.error("Password change error:", err);
      setError("Unable to connect to the Smart Shop server.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleForgotPassword = () => {
    setMessage("Please contact the shop administrator to reset your password.");
  };

  // ---- Employee APIs ----
  const loadEmployees = async () => {
    setEmployeesLoading(true);
    setEmployeeError("");
    try {
      const response = await fetch(`${API}/api/employees`);
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setEmployeeError(typeof data === "string" ? data : data?.message || "Failed to load employees.");
        return [];
      }
      const list = Array.isArray(data) ? data : [];
      setEmployees(list);
      return list;
    } catch (err) {
      console.error("Load employees error:", err);
      setEmployeeError("Unable to connect to the Smart Shop server.");
      return [];
    } finally {
      setEmployeesLoading(false);
    }
  };

  const openEmployees = async () => {
    setCurrentPage("employees");
    setAdminModule("");
    setEmployeeError("");
    setEmployeeMessage("");
    setShowEmployeeForm(false);
    setEditingEmployee(null);
    setSelectedEmployee(null);
    await loadEmployees();
  };

  const openAddEmployee = () => {
    setEditingEmployee(null);
    setEmployeeName("");
    setEmployeePhone("");
    setEmployeeRole("EMPLOYEE");
    setEmployeeSalary("");
    setEmployeeError("");
    setEmployeeMessage("");
    setCreatedTemporaryPassword("");
    setCreatedEmployeeId("");
    setShowEmployeeForm(true);
  };

  const openEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setEmployeeName(employee?.name || "");
    setEmployeePhone(employee?.phoneNumber || "");
    setEmployeeRole(employee?.role || "EMPLOYEE");
    setEmployeeSalary(employee?.monthlySalary ?? "");
    setEmployeeError("");
    setEmployeeMessage("");
    setCreatedTemporaryPassword("");
    setCreatedEmployeeId("");
    setShowEmployeeForm(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setEmployeeError("");
    setEmployeeMessage("");
    setCreatedTemporaryPassword("");
    setCreatedEmployeeId("");

    if (!employeeName.trim()) return setEmployeeError("Please enter employee name.");
    if (!/^\d{10}$/.test(employeePhone.trim())) return setEmployeeError("Please enter a valid 10-digit phone number.");
    if (employeeSalary === "" || Number(employeeSalary) < 0) return setEmployeeError("Please enter a valid monthly salary.");

    setSavingEmployee(true);
    try {
      const employeeData = {
        name: employeeName.trim(),
        phoneNumber: employeePhone.trim(),
        role: "EMPLOYEE",
        monthlySalary: Number(employeeSalary),
      };

      const response = await fetch(
        editingEmployee
          ? `${API}/api/employees/${encodeURIComponent(editingEmployee.employeeId)}`
          : `${API}/api/employees`,
        {
          method: editingEmployee ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(employeeData),
        }
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setEmployeeError(typeof data === "string" ? data : data?.message || "Failed to save employee.");
        return;
      }

      if (editingEmployee) {
        setEmployeeMessage("Employee updated successfully.");
      } else {
        setEmployeeMessage("Employee created successfully.");
        setCreatedEmployeeId(data?.employee?.employeeId || data?.employeeId || "");
        setCreatedTemporaryPassword(data?.temporaryPassword || "");
      }
      setShowEmployeeForm(false);
      setEditingEmployee(null);
      await loadEmployees();
    } catch (err) {
      console.error("Save employee error:", err);
      setEmployeeError("Unable to connect to the Smart Shop server.");
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleDeleteEmployee = async (employee) => {
    if (!window.confirm(`Are you sure you want to delete ${employee.name}?`)) return;
    setEmployeeError("");
    setEmployeeMessage("");
    try {
      const response = await fetch(`${API}/api/employees/${encodeURIComponent(employee.employeeId)}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setEmployeeError(typeof data === "string" ? data : data?.message || "Failed to delete employee.");
        return;
      }
      setEmployeeMessage("Employee deleted successfully.");
      await loadEmployees();
    } catch (err) {
      console.error("Delete employee error:", err);
      setEmployeeError("Unable to connect to the Smart Shop server.");
    }
  };

  // ---- Attendance ----
  const loadEmployeeAttendance = async (id) => {
    if (!id) return;
    setAttendanceLoading(true);
    try {
      const response = await fetch(`${API}/api/attendance/employee/${encodeURIComponent(id)}`);
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        setAttendanceRecords([]);
        setEmployeeError(typeof data === "string" ? data : data?.message || "Failed to load attendance.");
        return;
      }
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.records)
          ? data.records
          : Array.isArray(data?.attendance)
            ? data.attendance
            : [];
      setAttendanceRecords(list);
    } catch (err) {
      console.error("Attendance loading error:", err);
      setEmployeeError("Unable to load attendance.");
    } finally {
      setAttendanceLoading(false);
    }
  };

  const openAdminAttendance = async () => {
    setCurrentPage("attendance");
    setAdminModule("");
    setEmployeeError("");
    setEmployeeMessage("");
    setAttendanceDate(todayLocal());
    setAttendanceStatus("PRESENT");
    setAttendanceRecords([]);

    const list = Array.isArray(employees) && employees.length > 0
      ? employees
      : await loadEmployees();

    if (!Array.isArray(list) || list.length === 0) {
      setSelectedEmployee(null);
      setEmployeeError("No employees found. Create an employee first, then open Attendance.");
      return;
    }

    const first = list[0];
    setSelectedEmployee(first);
    await loadEmployeeAttendance(first.employeeId);
  };

  const handleSaveAttendance = async () => {
    if (!selectedEmployee) return setEmployeeError("Please select an employee.");
    if (!attendanceDate) return setEmployeeError("Please select a date.");
    if (!STATUS_OPTIONS.includes(attendanceStatus)) return setEmployeeError("Please select PRESENT, HALF DAY or ABSENT.");

    setEmployeeError("");
    setEmployeeMessage("");
    try {
      const response = await fetch(`${API}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployee.employeeId,
          date: attendanceDate,
          status: attendanceStatus,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setEmployeeError(typeof data === "string" ? data : data?.message || "Failed to save attendance.");
        return;
      }
      setEmployeeMessage("Attendance saved successfully.");
      await loadEmployeeAttendance(selectedEmployee.employeeId);
    } catch (err) {
      console.error("Save attendance error:", err);
      setEmployeeError("Unable to save attendance.");
    }
  };

  // ---- Salary ----
  const loadEmployeeSalary = async (id) => {
    if (!id) return;
    setSalaryLoading(true);
    try {
      const response = await fetch(`${API}/api/salary/employee/${encodeURIComponent(id)}`);
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        setEmployeeError(typeof data === "string" ? data : data?.message || "Failed to load salary.");
        return;
      }
      setSalaryTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Salary loading error:", err);
      setEmployeeError("Unable to load salary records.");
    } finally {
      setSalaryLoading(false);
    }
  };

  const calculateSalarySummary = (employee, transactions = salaryTransactions) => {
    const monthlySalary = Number(employee?.monthlySalary || 0);
    let salaryGiven = 0;

    transactions.forEach((transaction) => {
      const amount = Number(transaction?.amount || 0);
      if (transaction?.type === "PAYMENT") salaryGiven += amount;
    });

    const ledger = getAdvanceLedger(transactions);
    const salaryToBeGiven = Math.max(0, monthlySalary - salaryGiven - ledger.totalDeducted);

    return {
      monthlySalary,
      salaryGiven,
      salaryToBeGiven,
      advanceTaken: ledger.totalTaken,
      advanceDeducted: ledger.totalDeducted,
      advanceOutstanding: ledger.outstanding,
      remaining: salaryToBeGiven,
    };
  };

  const openAdminSalary = async () => {
    setCurrentPage("salary");
    setAdminModule("salary");
    setEmployeeError("");
    setEmployeeMessage("");
    const list = employees.length ? employees : await loadEmployees();
    const first = list?.[0] || null;
    setSelectedEmployee(first);
    setSalaryTransactionDate(todayLocal());
    setSalaryTransactionType("PAYMENT");
    setSalaryTransactionAmount("");
    setSalaryDescription("");
    if (first) await loadEmployeeSalary(first.employeeId);
    else setSalaryTransactions([]);
  };

  const handleSaveSalaryTransaction = async () => {
    if (!selectedEmployee) return setEmployeeError("Please select an employee.");

    const amount = Number(salaryTransactionAmount);
    if (!salaryTransactionDate) return setEmployeeError("Please select a date.");
    if (!SALARY_TYPES.some((item) => item.value === salaryTransactionType)) return setEmployeeError("Please select a salary option.");
    if (!Number.isFinite(amount) || amount <= 0) return setEmployeeError("Please enter a valid amount.");

    const currentSummary = calculateSalarySummary(selectedEmployee);
    if (salaryTransactionType === "DEDUCTION" && amount > currentSummary.advanceOutstanding) {
      return setEmployeeError(`Deduction cannot be more than the outstanding advance of ${money(currentSummary.advanceOutstanding)}.`);
    }

    setEmployeeError("");
    setEmployeeMessage("");
    try {
      const response = await fetch(`${API}/api/salary/transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployee.employeeId,
          date: salaryTransactionDate,
          type: salaryTransactionType,
          amount,
          description: salaryDescription.trim(),
        }),
      });

      const rawResponse = await response.text();
      let data = null;
      try { data = rawResponse ? JSON.parse(rawResponse) : null; } catch { data = rawResponse; }

      if (!response.ok) {
        const backendMessage = typeof data === "string" ? data : data?.message || data?.error || `HTTP ${response.status} while saving salary transaction.`;
        console.error("Salary backend rejection:", response.status, data);
        setEmployeeError(backendMessage);
        return;
      }

      setEmployeeMessage(`${salaryTypeLabel(salaryTransactionType)} saved successfully on ${salaryTransactionDate}.`);
      setSalaryTransactionAmount("");
      setSalaryDescription("");
      await loadEmployeeSalary(selectedEmployee.employeeId);
    } catch (err) {
      console.error("Save salary transaction error:", err);
      setEmployeeError("Unable to save salary transaction. Please make sure the backend is running.");
    }
  };


  // ---- Work assignment ----
  const openWorkAssignment = async () => {
    setCurrentPage("workAssignment");
    setAdminModule("workAssignment");
    setAssignmentError("");
    setAssignmentSuccess("");
    const list = employees.length ? employees : await loadEmployees();
    if (!assignmentEmployeeId && list?.length) setAssignmentEmployeeId(list[0].employeeId);
    setAssignmentDate(todayLocal());
  };

  const handleSendWorkAssignment = async () => {
    const employee = employees.find((item) => item.employeeId === assignmentEmployeeId);
    if (!employee) return setAssignmentError("Please select an employee.");
    if (!assignmentTitle.trim()) return setAssignmentError("Please enter a work title.");
    if (!assignmentMessage.trim()) return setAssignmentError("Please enter the work message.");

    setAssignmentSending(true);
    setAssignmentError("");
    setAssignmentSuccess("");
    try {
      const response = await fetch(`${API}/api/work-assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.employeeId,
          employeeName: employee.name,
          title: assignmentTitle.trim(),
          message: assignmentMessage.trim(),
          assignedDate: assignmentDate || todayLocal(),
        }),
      });
      const raw = await response.text();
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
      if (!response.ok) {
        setAssignmentError(typeof data === "string" ? data : data?.message || data?.error || `HTTP ${response.status} while sending work assignment.`);
        return;
      }
      setAssignmentSuccess(`Work assigned to ${employee.name}. The employee portal will show a popup.`);
      setAssignmentTitle("");
      setAssignmentMessage("");
    } catch (err) {
      console.error("Work assignment error:", err);
      setAssignmentError(`Unable to send work assignment. ${err?.message || "Backend is not reachable. Make sure the Work Assignment backend files are inside the project backend folder and restart Spring Boot."}`);
    } finally {
      setAssignmentSending(false);
    }
  };

  // ---- Reports ----
  const loadAttendanceReport = async (monthValue) => {
    if (!monthValue) return;
    setReportLoading(true);
    setReportError("");
    try {
      const list = employees.length ? employees : await loadEmployees();
      const results = await Promise.all(
        list.map(async (employee) => {
          try {
            const response = await fetch(`${API}/api/attendance/employee/${encodeURIComponent(employee.employeeId)}`);
            const data = await response.json().catch(() => []);
            if (!response.ok || !Array.isArray(data)) return [];
            return data.map((record) => ({ ...record, employeeName: employee.name, employeeId: employee.employeeId }));
          } catch {
            return [];
          }
        })
      );

      const monthRecords = results.flat().filter((record) => String(record.date || "").startsWith(monthValue));
      const counts = {};
      monthRecords.forEach((record) => {
        const date = String(record.date);
        if (!counts[date]) counts[date] = { present: 0, halfDay: 0, absent: 0, total: 0 };
        counts[date].total += 1;
        if (record.status === "PRESENT") counts[date].present += 1;
        if (record.status === "HALF DAY") counts[date].halfDay += 1;
        if (record.status === "ABSENT") counts[date].absent += 1;
      });

      setReportAttendanceRecords(monthRecords);
      setReportCounts(counts);
      setReportSelectedDate((current) => current && current.startsWith(monthValue) ? current : `${monthValue}-01`);
    } catch (err) {
      console.error("Monthly report error:", err);
      setReportError("Unable to load attendance report. Please make sure the backend is running.");
    } finally {
      setReportLoading(false);
    }
  };

  const openAdminReports = async () => {
    setCurrentPage("reports");
    setAdminModule("reports");
    await loadAttendanceReport(reportMonth);
  };

  useEffect(() => {
    if (loggedIn && userRole === "ADMIN" && currentPage === "reports" && adminModule === "reports") {
      loadAttendanceReport(reportMonth);
    }
  }, [reportMonth]);

  const backToDashboard = () => {
    setCurrentPage("dashboard");
    setAdminModule("");
    setEmployeeError("");
    setEmployeeMessage("");
    setShowEmployeeForm(false);
    setEditingEmployee(null);
    setSelectedEmployee(null);
    setAttendanceRecords([]);
    setSalaryTransactions([]);
    setEmployeeDetailsView("home");
    setAssignmentError("");
    setAssignmentSuccess("");
  };

  const openEmployeeDetails = async (employee) => {
    setSelectedEmployee(employee);
    setEmployeeDetailsView("home");
    setAttendanceRecords([]);
    setSalaryTransactions([]);
    setAttendanceDate(todayLocal());
    setAttendanceStatus("PRESENT");
    await Promise.all([
      loadEmployeeAttendance(employee.employeeId),
      loadEmployeeSalary(employee.employeeId),
    ]);
  };

  const getCalendarDays = (monthValue) => {
    if (!monthValue) return [];
    const [year, month] = monthValue.split("-").map(Number);
    const first = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0).getDate();
    const days = [];
    for (let i = 0; i < first.getDay(); i += 1) days.push(null);
    for (let day = 1; day <= lastDay; day += 1) {
      days.push(`${monthValue}-${String(day).padStart(2, "0")}`);
    }
    return days;
  };

  const selectedReportRecords = useMemo(
    () => reportAttendanceRecords.filter((record) => String(record.date) === reportSelectedDate),
    [reportAttendanceRecords, reportSelectedDate]
  );
  const selectedReportSummary = reportCounts[reportSelectedDate] || { present: 0, halfDay: 0, absent: 0, total: 0 };

  // Logout also clears the Firebase phone session if one was left open.
  const logout = async () => {
    setLoggedIn(false);
    setUserRole("");
    setCurrentPage("dashboard");
    setEmployeeId("");
    setPassword("");
    setRequiresPasswordChange(false);
    setOtpVerified(false);
    setOtpSent(false);
    confirmationResultRef.current = null;
    try {
      if (recaptchaVerifierRef.current) recaptchaVerifierRef.current.clear();
    } catch {}
    recaptchaVerifierRef.current = null;
    try {
      await signOut(getFirebaseAuth());
    } catch {}
  };

  // ---- Employee password-change screen ----
  if (loggedIn && userRole === "EMPLOYEE") {
    return (<><GlobalStyles /><EmployeeDashboard employeeId={employeeId} onLogout={logout} /></>);
  }

  if (loggedIn && userRole === "ADMIN") {
    if (currentPage === "employees" && selectedEmployee) {
      return (
        <EmployeeDetailsPage
          employee={selectedEmployee}
          attendance={attendanceRecords}
          attendanceLoading={attendanceLoading}
          transactions={salaryTransactions}
          salaryLoading={salaryLoading}
          summary={calculateSalarySummary(selectedEmployee)}
          onBack={() => {
            setSelectedEmployee(null);
            setEmployeeDetailsView("home");
          }}
        />
      );
    }

    if (currentPage === "employees") {
      return (
        <EmployeeManagementPage
          employees={employees}
          loading={employeesLoading}
          showForm={showEmployeeForm}
          editingEmployee={editingEmployee}
          employeeName={employeeName}
          employeePhone={employeePhone}
          employeeRole={employeeRole}
          employeeSalary={employeeSalary}
          error={employeeError}
          message={employeeMessage}
          createdEmployeeId={createdEmployeeId}
          createdTemporaryPassword={createdTemporaryPassword}
          saving={savingEmployee}
          selectedEmployee={selectedEmployee}
          onAdd={openAddEmployee}
          onEdit={openEditEmployee}
          onDelete={handleDeleteEmployee}
          onOpenDetails={openEmployeeDetails}
          onCloseForm={() => { setShowEmployeeForm(false); setEditingEmployee(null); }}
          onSave={handleSaveEmployee}
          setName={setEmployeeName}
          setPhone={setEmployeePhone}
          setSalary={setEmployeeSalary}
          onBack={backToDashboard}
        />
      );
    }

    if (currentPage === "attendance") {
      return (
        <AdminAttendancePage
          employees={employees}
          selectedEmployee={selectedEmployee}
          setSelectedEmployee={async (employee) => {
            setSelectedEmployee(employee);
            if (employee) await loadEmployeeAttendance(employee.employeeId);
            else setAttendanceRecords([]);
          }}
          date={attendanceDate}
          setDate={setAttendanceDate}
          status={attendanceStatus}
          setStatus={setAttendanceStatus}
          records={attendanceRecords}
          loading={attendanceLoading}
          error={employeeError}
          message={employeeMessage}
          onSave={handleSaveAttendance}
          onBack={backToDashboard}
        />
      );
    }

    if (currentPage === "salary") {
      return (
        <AdminSalaryPage
          employees={employees}
          selectedEmployee={selectedEmployee}
          setSelectedEmployee={async (employee) => {
            setSelectedEmployee(employee);
            if (employee) await loadEmployeeSalary(employee.employeeId);
            else setSalaryTransactions([]);
          }}
          transactions={salaryTransactions}
          summary={calculateSalarySummary(selectedEmployee)}
          loading={salaryLoading}
          type={salaryTransactionType}
          setType={setSalaryTransactionType}
          amount={salaryTransactionAmount}
          setAmount={setSalaryTransactionAmount}
          date={salaryTransactionDate}
          setDate={setSalaryTransactionDate}
          description={salaryDescription}
          setDescription={setSalaryDescription}
          error={employeeError}
          message={employeeMessage}
          onSave={handleSaveSalaryTransaction}
          onBack={backToDashboard}
        />
      );
    }

    if (currentPage === "workAssignment") {
      return (
        <AdminWorkAssignmentPage
          employees={employees}
          employeeId={assignmentEmployeeId}
          setEmployeeId={setAssignmentEmployeeId}
          title={assignmentTitle}
          setTitle={setAssignmentTitle}
          message={assignmentMessage}
          setMessage={setAssignmentMessage}
          date={assignmentDate}
          setDate={setAssignmentDate}
          sending={assignmentSending}
          error={assignmentError}
          success={assignmentSuccess}
          onSend={handleSendWorkAssignment}
          onBack={backToDashboard}
        />
      );
    }

    if (currentPage === "reports") {
      return (
        <ReportsModule
          month={reportMonth}
          setMonth={setReportMonth}
          loading={reportLoading}
          error={reportError}
          counts={reportCounts}
          selectedDate={reportSelectedDate}
          setSelectedDate={setReportSelectedDate}
          selectedRecords={selectedReportRecords}
          selectedSummary={selectedReportSummary}
          getCalendarDays={getCalendarDays}
          onBack={backToDashboard}
        />
      );
    }

    if (currentPage === "settings") {
      return <SettingsModule language={language} setLanguage={setLanguage} ui={ui} onBack={backToDashboard} />;
    }

    return (
      <>
        <GlobalStyles />
        <AdminDashboard
        ui={ui}
        onEmployees={openEmployees}
        onAttendance={openAdminAttendance}
        onSalary={openAdminSalary}
        onWorkAssignment={openWorkAssignment}
        onReports={openAdminReports}
        onSettings={() => { setCurrentPage("settings"); setAdminModule("settings"); }}
        onLogout={logout}
      />
      </>
    );
  }

  if (requiresPasswordChange) {
    return (
      <>
        <GlobalStyles />
        <div className="app">
          <div className="login-container">
          <div className="brand-section">
            <div className="brand-logo">SS</div>
            <h1>S.S. AGARWAL</h1>
            <h2>CLOTH MERCHANT</h2>
            <p>Smart Shop Management System</p>
          </div>

          <div className="login-card">
            {!otpVerified ? (
              <>
                <h3>Verify Mobile Number</h3>
                <p className="login-subtitle">
                  We will verify the mobile number registered for {employeeId}.
                </p>

                <div style={{ padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", marginBottom: "12px", textAlign: "center", fontWeight: "800" }}>
                  {otpPhone ? maskPhone(otpPhone) : "Loading registered number..."}
                </div>

                <div id="recaptcha-container" style={{ margin: "10px 0 14px", minHeight: "78px", display: "flex", justifyContent: "center" }} />

                <form onSubmit={handleVerifyOtp}>
                  <div className="input-group">
                    <label>6-Digit OTP</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🔢</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                      />
                    </div>
                  </div>

                  {otpMessage && <div style={{ color: "#15803d", marginBottom: "12px", padding: "10px", background: "#dcfce7", borderRadius: "8px", fontSize: "14px", textAlign: "center" }}>{otpMessage}</div>}
                  {error && <div style={{ color: "#dc2626", marginBottom: "12px", padding: "10px", background: "#fee2e2", borderRadius: "8px", fontSize: "14px", textAlign: "center" }}>{error}</div>}

                  <button type="submit" className="login-button" disabled={otpVerifying || otpSending || !otpSent}>
                    {otpVerifying ? "VERIFYING..." : "VERIFY OTP"}
                  </button>
                </form>

                <button type="button" className="login-button" style={{ marginTop: "10px", background: "#334155" }} onClick={sendPasswordOtp} disabled={otpSending}>
                  {otpSending ? "SENDING OTP..." : otpSent ? "RESEND OTP" : "SEND OTP"}
                </button>
                <div style={{ marginTop: 8, color: "#64748b", fontSize: 11, textAlign: "center" }}>Complete the reCAPTCHA above before sending the OTP.</div>
              </>
            ) : (
              <>
                <h3>Create New Password</h3>
                <p className="login-subtitle">Your mobile number is verified. Create your permanent password.</p>
                <form onSubmit={handleChangePassword}>
                  <div className="input-group">
                    <label>New Password</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🔒</span>
                      <input type={showNewPassword ? "text" : "password"} placeholder="Create new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                      <button type="button" className="password-toggle" onClick={() => setShowNewPassword(!showNewPassword)}>{showNewPassword ? "Hide" : "Show"}</button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Confirm New Password</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🔒</span>
                      <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                      <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? "Hide" : "Show"}</button>
                    </div>
                  </div>

                  {error && <div style={{ color: "#dc2626", marginBottom: "12px", padding: "10px", background: "#fee2e2", borderRadius: "8px", fontSize: "14px", textAlign: "center" }}>{error}</div>}
                  {message && <div style={{ color: "#15803d", marginBottom: "12px", padding: "10px", background: "#dcfce7", borderRadius: "8px", fontSize: "14px", textAlign: "center" }}>{message}</div>}

                  <button type="submit" className="login-button" disabled={changingPassword}>
                    {changingPassword ? "CREATING PASSWORD..." : "CREATE PASSWORD"}
                  </button>
                </form>
                <div className="security-note" style={{ marginTop: "15px", color: "#15803d" }}>
                  🔐 OTP verified. Your password will be securely encrypted.
                </div>
              </>
            )}
          </div>

          <div className="footer">© 2026 S.S. Agarwal Cloth Merchant</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      <div className="app">
        <div className="login-container">
        <div className="brand-section">
          <div className="brand-logo">SS</div>
          <h1>S.S. AGARWAL</h1>
          <h2>CLOTH MERCHANT</h2>
          <p>Smart Shop Management System</p>
        </div>

        <div className="login-card">
          <h3>Welcome Back</h3>
          <p className="login-subtitle">Sign in to continue</p>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Employee ID</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input type="text" placeholder="Enter employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
              </div>
            </div>

            <div className="forgot-password">
              <button type="button" onClick={handleForgotPassword}>Forgot Password?</button>
            </div>

            {error && <div style={{ color: "#dc2626", marginBottom: "12px", fontSize: "14px", textAlign: "center" }}>{error}</div>}
            {message && <div style={{ color: "#15803d", marginBottom: "12px", fontSize: "14px", textAlign: "center" }}>{message}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "LOGGING IN..." : "LOGIN"}
            </button>
          </form>
          <div className="security-note">🔐 Secure employee & admin access</div>
        </div>

        <div className="footer">© 2026 S.S. Agarwal Cloth Merchant</div>
        </div>
      </div>
    </>
  );
}

function AdminDashboard({ ui, onEmployees, onAttendance, onSalary, onWorkAssignment, onReports, onSettings, onLogout }) {
  const menu = [
    ["👥", ui.employees, ui.employeesSub, onEmployees],
    ["📅", ui.attendance, ui.attendanceSub, onAttendance],
    ["💰", ui.salary, ui.salarySub, onSalary],
    ["📋", "Work Assignment", "Assign work to employees", onWorkAssignment],
    ["📊", ui.reports, ui.reportsSub, onReports],
    ["⚙️", ui.settings, ui.settingsSub, onSettings],
  ];
  return (
    <>
      <GlobalStyles />
      <div className="smart-page">
        <div className="smart-inner">
        <div className="smart-header">
          <div>
            <div className="eyebrow">SS AGARWAL</div>
            <div className="smart-title">{ui.smartShop}</div>
            <div className="smart-subtitle">{ui.adminDashboard}</div>
          </div>
          <button type="button" className="top-button" onClick={onLogout}>Logout</button>
        </div>

        <div className="smart-card">
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "22px", fontWeight: 900 }}>{ui.adminDashboard}</div>
            <div style={{ color: "#64748b", fontSize: "12px", marginTop: 3 }}>{ui.dashboardSub}</div>
          </div>
          <div className="menu-grid">
            {menu.map(([icon, title, subtitle, onClick]) => (
              <button key={title} type="button" className="menu-box" onClick={onClick}>
                <div style={{ fontSize: 28 }}>{icon}</div>
                <div style={{ marginTop: 6, fontSize: 14, fontWeight: 900 }}>{title}</div>
                <div style={{ marginTop: 3, color: "#64748b", fontSize: 11 }}>{subtitle}</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: "8px 10px", background: "#effdf3", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 10, textAlign: "center", fontSize: 11, fontWeight: 800 }}>
            👑 {ui.loggedInAdmin}
          </div>
        </div>

        <div className="smart-footer">© 2026 S.S. Agarwal Cloth Merchant</div>
      </div>
    </div>
    </>
  );
}

function EmployeeManagementPage({ employees, loading, showForm, editingEmployee, employeeName, employeePhone, employeeRole, employeeSalary, error, message, createdEmployeeId, createdTemporaryPassword, saving, onAdd, onEdit, onDelete, onOpenDetails, onCloseForm, onSave, setName, setPhone, setSalary, onBack }) {
  return (
    <AdminModuleShell title="Employees" subtitle="Manage staff" onBack={onBack}>
      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      {createdEmployeeId && (
        <div style={{ marginBottom: 12, padding: 12, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12 }}>
          <div style={{ fontWeight: 900 }}>New employee created</div>
          <div style={{ marginTop: 5, fontSize: 12 }}>Employee ID: <strong>{createdEmployeeId}</strong></div>
          <div style={{ marginTop: 3, fontSize: 12 }}>Temporary Password: <strong>{createdTemporaryPassword || "Generated by backend"}</strong></div>
          <div style={{ marginTop: 6, fontSize: 11, color: "#475569" }}>Share these credentials securely. The employee must verify the registered mobile number and create a permanent password at first login.</div>
        </div>
      )}

      {!showForm ? (
        <>
          <button type="button" className="primary-action" onClick={onAdd}>+ ADD EMPLOYEE</button>
          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "#64748b" }}>Loading employees...</div>
          ) : employees.length === 0 ? (
            <div style={{ padding: 22, textAlign: "center", color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, marginTop: 10 }}>No employees found.</div>
          ) : (
            <div className="card-grid-2" style={{ marginTop: 10 }}>
              {employees.map((employee) => (
                <div key={employee.employeeId} className="item-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900 }}>{employee.name}</div>
                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{employee.employeeId}</div>
                    </div>
                    <span className="status-pill">{employee.active === false ? "INACTIVE" : "ACTIVE"}</span>
                  </div>
                  <div className="mini-info-grid" style={{ marginTop: 8 }}>
                    <InfoRow label="Phone" value={employee.phoneNumber || "—"} />
                    <InfoRow label="Monthly Salary" value={money(employee.monthlySalary)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8 }}>
                    <button type="button" className="small-button" onClick={() => onOpenDetails(employee)}>Open</button>
                    <button type="button" className="small-button" onClick={() => onEdit(employee)}>Edit</button>
                    <button type="button" className="small-button danger" onClick={() => onDelete(employee)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <form onSubmit={onSave}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{editingEmployee ? "Edit Employee" : "Add Employee"}</div>
            <button type="button" className="small-button" onClick={onCloseForm}>Close</button>
          </div>
          <div className="form-grid-2">
            <div className="input-group"><label>Name</label><input value={employeeName} onChange={(e) => setName(e.target.value)} required placeholder="Employee name" /></div>
            <div className="input-group"><label>10-Digit Phone</label><input value={employeePhone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} required inputMode="numeric" placeholder="9876543210" /></div>
            <div className="input-group"><label>Role</label><input value="EMPLOYEE" readOnly /></div>
            <div className="input-group"><label>Monthly Salary</label><input type="number" min="0" step="0.01" value={employeeSalary} onChange={(e) => setSalary(e.target.value)} required /></div>
          </div>
          <button type="submit" className="primary-action" disabled={saving} style={{ marginTop: 10 }}>{saving ? "SAVING..." : editingEmployee ? "UPDATE EMPLOYEE" : "CREATE EMPLOYEE"}</button>
        </form>
      )}

      {employeeRole !== "EMPLOYEE" && null}
    </AdminModuleShell>
  );
}

function EmployeeDetailsPage({ employee, attendance, attendanceLoading, transactions, salaryLoading, summary, onBack }) {
  const ledger = getAdvanceLedger(transactions);
  return (
    <AdminModuleShell title="Employee Details" subtitle={`${employee?.name || "Employee"} • ${employee?.employeeId || ""}`} onBack={onBack}>
      <div className="mini-info-grid">
        <InfoRow label="Name" value={employee?.name || "—"} />
        <InfoRow label="Employee ID" value={employee?.employeeId || "—"} />
        <InfoRow label="Phone" value={employee?.phoneNumber || "—"} />
        <InfoRow label="Role" value={employee?.role || "EMPLOYEE"} />
        <InfoRow label="Monthly Salary" value={money(summary.monthlySalary)} />
        <InfoRow label="Salary To Be Given" value={money(summary.salaryToBeGiven)} />
        <InfoRow label="Advance Taken" value={money(summary.advanceTaken)} />
        <InfoRow label="Advance Outstanding" value={money(summary.advanceOutstanding)} />
      </div>

      <div style={{ marginTop: 12, padding: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, textAlign: "center" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Employee Barcode</div>
        <EmployeeBarcode value={employee?.employeeId || ""} />
        <div style={{ marginTop: 7, fontSize: 10, color: "#64748b" }}>{employee?.employeeId || "—"}</div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 7 }}>Attendance</div>
        {attendanceLoading ? <div style={{ padding: 15, textAlign: "center", color: "#64748b" }}>Loading attendance...</div> : attendance.length === 0 ? <div className="item-card" style={{ color: "#64748b" }}>No attendance records.</div> : <div className="card-grid-2">{attendance.slice().sort((a,b) => String(b.date).localeCompare(String(a.date))).map((record) => <div key={record.attendanceId || `${record.date}-${record.status}`} className="item-card"><div style={{ fontWeight: 900 }}>{record.date}</div><div style={{ marginTop: 4, fontSize: 11, fontWeight: 900, color: record.status === "PRESENT" ? "#15803d" : record.status === "ABSENT" ? "#dc2626" : "#ca8a04" }}>{record.status}</div></div>)}</div>}
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 7 }}>Salary & Advance Ledger</div>
        <div className="mini-info-grid" style={{ marginBottom: 8 }}>
          <InfoRow label="Salary Given" value={money(summary.salaryGiven)} />
          <InfoRow label="Salary To Be Given" value={money(summary.salaryToBeGiven)} />
          <InfoRow label="Advance Taken" value={money(summary.advanceTaken)} />
          <InfoRow label="Advance Deducted" value={money(summary.advanceDeducted)} />
          <InfoRow label="Advance Outstanding" value={money(summary.advanceOutstanding)} />
        </div>
        {salaryLoading ? <div style={{ padding: 15, textAlign: "center", color: "#64748b" }}>Loading salary...</div> : transactions.length === 0 ? <div className="item-card" style={{ color: "#64748b" }}>No salary transactions.</div> : <div style={{ display: "grid", gap: 6 }}>{ledger.rows.slice().reverse().map((transaction, index) => <div key={transaction.transactionId || `${transaction.date}-${transaction.type}-${index}`} className="item-card"><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div><div style={{ fontWeight: 900, color: salaryTypeColor(transaction.type) }}>{salaryTypeIcon(transaction.type)} {salaryTypeLabel(transaction.type)}</div><div style={{ color: "#64748b", fontSize: 10, marginTop: 2 }}>Date: {transaction.date}</div></div><strong style={{ color: salaryTypeColor(transaction.type) }}>{transaction.type === "DEDUCTION" ? "−" : "+"}{money(transaction.amount)}</strong></div>{transaction.advanceEvent && <div style={{ marginTop: 5, fontSize: 10, color: "#64748b" }}>Advance balance after this transaction: <strong>{money(transaction.advanceBalanceAfter)}</strong></div>}{transaction.description && <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>{transaction.description}</div>}</div>)}</div>}
      </div>
    </AdminModuleShell>
  );
}

function AdminWorkAssignmentPage({ employees, employeeId, setEmployeeId, title, setTitle, message, setMessage, date, setDate, sending, error, success, onSend, onBack }) {
  const safeEmployees = Array.isArray(employees) ? employees : [];

  return (
    <AdminModuleShell
      title="Work Assignment"
      subtitle="Assign work to an employee"
      onBack={onBack}
    >
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <div className="input-group">
        <label>Employee</label>
        <select
          value={employeeId || ""}
          onChange={(e) => setEmployeeId(e.target.value)}
        >
          <option value="">Select employee</option>
          {safeEmployees.map((employee) => (
            <option key={employee.employeeId} value={employee.employeeId}>
              {employee.name} — {employee.employeeId}
            </option>
          ))}
        </select>
      </div>

      <div className="form-grid-2" style={{ marginTop: 10 }}>
        <div className="input-group">
          <label>Assignment Date</label>
          <input
            type="date"
            value={date || ""}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Work Title</label>
          <input
            type="text"
            value={title || ""}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Example: Arrange shirt section"
            maxLength={100}
          />
        </div>
      </div>

      <div className="input-group" style={{ marginTop: 10 }}>
        <label>Work Details</label>
        <textarea
          value={message || ""}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter the work instructions for the employee"
          rows={5}
          maxLength={1000}
          style={{
            width: "100%",
            boxSizing: "border-box",
            resize: "vertical",
            padding: 10,
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            fontSize: 12,
            outline: "none",
          }}
        />
      </div>

      <button
        type="button"
        className="primary-action"
        onClick={onSend}
        disabled={sending || !employeeId || !title.trim() || !message.trim()}
        style={{ marginTop: 10 }}
      >
        {sending ? "SENDING WORK..." : "SEND WORK ASSIGNMENT"}
      </button>

      <div style={{ marginTop: 12, padding: 11, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 11, color: "#64748b" }}>
        The selected employee will receive this assignment in the employee portal.
      </div>
    </AdminModuleShell>
  );
}

function AdminAttendancePage({ employees, selectedEmployee, setSelectedEmployee, date, setDate, status, setStatus, records, loading, error, message, onSave, onBack }) {
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeRecords = Array.isArray(records) ? records : [];

  return (
    <AdminModuleShell title="Attendance" subtitle="Present / Half Day / Absent" onBack={onBack}>
      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <div className="form-grid-2">
        <div className="input-group">
          <label>Employee</label>
          <select
            value={selectedEmployee?.employeeId || ""}
            onChange={(e) => {
              const employee = safeEmployees.find((item) => item?.employeeId === e.target.value) || null;
              setSelectedEmployee(employee);
            }}
          >
            <option value="">Select employee</option>
            {safeEmployees.map((employee) => (
              <option key={employee.employeeId} value={employee.employeeId}>
                {employee.name} — {employee.employeeId}
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label>Date</label>
          <input type="date" value={date || ""} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 12, padding: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 900 }}>Selected Employee</div>
        {selectedEmployee ? (
          <div className="mini-info-grid" style={{ marginTop: 8 }}>
            <InfoRow label="Name" value={selectedEmployee.name || "—"} />
            <InfoRow label="Employee ID" value={selectedEmployee.employeeId || "—"} />
            <InfoRow label="Phone" value={selectedEmployee.phoneNumber || "—"} />
            <InfoRow label="Date" value={date || "—"} />
          </div>
        ) : (
          <div style={{ marginTop: 6, color: "#64748b", fontSize: 11 }}>Select an employee to mark attendance.</div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 7 }}>Status</div>
        <div className="status-choice-grid">
          {STATUS_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className={`status-choice ${status === item ? "selected" : ""}`}
              onClick={() => setStatus(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="primary-action"
        onClick={onSave}
        disabled={!selectedEmployee || !date}
        style={{ marginTop: 10 }}
      >
        SAVE ATTENDANCE
      </button>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 7 }}>Attendance History</div>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Loading attendance...</div>
        ) : safeRecords.length === 0 ? (
          <div style={{ padding: 14, color: "#64748b", background: "#f8fafc", borderRadius: 10 }}>
            No attendance records for this employee.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
            {safeRecords
              .slice()
              .sort((a, b) => String(b?.date || "").localeCompare(String(a?.date || "")))
              .map((record, index) => (
                <div key={record.attendanceId || `${record.date}-${record.status}-${index}`} className="item-card">
                  <div style={{ fontWeight: 900 }}>{record.date || "—"}</div>
                  <div
                    style={{
                      marginTop: 4,
                      color: record.status === "PRESENT" ? "#15803d" : record.status === "ABSENT" ? "#dc2626" : "#ca8a04",
                      fontWeight: 900,
                      fontSize: 11,
                    }}
                  >
                    {record.status || "—"}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </AdminModuleShell>
  );
}

function AdminSalaryPage({ employees, selectedEmployee, setSelectedEmployee, transactions, summary, loading, type, setType, amount, setAmount, date, setDate, description, setDescription, error, message, onSave, onBack }) {
  const ledger = getAdvanceLedger(transactions);

  return (
    <AdminModuleShell title="Salary Updates" subtitle="Salary / Advance Amount / Deduction of Advance" onBack={onBack}>
      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <div className="input-group">
        <label>Employee</label>
        <select value={selectedEmployee?.employeeId || ""} onChange={(e) => setSelectedEmployee(employees.find((item) => item.employeeId === e.target.value) || null)}>
          <option value="">Select employee</option>
          {employees.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.name} — {employee.employeeId}</option>)}
        </select>
      </div>

      {selectedEmployee && (
        <>
          <div className="mini-info-grid" style={{ marginTop: 10 }}>
            <InfoRow label="Phone" value={selectedEmployee.phoneNumber || "—"} />
            <InfoRow label="Role" value={selectedEmployee.role || "EMPLOYEE"} />
            <InfoRow label="Monthly Salary" value={money(summary.monthlySalary)} />
            <InfoRow label="Salary To Be Given" value={money(summary.salaryToBeGiven)} />
            <InfoRow label="Advance Taken" value={money(summary.advanceTaken)} />
            <InfoRow label="Advance Outstanding" value={money(summary.advanceOutstanding)} />
          </div>

          <div style={{ marginTop: 8, padding: 10, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 11 }}>
            Total advance deducted: <strong>{money(summary.advanceDeducted)}</strong>
          </div>
        </>
      )}

      <div className="form-grid-2" style={{ marginTop: 12 }}>
        <div className="input-group"><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="input-group"><label>Transaction</label><select value={type} onChange={(e) => setType(e.target.value)}>{SALARY_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div className="input-group"><label>Amount</label><input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div>
        <div className="input-group"><label>Current Advance Balance</label><input value={selectedEmployee ? money(summary.advanceOutstanding) : "—"} readOnly /></div>
      </div>
      <div className="input-group" style={{ marginTop: 8 }}><label>Description (optional)</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Example: advance for family need" /></div>
      <button type="button" className="primary-action" onClick={onSave}>SAVE {salaryTypeLabel(type).toUpperCase()}</button>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 7 }}>Transaction history</div>
        {loading ? <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Loading salary...</div> : transactions.length === 0 ? <div style={{ padding: 14, color: "#64748b", background: "#f8fafc", borderRadius: 10 }}>No salary transactions.</div> : (
          <div style={{ display: "grid", gap: 7 }}>
            {ledger.rows.slice().reverse().map((transaction, index) => (
              <div key={transaction.transactionId || `${transaction.date}-${transaction.type}-${index}`} className="item-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center", background: `${salaryTypeColor(transaction.type)}18`, color: salaryTypeColor(transaction.type), fontWeight: 900, fontSize: 17 }}>{salaryTypeIcon(transaction.type)}</div>
                    <div>
                      <div style={{ fontWeight: 900, color: salaryTypeColor(transaction.type) }}>{salaryTypeLabel(transaction.type)}</div>
                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{transaction.date}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 900, color: salaryTypeColor(transaction.type) }}>{transaction.type === "DEDUCTION" ? "−" : "+"}{money(transaction.amount)}</div>
                    {transaction.advanceEvent && <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>Advance balance: {money(transaction.advanceBalanceAfter)}</div>}
                  </div>
                </div>
                {transaction.description && <div style={{ marginTop: 5, color: "#64748b", fontSize: 11 }}>{transaction.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminModuleShell>
  );
}

function ReportsModule({ month, setMonth, loading, error, counts, selectedDate, setSelectedDate, selectedRecords, selectedSummary, getCalendarDays, onBack }) {
  const monthLabel = month ? new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "Attendance Report";
  return (
    <AdminModuleShell title="Reports" subtitle="Attendance by month and date" onBack={onBack}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 17, fontWeight: 900 }}>📊 Attendance — {monthLabel}</div>
        <div className="input-group" style={{ minWidth: 170 }}><label>Month</label><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {loading ? <div style={{ padding: 30, textAlign: "center", color: "#64748b" }}>Loading attendance report...</div> : <>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 5 }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} style={{ textAlign: "center", fontSize: 10, fontWeight: 900, color: "#64748b", padding: "5px 0" }}>{day}</div>)}
          {getCalendarDays(month).map((date, index) => {
            if (!date) return <div key={`blank-${index}`} />;
            const c = counts[date] || { present: 0, halfDay: 0, absent: 0, total: 0 };
            const selected = date === selectedDate;
            return <button key={date} type="button" onClick={() => setSelectedDate(date)} style={{ minHeight: 70, padding: 6, textAlign: "left", borderRadius: 10, cursor: "pointer", border: selected ? "2px solid #1d4ed8" : "1px solid #e2e8f0", background: selected ? "#eef6ff" : "#fff" }}><div style={{ fontSize: 12, fontWeight: 900 }}>{Number(date.slice(-2))}</div><div style={{ marginTop: 4, fontSize: 9, color: "#166534", fontWeight: 900 }}>P {c.present}</div><div style={{ marginTop: 1, fontSize: 9, color: "#92400e", fontWeight: 900 }}>H {c.halfDay}</div><div style={{ marginTop: 1, fontSize: 9, color: "#991b1b", fontWeight: 900 }}>A {c.absent}</div></button>;
          })}
        </div>
        <div style={{ marginTop: 12, padding: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{selectedDate || "Select a date"}</div>
          <div className="mini-info-grid" style={{ marginTop: 8 }}><InfoRow label="Present" value={selectedSummary.present} /><InfoRow label="Half Day" value={selectedSummary.halfDay} /><InfoRow label="Absent" value={selectedSummary.absent} /><InfoRow label="Records" value={selectedSummary.total} /></div>
          <div style={{ marginTop: 10 }}>{selectedRecords.length === 0 ? <div style={{ padding: 12, textAlign: "center", color: "#64748b", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 11 }}>No attendance records for this date.</div> : <div className="card-grid-2">{selectedRecords.map((record) => <div key={`${record.employeeId}-${record.date}`} className="item-card"><div style={{ fontSize: 11, fontWeight: 900 }}>{record.employeeName}</div><div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{record.employeeId}</div><div style={{ marginTop: 5, fontSize: 10, fontWeight: 900, color: record.status === "PRESENT" ? "#166534" : record.status === "HALF DAY" ? "#92400e" : "#991b1b" }}>{record.status}</div></div>)}</div>}</div>
        </div>
      </>}
    </AdminModuleShell>
  );
}

function SettingsModule({ language, setLanguage, ui, onBack }) {
  return (
    <AdminModuleShell title="Settings" subtitle="Language" onBack={onBack}>
      <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>{ui.language}</div>
      <div className="status-choice-grid" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
        {[['en','English'],['kn','ಕನ್ನಡ'],['hi','हिन्दी']].map(([value, label]) => <button key={value} type="button" className={`status-choice ${language === value ? "selected" : ""}`} onClick={() => setLanguage(value)}>{label}</button>)}
      </div>
    </AdminModuleShell>
  );
}

function EmployeeDashboard({ employeeId, onLogout }) {
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignmentPopup, setAssignmentPopup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePanel, setActivePanel] = useState("home");
  const [attendanceDate, setAttendanceDate] = useState("");

  const loadAssignments = async () => {
    if (!employeeId) return;
    try {
      const response = await fetch(`${API}/api/work-assignments/employee/${encodeURIComponent(employeeId)}`);
      if (!response.ok) return;
      const data = await response.json().catch(() => []);
      const list = Array.isArray(data) ? data : [];
      setAssignments(list);
      const pending = list.find((item) => String(item.status || "PENDING").toUpperCase() === "PENDING");
      if (pending) setAssignmentPopup(pending);
    } catch (err) {
      console.warn("Work assignment polling error:", err);
    }
  };

  const markAssignmentRead = async (assignmentId) => {
    try {
      if (assignmentId) await fetch(`${API}/api/work-assignments/${encodeURIComponent(assignmentId)}/read`, { method: "PUT" });
    } catch (err) {
      console.warn("Mark assignment read error:", err);
    } finally {
      setAssignments((current) => current.map((item) => item.assignmentId === assignmentId ? { ...item, status: "READ" } : item));
      setAssignmentPopup(null);
    }
  };

  useEffect(() => {
    const timer = setInterval(loadAssignments, 10000);
    loadAssignments();
    return () => clearInterval(timer);
  }, [employeeId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [employeeResponse, attendanceResponse, salaryResponse] = await Promise.all([
          fetch(`${API}/api/employees/${encodeURIComponent(employeeId)}`),
          fetch(`${API}/api/attendance/employee/${encodeURIComponent(employeeId)}`),
          fetch(`${API}/api/salary/employee/${encodeURIComponent(employeeId)}`),
        ]);
        const employeeData = await employeeResponse.json().catch(() => null);
        const attendanceData = await attendanceResponse.json().catch(() => []);
        const salaryData = await salaryResponse.json().catch(() => []);
        if (!employeeResponse.ok) throw new Error(typeof employeeData === "string" ? employeeData : "Unable to load employee.");
        setEmployee(employeeData);
        setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
        setTransactions(Array.isArray(salaryData) ? salaryData : []);
      } catch (err) {
        console.error("Employee dashboard error:", err);
        setError("Unable to load your information.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [employeeId]);

  if (loading) return <><GlobalStyles /><div className="smart-page"><div className="smart-card" style={{ textAlign: "center", margin: "auto" }}>⏳<h3>Loading your dashboard...</h3></div></div></>;

  const monthlySalary = Number(employee?.monthlySalary || 0);
  let salaryGiven = 0;
  transactions.forEach((transaction) => {
    if (transaction.type === "PAYMENT") salaryGiven += Number(transaction.amount || 0);
  });
  const advanceLedger = getAdvanceLedger(transactions);
  const advanceTaken = advanceLedger.totalTaken;
  const advanceDeducted = advanceLedger.totalDeducted;
  const advanceOutstanding = advanceLedger.outstanding;
  const salaryToBeGiven = Math.max(0, monthlySalary - salaryGiven - advanceDeducted);
  const recentSalaryTransactions = advanceLedger.rows.slice().reverse();
  const sortedAttendance = attendance.slice().sort((a,b) => String(b.date).localeCompare(String(a.date)));
  const selectedAttendance = attendanceDate ? attendance.find((record) => String(record.date) === attendanceDate) : sortedAttendance[0];
  const recentAttendance = sortedAttendance.slice(0, 5);
  const menu = [["👤", "My Profile", "Name, ID & phone", "profile"], ["📅", "Attendance", "Date-wise attendance", "attendance"], ["💰", "Salary", "Salary & payments", "salary"], ["📋", "My Work", "Tasks assigned to me", "work"]];


  return (
    <>
      <GlobalStyles />
      <div className="smart-page">
        <div className="smart-inner">
        <div className="smart-header">
          <div><div className="eyebrow">SS AGARWAL</div><div className="smart-title">Smart Shop</div><div className="smart-subtitle">Employee Dashboard</div></div>
          <button type="button" className="top-button" onClick={onLogout}>Logout</button>
        </div>
        <div className="smart-card">
          {error && <Alert type="error">{error}</Alert>}

          {activePanel === "home" && <>
            <div style={{ marginBottom: 12 }}><div style={{ fontSize: 22, fontWeight: 900 }}>Employee Dashboard</div><div style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>Welcome, {employee?.name || employeeId}</div></div>
            <div className="menu-grid">{menu.map(([icon,title,subtitle,panel]) => <button key={panel} type="button" className="menu-box" onClick={() => setActivePanel(panel)}><div style={{ fontSize: 25 }}>{icon}</div><div style={{ marginTop: 5, fontSize: 14, fontWeight: 900 }}>{title}</div><div style={{ marginTop: 2, color: "#64748b", fontSize: 11 }}>{subtitle}</div></button>)}</div>
            <div className="mini-info-grid" style={{ marginTop: 11 }}><InfoRow label="Total Salary" value={money(monthlySalary)} /><InfoRow label="Salary Given" value={money(salaryGiven)} /><InfoRow label="Salary To Be Given This Month" value={money(salaryToBeGiven)} /><InfoRow label="Advance Taken" value={money(advanceTaken)} /><InfoRow label="Advance Outstanding" value={money(advanceOutstanding)} /><InfoRow label="Advance Deducted" value={money(advanceDeducted)} /></div>
          </>}

          {activePanel === "profile" && <CompactPanel title="My Profile" onBack={() => setActivePanel("home")}><InfoRow label="Name" value={employee?.name || "—"} /><InfoRow label="Employee ID" value={employee?.employeeId || employeeId} /><InfoRow label="Phone" value={employee?.phoneNumber || "—"} /><InfoRow label="Role" value={employee?.role || "EMPLOYEE"} /><div style={{ marginTop: 10, padding: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, textAlign: "center" }}><div style={{ fontWeight: 900, marginBottom: 8 }}>Employee Barcode</div><EmployeeBarcode value={employee?.employeeId || employeeId} /></div></CompactPanel>}

          {activePanel === "attendance" && <CompactPanel title="Attendance" onBack={() => setActivePanel("home")}>
            <div className="form-grid-2"><div className="input-group"><label>Select Date</label><input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} /></div><InfoRow label="Status" value={selectedAttendance?.status || "NO RECORD"} /></div>
            <div className="mini-info-grid" style={{ marginTop: 10 }}><InfoRow label="Date" value={selectedAttendance?.date || "—"} /><InfoRow label="Status" value={selectedAttendance?.status || "—"} /></div>
            <div style={{ marginTop: 12, fontSize: 12, fontWeight: 900 }}>Recent attendance</div>
            <div style={{ marginTop: 7 }}>{recentAttendance.length === 0 ? <div style={{ color: "#64748b", fontSize: 12 }}>No attendance records available.</div> : recentAttendance.map((record) => <button key={record.attendanceId || `${record.date}-${record.status}`} type="button" onClick={() => setAttendanceDate(String(record.date))} className="item-card" style={{ width: "100%", textAlign: "left", marginBottom: 6, cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 800 }}>{record.date}</span><span style={{ fontWeight: 900, color: record.status === "PRESENT" ? "#15803d" : record.status === "ABSENT" ? "#dc2626" : "#ca8a04" }}>{record.status}</span></div></button>)}</div>
          </CompactPanel>}

          {activePanel === "salary" && <CompactPanel title="Salary" onBack={() => setActivePanel("home")}>
            <div className="mini-info-grid"><InfoRow label="Total Salary" value={money(monthlySalary)} /><InfoRow label="Salary Given" value={money(salaryGiven)} /><InfoRow label="Salary To Be Given This Month" value={money(salaryToBeGiven)} /><InfoRow label="Advance Taken" value={money(advanceTaken)} /><InfoRow label="Advance Outstanding" value={money(advanceOutstanding)} /><InfoRow label="Advance Deducted" value={money(advanceDeducted)} /></div>
            <div style={{ marginTop: 12, fontSize: 12, fontWeight: 900 }}>Salary & Advance History</div>
            <div style={{ marginTop: 7 }}>{recentSalaryTransactions.length === 0 ? <div style={{ color: "#64748b", fontSize: 12 }}>No salary records.</div> : recentSalaryTransactions.map((t, index) => <div key={t.transactionId || `${t.date}-${t.type}-${index}`} className="item-card" style={{ marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div><div style={{ fontWeight: 900, color: salaryTypeColor(t.type) }}>{salaryTypeIcon(t.type)} {salaryTypeLabel(t.type)}</div><div style={{ color: "#64748b", fontSize: 10, marginTop: 2 }}>Date: {t.date}</div></div><strong style={{ color: salaryTypeColor(t.type) }}>{t.type === "DEDUCTION" ? "−" : "+"}{money(t.amount)}</strong></div>{t.advanceEvent && <div style={{ marginTop: 5, color: "#64748b", fontSize: 10 }}>Advance balance after this transaction: <strong>{money(t.advanceBalanceAfter)}</strong></div>}{t.description && <div style={{ marginTop: 4, color: "#64748b", fontSize: 10 }}>{t.description}</div>}</div>)}</div>
          </CompactPanel>}

          {activePanel === "work" && <CompactPanel title="My Work" onBack={() => setActivePanel("home")}>
            <div style={{ padding: 12, borderRadius: 12, background: "#eef6ff", border: "1px solid #cfe3ff", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 900 }}>Assigned work</div>
              <div style={{ marginTop: 3, color: "#64748b", fontSize: 11 }}>New instructions from admin appear here and as a popup.</div>
            </div>
            {assignments.length === 0 ? <div className="item-card" style={{ textAlign: "center", color: "#64748b" }}>No work assignments yet.</div> : assignments.map((item, index) => (
              <div key={item.assignmentId || `${item.assignedDate}-${index}`} className="item-card" style={{ marginBottom: 7, border: String(item.status).toUpperCase() === "PENDING" ? "1px solid #93c5fd" : "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div style={{ fontWeight: 900 }}>{item.title || "Work Assignment"}</div><span style={{ fontSize: 9, fontWeight: 900, color: String(item.status).toUpperCase() === "PENDING" ? "#1d4ed8" : "#64748b" }}>{String(item.status || "PENDING").toUpperCase()}</span></div>
                <div style={{ marginTop: 5, fontSize: 11, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{item.message || ""}</div>
                <div style={{ marginTop: 5, color: "#64748b", fontSize: 9 }}>{item.assignedDate || ""}</div>
              </div>
            ))}
          </CompactPanel>}

          {assignmentPopup && (
            <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(2,6,23,.62)", display: "grid", placeItems: "center", padding: 16 }}>
              <div style={{ width: "100%", maxWidth: 430, background: "#fff", color: "#0f172a", borderRadius: 20, padding: 20, boxShadow: "0 25px 80px rgba(0,0,0,.35)" }}>
                <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 900 }}>📋 NEW WORK ASSIGNMENT</div>
                <div style={{ marginTop: 6, fontSize: 21, fontWeight: 900 }}>{assignmentPopup.title || "Work Assignment"}</div>
                <div style={{ marginTop: 10, padding: 12, background: "#f8fafc", borderRadius: 12, fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{assignmentPopup.message || "New work has been assigned to you."}</div>
                <div style={{ marginTop: 10, color: "#64748b", fontSize: 10 }}>Assigned date: {assignmentPopup.assignedDate || "—"}</div>
                <button type="button" className="primary-action" style={{ marginTop: 14 }} onClick={() => markAssignmentRead(assignmentPopup.assignmentId)}>ACKNOWLEDGE</button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 12, padding: "8px 10px", background: "#effdf3", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 10, textAlign: "center", fontSize: 11, fontWeight: 800 }}>👤 Logged in as EMPLOYEE</div>
        </div>
        <div className="smart-footer">© 2026 S.S. Agarwal Cloth Merchant</div>
        </div>
      </div>
    </>
  );
}

function AdminModuleShell({ title, subtitle, onBack, children }) {
  return <><GlobalStyles /><div className="smart-page"><div className="smart-inner"><div className="smart-header"><div><div className="eyebrow">SS AGARWAL</div><div className="smart-title">{title}</div><div className="smart-subtitle">{subtitle}</div></div><button type="button" className="top-button" onClick={onBack}>← Menu</button></div><div className="smart-card module-card">{children}</div><div className="smart-footer">© 2026 S.S. Agarwal Cloth Merchant</div></div></div></>;
}

function EmployeeBarcode({ value }) {
  const clean = String(value || "").toUpperCase().replace(/[^0-9A-Z -]/g, "");
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";
  const patterns = {
    "0":"101001101101", "1":"110100101011", "2":"101100101011", "3":"110110010101", "4":"101001101011", "5":"110100110101", "6":"101100110101", "7":"101001011011", "8":"110100101101", "9":"101100101101",
    "A":"110101001011", "B":"101101001011", "C":"110110100101", "D":"101011001011", "E":"110101100101", "F":"101101100101", "G":"101010011011", "H":"110101001101", "I":"101101001101", "J":"101011001101",
    "K":"110101010011", "L":"101101010011", "M":"110110101001", "N":"101011010011", "O":"110101101001", "P":"101101101001", "Q":"101010110011", "R":"110101011001", "S":"101101011001", "T":"101011011001",
    "U":"110010101011", "V":"100110101011", "W":"110011010101", "X":"100101101011", "Y":"110010110101", "Z":"100110110101", "-":"100101011011", ".":"110010101101", " ":"100110101101", "$":"100100100101", "/":"100100101001", "+":"100101001001", "%":"101001001001"
  };
  const chars = `*${clean}*`;
  const star = "100101101101";
  let x = 10;
  const bars = [];
  chars.split("").forEach((char, index) => {
    const pattern = char === "*" ? star : patterns[char] || "100101101101";
    pattern.split("").forEach((bit) => {
      if (bit === "1") bars.push(<rect key={`${index}-${x}`} x={x} y="8" width="2" height="72" fill="#0f172a" />);
      x += 2;
    });
    x += 2;
  });
  return <svg viewBox={`0 0 ${x + 10} 100`} width="100%" height="95" role="img" aria-label={`Barcode ${value}`}>{bars}<text x="50%" y="96" textAnchor="middle" fontSize="10" fill="#0f172a" letterSpacing="1">{clean}</text></svg>;
}

function CompactPanel({ title, onBack, children }) {
  return <div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}><div style={{ fontSize: 21, fontWeight: 900 }}>{title}</div><button type="button" className="small-button" onClick={onBack}>← Menu</button></div>{children}</div>;
}

function InfoRow({ label, value }) {
  return <div style={{ padding: 10, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}><div style={{ color: "#64748b", fontSize: 10, fontWeight: 800 }}>{label}</div><div style={{ marginTop: 3, fontSize: 12, fontWeight: 900, wordBreak: "break-word" }}>{String(value ?? "—")}</div></div>;
}

function Alert({ type, children }) {
  const success = type === "success";
  return <div style={{ marginBottom: 10, padding: 9, background: success ? "#dcfce7" : "#fee2e2", color: success ? "#166534" : "#991b1b", border: `1px solid ${success ? "#bbf7d0" : "#fecaca"}`, borderRadius: 10, fontSize: 12, fontWeight: 800 }}>{children}</div>;
}

function maskPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 10) return phone || "registered mobile number";
  const last10 = digits.slice(-10);
  return `+91 ${last10.slice(0, 2)}****${last10.slice(-4)}`;
}

function firebaseOtpError(err, verifying = false) {
  const code = String(err?.code || "");
  if (code.includes("auth/operation-not-allowed")) return "Firebase Phone Authentication is not enabled for this project.";
  if (code.includes("auth/unauthorized-domain")) return "This website domain is not authorized in Firebase Authentication. Add localhost in Authentication > Settings > Authorized domains for local testing.";
  if (code.includes("auth/missing-app-credential")) return "Firebase reCAPTCHA is not ready. Complete the reCAPTCHA box and then click SEND OTP.";
  if (code.includes("auth/too-many-requests")) return "Too many OTP attempts. Please try again later or use a different test number.";
  if (code.includes("auth/invalid-verification-code")) return "Invalid OTP. Please check the 6-digit code and try again.";
  if (code.includes("auth/code-expired")) return "OTP expired. Please request a new OTP.";
  if (code.includes("auth/invalid-phone-number")) return "The registered mobile number is not a valid Indian phone number.";
  if (code.includes("auth/quota-exceeded")) return "Firebase SMS quota has been exceeded for this project.";
  if (code.includes("auth/captcha-check-failed")) return "Firebase security verification failed. Complete the reCAPTCHA again and resend the OTP.";
  if (code.includes("auth/app-not-authorized")) return "This Firebase web app is not authorized for Phone Authentication.";
  if (code.includes("auth/invalid-api-key")) return "Firebase configuration is invalid. Check the API key in frontend/src/firebase.js.";
  if (code.includes("auth/invalid-app-credential")) return "Firebase reCAPTCHA verification failed. Reload the page, complete reCAPTCHA, and send the OTP again.";
  return verifying
    ? `Unable to verify the OTP${code ? ` (${code})` : ""}. Please request a new OTP.`
    : `Unable to send OTP${code ? ` (${code})` : ""}. Check Firebase Phone Authentication, SMS region policy, and Authorized Domains.`;
}

export default App;
