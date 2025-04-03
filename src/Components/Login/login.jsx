import React from "react";
import "./login.css"

export default function Login() {
  return <div>
          <p>Log In into your account.</p>
          <div className="login_container">
            <div className="login_container">
              <label>E-mail</label>
              <input type="email" placeholder="something@company.com" required></input>
            </div>
            <div className="login_container">
              <label>Password</label>
              <input type="password" placeholder="your super strong password" required></input>
              <a className="login_forgotPassword" href="blank.html">Forgot your password?</a>
            </div>
            <button className="login_button_submit">Log In</button>
          </div>
        </div>;
}
