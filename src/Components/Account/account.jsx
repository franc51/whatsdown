import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./account.css";
import ProfilePicture from "../ProfilePicture/profilePicture";

export default function Account() {
  const [activeTab, setActiveTab] = useState("chats");
  const [friendPhone, setFriendPhone] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState("");
  const navigate = useNavigate(null);
  const [selectedFile, setSelectedFile] = useState();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setMessage("You must be logged in to see your information.");
          return;
        }

        const response = await fetch("http://localhost:3002/getUserInfo", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok) {
          setUser(data.user);
        } else {
          setMessage(data.message || "An error occurred. Please try again.");
        }
      } catch (err) {
        setMessage("An error occurred. Please try again.");
      }
    };

    fetchUserInfo();
  }, []);

  const handleFileChange = (file) => {
    setSelectedFile(file);
  };

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
        "https://authservice-xemo.onrender.com/uploadProfilePicture",
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
        setUser((prevUser) => ({
          ...prevUser,
          profilePicture: `https://authservice-xemo.onrender.com${data.url}`,
        }));
      } else {
        setMessage(`Failed to upload picture: ${data.message || "Unknown error"}`);
      }
    } catch (err) {
      setMessage(`Error uploading profile picture: ${err.message}`);
    }
  };

  const handleTabChange = (e, tabName) => {
    e.preventDefault();
    setActiveTab(tabName);
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
          className={`homepage_chats link ${activeTab === "chats" ? "active_link" : ""}`}
          onClick={(e) => handleTabChange(e, "chats")}
        >
          User
        </button>
        <button
          className={`homepage_groups link ${activeTab === "groups" ? "active_link" : ""}`}
          onClick={(e) => handleTabChange(e, "groups")}
        >
          Chat
        </button>
        <button
          className={`homepage_contacts link ${activeTab === "addChat" ? "active_link" : ""}`}
          onClick={(e) => handleTabChange(e, "addChat")}
        >
          Style
        </button>
      </div>

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

              {user.profilePicture && (
                <img
                  src={user.profilePicture}
                  alt="Current Profile"
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "1rem",
                  }}
                />
              )}

              <div className="account_nickName_container">
                <ProfilePicture onFileChange={handleFileChange} />
                <button
                  className="account_saveNickname"
                  onClick={handleSaveProfilePicture}
                >
                  Save Profile Picture
                </button>
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
