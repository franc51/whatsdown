import React, { useState, useEffect } from "react";
import "../AllChats/allchats.css";
import { useNavigate } from "react-router-dom";

export default function AllChats() {
  const [friends, setFriends] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    let socket = new WebSocket("wss://websocket-service-30vz.onrender.com");

    socket.onopen = () => {
      const token = localStorage.getItem("token");
      if (token) {
        socket.send(JSON.stringify({ type: "register", token }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "status") {
          const { userId, status } = data;
          setOnlineUsers((prev) => ({
            ...prev,
            [userId]: status,
          }));
        }
        // 🆕 Handle the initial list of online users
        if (data.type === "onlineUsers") {
          const online = {};
          data.userIds.forEach((id) => {
            online[id] = "online";
          });

          setOnlineUsers((prev) => ({
            ...prev,
            ...online,
          }));
        }
      } catch (e) {
        console.error("Error parsing status update:", e);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error", error);
    };

    socket.onclose = () => {
      console.log("WebSocket closed");
      setTimeout(() => {
        socket = new WebSocket("wss://websocket-service-30vz.onrender.com");
      }, 3000); // Reconnect after 3 seconds
    };

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setMessage("You must be logged in to see your friends.");
          return;
        }

        const response = await fetch(
          "https://authservice-xemo.onrender.com/getFriends",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          setFriends(data.friends);
        } else {
          setMessage(data.message || "Unable to fetch friends.");
        }
      } catch (err) {
        setMessage("An error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, []);

  const goToChat = (friendId, nickname) => {
    const status = onlineUsers[friendId] === "online" ? "online" : "offline";
    navigate(`/chat/${friendId}`, {
      state: {
        friendId,
        nickname,
        status, // ✅ now status is defined in this scope
      },
    });
  };

  return (
    <div className="homepage_chat_list">
      {message && <p>{message}</p>}

      {loading ? (
        <img
          alt="Loading"
          className="allchats_loader"
          src="/Images/loader.gif"
        ></img>
      ) : friends.length > 0 ? (
        friends.map((friend) => {
          const isOnline = onlineUsers[friend._id] === "online";
          return (
            <div
              className="homepage_chat_list_item"
              key={friend._id}
              onClick={() => goToChat(friend._id, friend.nickname)}
              style={{ cursor: "pointer" }}
            >
              <div className="picAndName">
                <img
                  className="homepage_chat_profileImg"
                  alt="profileImg"
                  src="{profilePicture}"
                />
                <div
                  className={`allChats_statusIndicator ${
                    isOnline ? "online" : "offline"
                  }`}
                ></div>
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
                  ? new Date(friend.lastMessageTime).toLocaleTimeString([], {
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
          Your friends will appear here once you add them, do so on the chat
          settings tab.
        </p>
      )}
    </div>
  );
}
