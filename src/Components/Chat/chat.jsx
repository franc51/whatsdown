import React, { useState, useEffect, useRef } from "react";
import "./chat.css";
import { useLocation, useNavigate } from "react-router-dom";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [yourUserId, setYourUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState("Connecting...");
  const bottomRef = useRef(null);

  const [isFriendTyping, setIsFriendTyping] = useState(false);

  const socketRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const messagesRef = useRef([]);

  const { friendId, nickname, status: friendStatus } = location.state || {};

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !friendId) return;

    let decoded;
    try {
      decoded = JSON.parse(atob(token.split(".")[1]));
    } catch (e) {
      console.error("Failed to decode token:", e);
      return;
    }

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

  useEffect(() => {
    socketRef.current = new WebSocket(
      "wss://websocket-service-30vz.onrender.com"
    );

    socketRef.current.onopen = () => {
      const token = localStorage.getItem("token");
      if (token) {
        socketRef.current.send(JSON.stringify({ type: "register", token }));
      }
    };

    socketRef.current.onerror = (error) => {
      console.error("WebSocket error", error);
      setWsStatus("WebSocket error, retrying...");
    };

    socketRef.current.onclose = (event) => {
      console.log("WebSocket closed", event);
      setWsStatus("WebSocket closed. Reconnecting...");
      setTimeout(() => {
        socketRef.current = new WebSocket(
          "wss://websocket-service-30vz.onrender.com"
        );
      }, 3000);
    };

    socketRef.current.onmessage = (event) => {
      const message = event.data;

      const handleParsedMessage = (parsed) => {
        console.log("📥 Parsed WebSocket message:", parsed);

        if (parsed.type === "typing" && parsed.senderId === friendId) {
          setIsFriendTyping(true);
          setTimeout(() => {
            setIsFriendTyping(false);
          }, 3000);
          return;
        }
        if (parsed.type === "message") {
          const isDuplicate = messagesRef.current.some(
            (msg) =>
              (msg.tempId && parsed.tempId && msg.tempId === parsed.tempId) ||
              (msg.createdAt === parsed.createdAt &&
                msg.senderId === parsed.senderId &&
                msg.message === parsed.message)
          );

          if (isDuplicate) {
            console.log("🛑 Duplicate message skipped");
            return;
          }

          setMessages((prevMessages) => [
            ...prevMessages,
            { ...parsed, status: "sent" },
          ]);
        }
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
        socketRef.current.close();
      }
    };
  }, []);
  const sendMessage = async () => {
    if (input.trim() === "") return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const tempId = Date.now();
    const messageText = input; // ✅ Store value before it's cleared
    const createdAt = new Date().toISOString();

    const messageData = {
      senderId: yourUserId,
      receiverId: friendId,
      message: messageText,
      createdAt: new Date().toISOString(),
      status: "sending",
      tempId,
    };

    // 1. Optimistically add to UI
    setMessages((prevMessages) => [...prevMessages, messageData]);
    setInput("");

    // 2. Send via WebSocket
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "message",
          token,
          receiverId: friendId,
          message: messageText,
          createdAt: messageData.createdAt,
        })
      );
    }

    // 3. Save to DB
    try {
      const response = await fetch(
        "https://authservice-xemo.onrender.com/sendMessage",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            senderId: yourUserId,
            receiverId: friendId,
            message: messageText,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save. Status: ${response.status}`);
      }

      const saved = await response.json();

      // 4. Update message status in UI
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.tempId === tempId ? { ...msg, status: "sent" } : msg
        )
      );
    } catch (err) {
      console.error("❌ Error saving to DB:", err);
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.tempId === tempId ? { ...msg, status: "failed" } : msg
        )
      );
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
      setIsFriendTyping(false);
    }, 2000);
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
            <p className="homepage_chat_profile_lastMessage">{friendStatus}</p>
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
                {msg.message}
                <span className="timeStamp">
                  {msg.createdAt && new Date(msg.createdAt)
                    ? new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                  {msg.status === "sending" && (
                    <span className="sending"> ⏳</span>
                  )}
                  {msg.status === "failed" && (
                    <span className="failed"> ❌</span>
                  )}
                </span>
              </p>
            ))}
            {/* ✨ Typing indicator */}
            {isFriendTyping && (
              <p
                className={`chat_isTyping incoming ${
                  isFriendTyping ? "visible" : ""
                }`}
              >
                <img src="/Images/typing2.gif"></img>
              </p>
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
