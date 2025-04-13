import React, { useState, useEffect, useRef } from "react";
import "./chat.css";
import { useLocation, useNavigate } from "react-router-dom";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [yourUserId, setYourUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState("Offline"); // Track friend status

  const bottomRef = useRef(null);

  const [isFriendTyping, setIsFriendTyping] = useState(false);

  const socketRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

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
    socketRef.current = new WebSocket(
      "https://websocket-service-30vz.onrender.com"
    );

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
      token,
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(messageData));
      setInput("");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (!yourUserId || !friendId) {
      console.warn("Waiting for userId or friendId...", {
        yourUserId,
        friendId,
      });
      return;
    }

    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `https://authservice-xemo.onrender.com/messages/${yourUserId}/${friendId}`,
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
  }, [yourUserId, friendId]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isFriendTyping]);

  let typingTimeout;
  const sendTypingEvent = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "typing",
          to: friendId,
        })
      );
    }

    // Debounce: Prevent sending multiple times per second
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      typingTimeout = null;
    }, 4000); // wait 3s before allowing another "typing" event
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
              {friendStatus === "online" ? "Online" : "Offline"}
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
                {msg.text}
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
              <p className="chat_isTyping incoming">Typing . . . </p>
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
