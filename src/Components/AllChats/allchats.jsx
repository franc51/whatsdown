import React, { useState, useEffect } from "react";
import "../AllChats/allchats.css";
import { useNavigate } from "react-router-dom"; // Hook to navigate

export default function AllChats() {
  const [friends, setFriends] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState("Offline"); // Track friend status

  const navigate = useNavigate(); // Get the history object for navigation

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

  // Function to navigate to the chat page for a specific friend
  const goToChat = (friendId, nickname) => {
    navigate(`/chat/${friendId}`, {
      state: {
        friendId,
        nickname,
      },
    });
  };
  // Display the status next to the friend's name
  const statusClass = friendStatus === "online" ? "online" : "offline";

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
        friends.map((friend) => (
          <div
            className="homepage_chat_list_item"
            key={friend._id}
            onClick={() => goToChat(friend._id, friend.nickname)} // Navigate to the specific friend's chat page
            style={{ cursor: "pointer" }} // Optional: improve UX with pointer cursor
          >
            <div className="picAndName">
              <img
                className="homepage_chat_profileImg"
                alt="profileImg"
                src="/Images/human.png"
              />
              <div
                className={`allChats_statusIndicator ${statusClass}`} // Dynamically apply status class
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
    : "No date bro"}
</p>
          </div>
        ))
      ) : (
        <p>
          Your friends will appear here once you add them, do so on the chat
          settings tab.
        </p>
      )}
    </div>
  );
}
