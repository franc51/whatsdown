import React, { useState } from "react";
import "./homepage.css";
import AllChats from "../AllChats/allchats";

export default function Homepage() {
  const [activeTab, setActiveTab] = useState("chats"); // Default tab is chats
  const [friendPhone, setFriendPhone] = useState(""); // To store phone number input
  const [message, setMessage] = useState(""); // For showing success/error messages

  // Function to prevent page reload
  const handleTabChange = (e, tabName) => {
    e.preventDefault(); // Prevent page reload
    setActiveTab(tabName); // Set the active tab
  };

  // Handle the "Add Friend" button click
  const handleAddFriend = async () => {
    try {
      const token = localStorage.getItem("token"); // Retrieve token from localStorage

      if (!token) {
        setMessage("You must be logged in to add friends.");
        return;
      }

      const response = await fetch("http://localhost:3002/addFriend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Send the JWT token in the Authorization header
        },
        body: JSON.stringify({
          friendPhoneNumber: friendPhone,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Friend added successfully!");
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage("An error occurred. Please try again.");
    }
  };

  return (
    <div className="homepage">
      <div className="homepage_user">
        <div>
          <p className="homepage_greeting">Hello,</p>
          <h3 className="homepage_user_greeting">Sunshine</h3>
        </div>
        <div>
          <button
            className="homepage_searchBtn searchMenuBtn_style"
            id="homepage_searchBtn"
            href="blank.html"
          />
          <button
            className="homepage_menuBtn searchMenuBtn_style"
            id="homepage_menuBtn"
            href="blank.html"
          />
        </div>
      </div>

      <div className="homepage_nav">
        <a
          href="blank.html"
          className={`homepage_chats link ${
            activeTab === "chats" ? "active_link" : ""
          }`}
          onClick={(e) => handleTabChange(e, "chats")}
        >
          All Chats
        </a>
        <a
          href="blank.html"
          className={`homepage_groups link ${
            activeTab === "groups" ? "active_link" : ""
          }`}
          onClick={(e) => handleTabChange(e, "groups")}
        >
          Groups
        </a>
        <a
          href="addChat"
          className={`homepage_contacts link ${
            activeTab === "addChat" ? "active_link" : ""
          }`}
          onClick={(e) => handleTabChange(e, "addChat")}
        >
          New Chat
        </a>
      </div>

      {/* Conditional Rendering of Components */}
      <div className="homepage_content">
        {activeTab === "chats" && <AllChats />}
        {activeTab === "groups" && <p>Groups</p>}
        {activeTab === "addChat" && (
          <div className="newChat_addFriend">
            <label>Phone</label>
            <input
              type="number"
              placeholder="Phone number"
              value={friendPhone}
              onChange={(e) => setFriendPhone(e.target.value)}
              minLength={10}
            />
            <button onClick={handleAddFriend}>Add Friend</button>
            {message && <p>{message}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
