import React, { useState, useEffect, useRef } from "react";
import "./chat.css";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const socketRef = useRef(null);

  // Set up the WebSocket connection
  useEffect(() => {
    // Create WebSocket connection when the component mounts
    socketRef.current = new WebSocket("ws://localhost:8080");

    socketRef.current.onopen = () => {
      console.log("WebSocket connected!");
    };

    socketRef.current.onerror = (error) => {
      console.error("WebSocket error", error);
    };

    // Listen for incoming messages
    socketRef.current.onmessage = (event) => {
      const message = event.data;

      // Check if message is a Blob (binary object)
      if (message instanceof Blob) {
        // Convert Blob to string using FileReader
        const reader = new FileReader();
        reader.onload = () => {
          const textMessage = reader.result;
          setMessages((prevMessages) => [...prevMessages, textMessage]);
        };
        reader.readAsText(message);
      } else {
        // If it's a string, just add it directly
        setMessages((prevMessages) => [...prevMessages, message]);
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
    if (input.trim() === "") return; // Don't send empty messages
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(input); // Send message to WebSocket server
      setInput(""); // Clear input field
    }
  };

  return (
    <div className="homepage">
      <div className="homepage_user">
        <div className="picAndName">
          <img
            className="homepage_chat_profileImg"
            alt="profileImg"
            src="/Images/human.png"
          />
          <div className="homepage_chat_profile">
            <h4 className="homepage_chat_profile_name">Marcelino</h4>
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
            <p key={idx}>{msg}</p> // Display each message
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
