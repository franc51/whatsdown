import React, { useState, useEffect, useRef } from "react";
import "./chat.css";
import { useLocation } from "react-router-dom";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [yourUserId, setYourUserId] = useState(null);

  const socketRef = useRef(null);
  const location = useLocation();

  const { friendId, nickname } = location.state || {};

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setYourUserId(decoded.userId);
    } catch (e) {
      console.error("Error decoding token", e);
    }
  }, []);

  // Set up the WebSocket connection
  useEffect(() => {
    // Create WebSocket connection when the component mounts
    socketRef.current = new WebSocket("ws://localhost:8081");

    socketRef.current.onopen = () => {
      console.log("WebSocket connected!");
  
      const token = localStorage.getItem("token");
      if (token) {
        // Register user with the server immediately
        socketRef.current.send(JSON.stringify({ type: "register", token }));
      }
    };

    socketRef.current.onerror = (error) => {
      console.error("WebSocket error", error);
    };

    // Listen for incoming messages
    socketRef.current.onmessage = (event) => {
      const message = event.data;
      console.log("Received message:", message);
      // Check if message is a Blob (binary object)
      if (message instanceof Blob) {
        // Convert Blob to string using FileReader
        const reader = new FileReader();
        reader.onload = () => {
          const textMessage = reader.result;
          try {
            const parsed = JSON.parse(textMessage);
            setMessages((prevMessages) => [...prevMessages, parsed]);
            console.log("Updated messages:", parsed);
          } catch (e) {
            console.log("Error parsing message blob:", e);
          }
        };
        reader.readAsText(message);
      } else {
        try {
          const parsed = JSON.parse(message);
          setMessages((prevMessages) => [...prevMessages, parsed]);
        } catch (e) {
          console.log("Error parsing message:", e);
        }
      }
    };

    // Cleanup: Close WebSocket when the component unmounts
    return () => {
      if (socketRef.current) {
        console.log("WebSocket disconnected");
        socketRef.current.close();
      }
    };
  }, []); // Empty dependency array means it runs once when the component mounts

  const sendMessage = () => {
    if (input.trim() === "") return;

    const token = localStorage.getItem("token");
    if (!token) return;
    const messageData = {
      text: input,
      receiverId: friendId,
      token, // you can decode this server-side to get the senderId
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(messageData));
      setInput("");
    }
  };

  return (
    <div className="homepage_chat_list">
      <div className="homepage_user">
        <div className="picAndName">
          <img
            className="homepage_chat_profileImg"
            alt="profileImg"
            src="/Images/human.png"
          />
          <div className="homepage_chat_profile">
            <h4 className="homepage_chat_profile_name">{nickname}</h4>
            <p className="homepage_chat_profile_lastMessage">Online</p>
          </div>
        </div>
        <div>
          <button className="homepage_searchBtn searchMenuBtn_style" />
          <button className="homepage_menuBtn searchMenuBtn_style" />
        </div>
      </div>

      <div className="chat_and_sender">
        <div className="chat_container">
          {messages.map((msg, idx) => (
            <p
              key={idx}
              className={`messageBubble ${
                yourUserId && msg.senderId === yourUserId
                  ? "outgoing"
                  : "incoming"
              }`}
            >
              <strong>{msg.senderNickname || "Friend"}:</strong> {msg.text}
            </p>
          ))}
        </div>

        <div className="chat_sender">
          <input
            className="chat_sender_input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            className="chat_sender_submit"
            type="submit"
            onClick={sendMessage}
          ></button>
        </div>
      </div>
    </div>
  );
}
