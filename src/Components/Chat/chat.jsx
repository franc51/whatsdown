import React, { useState, useEffect, useRef } from "react";
import "./chat.css";
import { useLocation, useNavigate } from "react-router-dom";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [yourUserId, setYourUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState("Offline"); // Track friend status
  const [wsStatus, setWsStatus] = useState("Connecting...");

  const bottomRef = useRef(null);

  const [isFriendTyping, setIsFriendTyping] = useState(false);

  const socketRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { friendId, nickname } = location.state || {};

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !friendId) return;
  
    const decoded = JSON.parse(atob(token.split(".")[1]));
    const userId = decoded.userId;
    setYourUserId(userId);
  
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `https://authservice-xemo.onrender.com/messages/${userId}/${friendId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
  
        if (!response.ok) {
          throw new Error(`Fetch failed with status ${response.status}`);
        }
  
        const data = await response.json();
        setMessages(data);
        console.log("💬 Fetched messages:", data);
      } catch (err) {
        console.error("❌ Error fetching message history:", err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchMessages();
  }, [friendId]);
  
  useEffect(() => {
    if (!friendId || !nickname) {
      navigate("/", { replace: true });
    }
  }, []);
  
  

  // Set up the WebSocket connection
  useEffect(() => {
    // Create WebSocket connection when the component mounts
    socketRef.current = new WebSocket(
      "wss://websocket-service-30vz.onrender.com"
    );

    socketRef.current.onopen = () => {
      console.log("WebSocket connected!");
      
      const token = localStorage.getItem("token");
      const idSnippet = friendId ? `Friend ${nickname}` : "Unknown user";
    
      setWsStatus(`${idSnippet} hooked to WebSocket`);
    
      if (token) {
        socketRef.current.send(JSON.stringify({ type: "register", token }));
      }
    };
    

    socketRef.current.onerror = (error) => {
      console.error("WebSocket error", error);
    };
    socketRef.current.onmessage = (event) => {
      const message = event.data;

      const handleParsedMessage = (parsed) => {
        // 🟡 Handle typing indicator
        if (parsed.type === "typing" && parsed.senderId === friendId) {
          setIsFriendTyping(true);

          // Remove indicator after 1.7s if no new typing
          setTimeout(() => {
            setIsFriendTyping(false);
          }, 3000);

          return;
        }
        // Handle incoming status updates (online/offline)
        if (parsed.type === "status") {
          if (parsed.userId === friendId) {
            setFriendStatus(parsed.status === "online" ? "Online" : "Offline");
          }
        }
        setMessages((prevMessages) => [...prevMessages, parsed]);
      };

      if (message instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(reader.result);
            handleParsedMessage(parsed);
          } catch (e) {
            console.log("Error parsing message blob:", e);
          }
        };
        reader.readAsText(message);
      } else {
        try {
          const parsed = JSON.parse(message);
          handleParsedMessage(parsed);
        } catch (e) {
          console.log("Error parsing message:", e);
        }
      }
    };

    return () => {
      if (socketRef.current) {
        console.log("WebSocket disconnected");
        socketRef.current.close();
        // Optionally remove setWsStatus here
      }
    };
  }, []); // Empty dependency array means it runs once when the component mounts

  const sendMessage = async () => {
    if (input.trim() === "") return; // Don't send empty messages
  
    const token = localStorage.getItem("token");
    if (!token) return;
  
    const messageData = {
      senderId: yourUserId,  // The sender's ID
      receiverId: friendId,  // The receiver's ID
      message: input,        // The actual message content
    };
  
    try {
      // Send the message via POST request
      const response = await fetch("https://authservice-xemo.onrender.com/sendMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(messageData),
      });
  
      // Check if the response is okay
      if (!response.ok) {
        throw new Error(`Failed to send message. Status: ${response.status}`);
      }
  
      const responseData = await response.json();
  
      // If the message was successfully sent, update the UI
      console.log("Message sent successfully:", responseData);
  
      // Optionally update the local messages array with the sent message
      setMessages((prevMessages) => [
        ...prevMessages,
        { 
          senderId: yourUserId, 
          receiverId: friendId, 
          text: input, 
          createdAt: new Date(),
        }
      ]);
  
      // Reset the input field after sending
      setInput("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isFriendTyping]);

  const typingTimeoutRef = useRef(null);

  const sendTypingEvent = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "typing",
          to: friendId,
        })
      );
    }
  
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 3000); // Adjust if needed
  };

  // Display the status next to the friend's name
  const statusClass = friendStatus === "online" ? "online" : "offline";

  return (
    <div className="homepage_chat_list_openedChat">
      <div className="chat_user">
        <div className="picAndName">
          <button
            className="homepage_goBackToAllChats"
            onClick={() => navigate("/")}
          ></button>
          <img
            className="homepage_chat_profileImg"
            alt="profileImg"
            src="/Images/human.png"
          />
          <div
            className={`statusIndicator ${statusClass}`} // Dynamically apply status class
          ></div>
          <div className="homepage_chat_profile">
            <h4 className="homepage_chat_profile_name">{nickname}</h4>
            <p className="homepage_chat_profile_lastMessage">
              {wsStatus}
            </p>
          </div>
        </div>
        <div>
          <button className="chat_videoCall searchMenuBtn_style" />
          <button className="chat_account searchMenuBtn_style" />
        </div>
      </div>

      <div className="chat_and_sender">
        {loading ? (
          <div className="loader_div">
            <img
              alt="Loading"
              className="chats_loader"
              src="/Images/loader.gif"
            ></img>
          </div>
        ) : (
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
                {msg.text || msg.message || "[no content]"}
                <span className="timeStamp">
                  {msg.createdAt && new Date(msg.createdAt)
                    ? new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
              </p>
            ))}
            {/* ✨ Typing indicator */}
            {isFriendTyping && (
              <p className="chat_isTyping incoming">Typing...</p>
            )}
            <div ref={bottomRef}></div>
          </div>
        )}

        <div className="chat_sender">
          <input
            className="chat_sender_input"
            type="text"
            placeholder="Message"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              sendTypingEvent();
            }}
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
