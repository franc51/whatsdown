import React from "react";
import "./signup.css"

export default function SignUp() {
  return <div className="login_info">
  <p>Create a new account.</p>
    <form>
    <div className="login_container marginTop">
    <div className="login_container">
      <label>Nickname</label>
      <input type="text" placeholder="alex" required></input>
    </div>
    <div className="login_container">
      <label>E-mail</label>
      <input type="email" placeholder="your e-mail" required></input>
    </div>
    <div className="login_container">
      <label>Password</label>
      <input type="password" placeholder="your super strong password" required></input>
    </div>
    <input type="submit" className="signup_button_submit" value="Sign Up"></input>
  </div>
    </form>
</div>;
}
