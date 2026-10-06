import { useState } from "react";
import {
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "firebase/auth";

import { auth } from "./firebase";

function PhoneOtpVerification() {

    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [confirmationResult, setConfirmationResult] =
        useState(null);

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const setupRecaptcha = () => {

        if (!window.recaptchaVerifier) {

            window.recaptchaVerifier =
                new RecaptchaVerifier(
                    auth,
                    "recaptcha-container",
                    {
                        size: "normal",
                        callback: () => {
                            console.log(
                                "reCAPTCHA verified"
                            );
                        }
                    }
                );
        }
    };

    const sendOtp = async () => {

        if (!phoneNumber) {
            setMessage(
                "Please enter your phone number."
            );
            return;
        }

        try {

            setLoading(true);
            setMessage("");

            setupRecaptcha();

            const formattedPhone =
                phoneNumber.startsWith("+")
                    ? phoneNumber
                    : `+91${phoneNumber}`;

            const result =
                await signInWithPhoneNumber(
                    auth,
                    formattedPhone,
                    window.recaptchaVerifier
                );

            setConfirmationResult(result);

            setMessage(
                "OTP sent successfully."
            );

        } catch (error) {

            console.error(error);

            setMessage(
                error.message ||
                "Failed to send OTP."
            );

            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            }

        } finally {

            setLoading(false);
        }
    };

    const verifyOtp = async () => {

        if (!confirmationResult) {
            setMessage(
                "Please request an OTP first."
            );
            return;
        }

        if (!otp || otp.length !== 6) {
            setMessage(
                "Please enter the 6-digit OTP."
            );
            return;
        }

        try {

            setLoading(true);
            setMessage("");

            await confirmationResult.confirm(otp);

            setMessage(
                "Phone number verified successfully."
            );

        } catch (error) {

            console.error(error);

            setMessage(
                "Invalid or expired OTP."
            );

        } finally {

            setLoading(false);
        }
    };

    return (
        <div>

            <h2>Phone Verification</h2>

            <input
                type="tel"
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={(event) =>
                    setPhoneNumber(event.target.value)
                }
            />

            <div id="recaptcha-container"></div>

            <button
                onClick={sendOtp}
                disabled={loading}
            >
                {loading
                    ? "Please wait..."
                    : "Send OTP"}
            </button>

            {confirmationResult && (
                <div>

                    <input
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        maxLength="6"
                        value={otp}
                        onChange={(event) =>
                            setOtp(
                                event.target.value
                            )
                        }
                    />

                    <button
                        onClick={verifyOtp}
                        disabled={loading}
                    >
                        Verify OTP
                    </button>

                </div>
            )}

            {message && (
                <p>{message}</p>
            )}

        </div>
    );
}

export default PhoneOtpVerification;