import React from "react";
import "./login.css"

export default function Login() {
  return <div className="login_info">
          <p>Log In into your account.</p>
            <form>
            <div className="login_container marginTop">
            <div className="login_container">
              <label>E-mail</label>
              <input type="email" placeholder="your e-mail" required></input>
              
            </div>
            <div className="login_container">
              <label>Password</label>
              <input type="password" placeholder="your super strong password" required></input>
              <a className="login_forgotPassword" href="blank.html">Forgot your password?</a>
            </div>
            <input type="submit" className="login_button_submit" value="Log In"></input>
          </div>
            </form>
        </div>;
}
