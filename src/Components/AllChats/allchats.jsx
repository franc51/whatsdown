import React, { useState, useEffect } from "react";

export default function AllChats() {
  const [friends, setFriends] = useState([]);
  const [message, setMessage] = useState("");

  // Fetch friends list when the component mounts
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
            Authorization: `Bearer ${token}`, // Send the JWT token in the Authorization header
          },
        });

        const data = await response.json();

        if (response.ok) {
          setFriends(data.friends);
        } else {
          setMessage(data.message || "Unable to fetch friends.");
        }
      } catch (err) {
        setMessage("An error occurred. Please try again.");
      }
    };

    fetchFriends();
  }, []);

  return (
    <div className="homepage_chat_list">
      {message && <p>{message}</p>}

      {friends.length > 0 ? (
        friends.map((friend) => (
          <div className="homepage_chat_list_item" key={friend._id}>
            <div className="picAndName">
              <img
                className="homepage_chat_profileImg"
                alt="profileImg"
                src="/Images/human.png" // You can modify this to show friend's profile image if available
              />
              <div className="homepage_chat_profile">
                <h4 className="homepage_chat_profile_name">
                  {friend.nickname}
                </h4>
                <p className="homepage_chat_profile_lastMessage">
                  {friend.phone}{" "}
                  {/* Placeholder for last message, modify as needed */}
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
