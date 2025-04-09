import React, { useState, useEffect } from "react";
import Chat from "../Chat/chat.jsx";
import { useNavigate } from "react-router-dom"; // Hook to navigate

export default function AllChats() {
  const [friends, setFriends] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedFriend, setSelectedFriend] = useState(null);
  const navigate = useNavigate(); // Get the history object for navigation

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setMessage("You must be logged in to see your friends.");
          return;
        }

        const response = await fetch("http://localhost:3002/getFriends", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok) {
          setFriends(data.friends, data.nickname);
        } else {
          setMessage(data.message || "Unable to fetch friends.");
        }
      } catch (err) {
        setMessage("An error occurred. Please try again.");
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

  // 👇 Show chat if one is selected
  if (selectedFriend) {
    return (
      <Chat friend={selectedFriend} onBack={() => setSelectedFriend(null)} />
    );
  }

  return (
    <div className="homepage_chat_list">
      {message && <p>{message}</p>}

      {friends.length > 0 ? (
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
              <div className="homepage_chat_profile">
                <h4 className="homepage_chat_profile_name">
                  {friend.nickname}
                </h4>
                <p className="homepage_chat_profile_lastMessage">
                  {friend.phone}
                </p>
              </div>
            </div>
            <p className="homepage_chat_profile_messageTime">09:44 AM</p>
          </div>
        ))
      ) : (
        <p>No friends found. Add some friends!</p>
      )}
    </div>
  );
}
