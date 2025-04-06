import React, { useState } from "react";
import "./login.css";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // To display error messages

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // Send login credentials to backend API
      const response = await fetch("http://localhost:3002/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // If login is successful, save token to localStorage
        localStorage.setItem("token", data.token);

        // Redirect to homepage (or use state to trigger a page change)
        window.location.href = "/"; // Or use React Router for page routing
      } else {
        setError(data.message); // Show the error message from the backend
      }
    } catch (err) {
      console.error("Error during login:", err);
      setError("An error occurred. Please try again.");
    }
  };

  return (
    <div className="login_info">
      <p>Log In into your account.</p>
      <form onSubmit={handleLogin}>
        <div className="login_container marginTop">
          <div className="login_container">
            <label>Phone</label>
            <input
              type="number"
              placeholder="phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="login_container">
            <label>Password</label>
            <input
              type="password"
              placeholder="your super strong password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <a
              className="login_forgotPassword"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert("Good luck finding it.");
              }}
            >
              Forgot your password?
            </a>
          </div>
          <input type="submit" className="login_button_submit" value="Log In" />
        </div>
      </form>
      {error && <p className="error">{error}</p>} {/* Show error if any */}
    </div>
  );
}
