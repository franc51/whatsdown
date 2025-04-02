import React, { useState } from "react";
import "./welcome-page.css";
import Login from "../Login/login.jsx";
import SignUp from "../SignUp/signup.jsx"; // Ensure this file exists
import AboutWD from "../AboutWD/aboutwd.jsx"; // Ensure this file exists

export default function WelcomePage() {
  const [activeTab, setActiveTab] = useState("chats"); // Default tab is Login

  return (
    <div className="homepage">
      {/* User Greeting */}
      <div className="homepage_user">
        <div>
          <p className="homepage_greeting">Hello,</p>
          <h3 className="homepage_user_greeting">Welcome to What's Down</h3>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="homepage_nav">
        <a
          href="blank.html"
          className={`homepage_chats link ${
            activeTab === "chats" ? "active_link" : ""
          }`}
          onClick={(e) => {
            e.preventDefault();
            setActiveTab("chats");
          }}
        >
          Log In
        </a>
        <a
          href="blank.html"
          className={`homepage_groups link ${
            activeTab === "groups" ? "active_link" : ""
          }`}
          onClick={(e) => {
            e.preventDefault();
            setActiveTab("groups");
          }}
        >
          Sign Up
        </a>
        <a
          href="blank.html"
          className={`homepage_contacts link ${
            activeTab === "contacts" ? "active_link" : ""
          }`}
          onClick={(e) => {
            e.preventDefault();
            setActiveTab("contacts");
          }}
        >
          About WD
        </a>
      </div>

      {/* Conditional Rendering of Components */}
      <div className="homepage_content">
        {activeTab === "chats" && <Login />}
        {activeTab === "groups" && <SignUp />}
        {activeTab === "contacts" && <AboutWD />}
      </div>
    </div>
  );
}
