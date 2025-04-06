import React, { useState } from "react";
import "./signup.css";

export default function SignUp() {
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false); // New state for loading

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Set loading state to true when the form is submitted

    // Send data to backend
    try {
      const response = await fetch("http://localhost:3002/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nickname, phone, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setError(""); // Clear any previous error
      } else {
        setError(data.message);
        setSuccess(""); // Clear any previous success message
      }
    } catch (err) {
      console.error("Error during signup:", err);
      setError("An error occurred. Please try again.");
      setSuccess(""); // Clear any previous success message
    } finally {
      setLoading(false); // Set loading state to false after request completes
    }
  };

  return (
    <div className="login_info">
      <p>Create a new account.</p>
      <form onSubmit={handleSubmit}>
        <div className="login_container marginTop">
          <div className="login_container">
            <label>Nickname</label>
            <input
              type="text"
              placeholder="alex"
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
          <div className="login_container">
            <label>Phone nr.</label>
            <input
              type="number"
              placeholder="number"
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
          </div>
          <input
            type="submit"
            className="signup_button_submit"
            value={loading ? "Signing Up..." : "Sign Up"} // Show 'Signing Up...' when loading
            disabled={loading} // Disable the button while loading
          />
        </div>
      </form>

      <div className="show_info">
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </div>
    </div>
  );
}
