import React, { useState, useEffect } from "react";
import "./homepage.css";
import AllChats from "../AllChats/allchats";
import { useNavigate } from "react-router-dom";

export default function Homepage({ friends, onlineUsers, loading, error }) {
  const [activeTab, setActiveTab] = useState("chats"); // Default tab is chats
  const [friendPhone, setFriendPhone] = useState(""); // To store phone number input
  const [message, setMessage] = useState(""); // For showing success/error messages
  const [user, setUser] = useState(""); // To store user information
  const navigate = useNavigate();

  // Fetch user information when the component mounts
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem("token"); // Retrieve token from localStorage

        if (!token) {
          setMessage("You must be logged in to see your information.");
          return;
        }

        const response = await fetch(
          "https://authservice-xemo.onrender.com/getUserInfo",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`, // Send the JWT token in the Authorization header
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          setUser(data.user); // Store user info
        } else {
          setMessage(data.message || "An error occurred. Please try again.");
        }
      } catch (err) {
        setMessage("An error occurred. Please try again.");
      }
    };

    fetchUserInfo();
  }, []); // Empty dependency array means it runs once when the component mounts

  // Function to prevent page reload
  const handleTabChange = (e, tabName) => {
    e.preventDefault(); // Prevent page reload
    setActiveTab(tabName); // Set the active tab
  };

  // Handle the "Delete Friend" button click
  const handleDeleteFriend = async () => {
    if (friendPhone.length !== 10 || !/^\d+$/.test(friendPhone)) {
      setMessage("Please enter a valid 10-digit phone number.");
      return;
    }

    try {
      const token = localStorage.getItem("token"); // Retrieve token from localStorage

      if (!token) {
        setMessage("You must be logged in to delete friends.");
        return;
      }

      const response = await fetch(
        "https://authservice-xemo.onrender.com/deleteFriend", // Update with actual endpoint
        {
          method: "POST", // Or DELETE depending on your backend
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Send the JWT token in the Authorization header
          },
          body: JSON.stringify({
            friendPhoneNumber: friendPhone,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Friend deleted successfully!");
        setFriendPhone(""); // Clear the input after success
      } else {
        setMessage(data.message || "An error occurred. Please try again.");
      }
    } catch (err) {
      setMessage("An error occurred. Please try again.");
    }

    // Clear message after 5 seconds
    setTimeout(() => setMessage(""), 5000);
  };

  // Handle the "Add Friend" button click
  const handleAddFriend = async () => {
    if (friendPhone.length !== 10 || !/^\d+$/.test(friendPhone)) {
      setMessage("Please enter a valid 10-digit phone number.");
      return;
    }

    try {
      const token = localStorage.getItem("token"); // Retrieve token from localStorage

      if (!token) {
        setMessage("You must be logged in to add friends.");
        return;
      }

      const response = await fetch(
        "https://authservice-xemo.onrender.com/addFriend",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Send the JWT token in the Authorization header
          },
          body: JSON.stringify({
            friendPhoneNumber: friendPhone,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Friend added successfully!");
        setFriendPhone(""); // Clear the input after success
      } else {
        setMessage(data.message || "An error occurred. Please try again.");
      }
    } catch (err) {
      setMessage("An error occurred. Please try again.");
    }

    // Clear message after 5 seconds
    setTimeout(() => setMessage(""), 5000);
  };

  return (
    <div className="homepage">
      <div className="homepage_user">
        <div>
          <p className="homepage_greeting">Hello,</p>
          <h3 className="homepage_user_greeting">{user.nickname}</h3>
        </div>
        <div>
          <button className="homepage_searchBtn searchMenuBtn_style" />
          <button
            onClick={() => navigate("/account")}
            className="homepage_menuBtn searchMenuBtn_style"
          />
        </div>
      </div>

      <div>
        <h4>Stories will show here</h4>
      </div>
      <div className="homepage_nav">
        <button
          className={`homepage_chats link ${
            activeTab === "chats" ? "active_link" : ""
          }`}
          onClick={(e) => handleTabChange(e, "chats")}
        >
          All Chats
        </button>
        <button
          className={`homepage_groups link ${
            activeTab === "groups" ? "active_link" : ""
          }`}
          onClick={(e) => handleTabChange(e, "groups")}
        >
          Groups
        </button>
        <button
          className={`homepage_contacts link ${
            activeTab === "addChat" ? "active_link" : ""
          }`}
          onClick={(e) => handleTabChange(e, "addChat")}
        >
          Chat Settings
        </button>
      </div>

      {/* Conditional Rendering of Components */}
      <div className="homepage_content">
        {activeTab === "chats" && (
          <AllChats
            friends={friends}
            onlineUsers={onlineUsers}
            loading={loading}
            error={error}
          />
        )}
        {activeTab === "groups" && <p>Groups</p>}
        {activeTab === "addChat" && (
          <div className="newChat_addFriend">
            <label>Add friend</label>
            <div className="input_and_btns">
              <input
                type="text"
                placeholder="Phone number"
                value={friendPhone}
                onChange={(e) => setFriendPhone(e.target.value)}
                maxLength={10}
              />
              <button
                className="addFriend_btn btn_style"
                onClick={handleAddFriend}
              ></button>
            </div>
            <label>Delete friend</label>
            <div className="input_and_btns">
              <input
                type="text"
                placeholder="Phone number"
                value={friendPhone}
                onChange={(e) => setFriendPhone(e.target.value)}
                maxLength={10}
              />
              <button
                className="deleteFriend_btn btn_style"
                onClick={handleDeleteFriend}
              ></button>
            </div>
            {message && <p>{message}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
