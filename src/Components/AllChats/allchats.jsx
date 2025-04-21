import React from "react";
import "../AllChats/allchats.css";
import { useNavigate } from "react-router-dom";

export default function AllChats({ friends, onlineUsers, loading, error }) {
  const navigate = useNavigate();

  const goToChat = (friendId, nickname, profilePicture) => {
    const status = onlineUsers[friendId] === "online" ? "online" : "offline";
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
                  src={
                    friend.profilePicture
                      ? `https://authservice-xemo.onrender.com${friend.profilePicture}`
                      : "/Images/human.png"
                  }
                  onError={(e) => {
                    console.error("Image failed to load:", e.target.src);
                    e.target.src = "/Images/human.png";
                  }}
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
                  <p className="homepage_chat_profile_lastMessage">
                    {friend.lastMessage || "No messages yet"}
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
