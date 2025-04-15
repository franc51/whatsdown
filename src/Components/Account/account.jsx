import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./account.css";
import ProfilePicture from "../ProfilePicture/profilePicture";

export default function Homepage() {
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

        const response = await fetch("http://localhost:3002/getUserInfo", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`, // Send the JWT token in the Authorization header
          },
        });

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

  // Function to handle file input change (from ProfilePicture)
  const handleFileChange = (file) => {
    setSelectedFile(file); // Set the selected file to be uploaded
  };

  // Function to save the profile picture
  const handleSaveProfilePicture = async () => {
    if (!selectedFile) {
      setMessage("Please select a profile picture.");
      return;
    }

    const formData = new FormData();
    formData.append("profilePicture", selectedFile);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:3002/uploadProfilePicture",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();
      if (response.ok) {
        setMessage("Profile picture updated successfully!");
      } else {
        setMessage(data.message || "Failed to upload picture.");
      }
    } catch (err) {
      setMessage("Error uploading profile picture.");
    }
  };

  // Function to prevent page reload
  const handleTabChange = (e, tabName) => {
    e.preventDefault(); // Prevent page reload
    setActiveTab(tabName); // Set the active tab
  };

  return (
    <div className="homepage">
      <div className="homepage_user">
        <div className="account_settings_backBtn">
          <button
            className="homepage_goBackToAllChats"
            onClick={() => navigate("/")}
          ></button>
          <h3 className="homepage_user_greeting">Account Settings</h3>
        </div>
        <div>
          <button className="homepage_searchBtn searchMenuBtn_style" />
          <button
            onClick={() => navigate("/account")}
            className="homepage_menuBtn searchMenuBtn_style"
          />
        </div>
      </div>

      <div className="homepage_nav">
        <button
          className={`homepage_chats link ${
            activeTab === "chats" ? "active_link" : ""
          }`}
          onClick={(e) => handleTabChange(e, "chats")}
        >
          User
        </button>
        <button
          className={`homepage_groups link ${
            activeTab === "groups" ? "active_link" : ""
          }`}
          onClick={(e) => handleTabChange(e, "groups")}
        >
          Chat
        </button>
        <button
          className={`homepage_contacts link ${
            activeTab === "addChat" ? "active_link" : ""
          }`}
          onClick={(e) => handleTabChange(e, "addChat")}
        >
          Style
        </button>
      </div>

      {/* Conditional Rendering of Components */}
      <div className="homepage_content">
        {activeTab === "chats" && (
          <div className="account_changeNickname">
            <button
              className="account_logOut"
              onClick={() => {
                localStorage.removeItem("token");
                navigate("/login");
              }}
            >
              Log Out
            </button>
            <div className="account_content">
              <div className="account_nickName_container">
                <input type="text" placeholder="Change Name" />
                <button className="account_saveNickname">Save</button>
              </div>
              <div className="account_nickName_container">
                <ProfilePicture onFileChange={handleFileChange} />
                <button className="account_saveNickname">Save</button>
              </div>
            </div>
            {message && <p>{message}</p>}
          </div>
        )}
        {activeTab === "groups" && <p>No idea what's gonna be here yet.</p>}
        {activeTab === "addChat" && (
          <div className="newChat_addFriend">
            <p>Maybe dark mode? Idk, give me ideas</p>
          </div>
        )}
      </div>
    </div>
  );
}
