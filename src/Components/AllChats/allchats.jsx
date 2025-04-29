import React, { useState, useEffect } from "react";
import "../AllChats/allchats.css";
import { useNavigate } from "react-router-dom";

export default function AllChats({ onlineUsers, loading, error }) {
  const [friends, setFriends] = useState([]);
  const [userId, setUserId] = useState(null); // State to hold the userId
  const navigate = useNavigate();

  const fetchUserInfo = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("No token found");
      return;
    }

    try {
      const response = await fetch(
        "https://authservice-xemo.onrender.com/getUserInfo",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch user info");
      }

      const data = await response.json();
      const user = data.user;
      setUserId(user._id);

      const sortedFriends = user.friends.sort((a, b) => {
        const aTime = a.lastMessageTime || a.createdAt || 0;
        const bTime = b.lastMessageTime || b.createdAt || 0;
        return new Date(bTime) - new Date(aTime);
      });
      setFriends(sortedFriends); // ✅ isUnread is already included
    } catch (err) {
      console.error("Error fetching user info:", err);
    }
  };

  useEffect(() => {
    fetchUserInfo(); // Fetch user info when the component mounts
  }, []);

  const goToChat = async (friendId, nickname, profilePicture) => {
    const status = onlineUsers[friendId] === "online" ? "online" : "offline";

    // Make the API call to mark messages as read
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const response = await fetch(
          `https://authservice-xemo.onrender.com/markMessagesRead/${userId}/${friendId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to mark messages as read");
        }

        // Update the friends list state to set `isUnread` to false for this friend
        setFriends((prevFriends) =>
          prevFriends.map((friend) =>
            friend._id === friendId ? { ...friend, isUnread: false } : friend
          )
        );
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    }

    // Navigate to the chat
    navigate(`/chat/${friendId}`, {
      state: {
        friendId,
        nickname,
        status,
        profilePicture,
      },
    });
  };

  return (
    <div className="homepage_chat_list">
      {error && <p>{error}</p>}

      {loading ? (
        <div className="allchats_loader_container">
          <img
            alt="Loading"
            className="allchats_loader"
            src="/Images/loader.gif"
          />
          <p>
            If the server spins down with inactivity, it might delay requests by
            50 seconds or more.
          </p>
        </div>
      ) : friends.length > 0 ? (
        friends.map((friend) => {
          const isOnline = onlineUsers[friend._id] === "online";
          return (
            <div
              className="homepage_chat_list_item"
              key={friend._id}
              onClick={() =>
                goToChat(friend._id, friend.nickname, friend.profilePicture)
              }
              style={{ cursor: "pointer" }}
            >
              <div className="picAndName">
                <img
                  className="homepage_chat_profileImg"
                  alt="profileImg"
                  src="/Images/user_default.png"
                />
                <div
                  className={`allChats_statusIndicator ${
                    isOnline ? "online" : "offline"
                  }`}
                />
                <div className="homepage_chat_profile">
                  <h4 className="homepage_chat_profile_name">
                    {friend.nickname}
                  </h4>
                  <p
                    className={`homepage_chat_profile_lastMessage ${
                      friend.lastMessage?.isUnread === true ? "boldMessage" : ""
                    }`}
                  >
                    {friend.lastMessage?.message ||
                      friend.lastMessage ||
                      "No messages yet"}
                  </p>
                </div>
              </div>
              <p className="homepage_chat_profile_messageTime">
                {friend.lastMessageTime
                  ? new Date(friend.lastMessageTime).toLocaleString([], {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "No date yet"}
              </p>
            </div>
          );
        })
      ) : (
        <p>
          Your friends will appear here once you add them — do so on the Chat
          Settings tab.
        </p>
      )}
    </div>
  );
}
