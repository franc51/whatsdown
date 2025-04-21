import React, { useState, useEffect, useRef } from "react";
import "./chat.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";

export default function Chat({ socket, setActiveChatId }) {
  const { friendId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [yourUserId, setYourUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [skip, setSkip] = useState(50);
  const [hasMore, setHasMore] = useState(true);
  const yourUserIdRef = useRef(null);

  const bottomRef = useRef(null);
  const messagesRef = useRef([]);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const {
    nickname,
    status: friendStatus,
    profilePicture,
  } = location.state || {};

  useEffect(() => {
    console.log("🧩 Chat component mounted");
  }, []);

  useEffect(() => {
    setActiveChatId(friendId);
    return () => setActiveChatId(null); // cleanup on unmount
  }, [friendId]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = async () => {
      if (container.scrollTop < 100 && hasMore && !isFetchingMore) {
        await fetchOlderMessages();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, isFetchingMore, messages]);

  const fetchOlderMessages = async () => {
    setIsFetchingMore(true);
    const token = localStorage.getItem("token");
    const oldest = messages[0]?.createdAt;

    try {
      const response = await fetch(
        `https://authservice-xemo.onrender.com/messages/${yourUserId}/${friendId}?limit=50&before=${oldest}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const older = await response.json();

      if (older.length === 0) {
        setHasMore(false);
      } else {
        setMessages((prev) => [...older, ...prev]);
        setTimeout(() => {
          const newScrollHeight = chatContainerRef.current.scrollHeight;
          const containerHeight = chatContainerRef.current.clientHeight;
          chatContainerRef.current.scrollTop =
            newScrollHeight - containerHeight;
        }, 0);
      }
    } catch (err) {
      console.error("❌ Error fetching older messages:", err);
    } finally {
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !friendId) return;

    const decoded = JSON.parse(atob(token.split(".")[1]));
    setYourUserId(decoded.userId);
    yourUserIdRef.current = decoded.userId;

    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `https://authservice-xemo.onrender.com/messages/${decoded.userId}/${friendId}?limit=50`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        setMessages(data);
      } catch (err) {
        console.error("❌ Error fetching message history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [friendId]);

  useEffect(() => {
    if (!socket || !friendId || !yourUserIdRef.current) return;

    const handleMessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        console.log("📥 WS received:", parsed);
        console.log(
          "👤 You (userId):",
          yourUserId,
          "| 👥 Chatting with:",
          friendId
        );

        if (parsed.type === "typing" && parsed.senderId === friendId) {
          console.log("✏️ Friend is typing...");
          setIsFriendTyping(true);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsFriendTyping(false);
            console.log("⌛ Typing timeout expired.");
          }, 3000);
        } else if (parsed.type === "message") {
          const isFromFriendToYou =
            parsed.senderId === friendId && parsed.receiverId === yourUserId;
          const isFromYouToFriend =
            parsed.senderId === yourUserId && parsed.receiverId === friendId;

          console.log(
            `📨 Incoming message | From: ${parsed.senderId} To: ${
              parsed.receiverId
            } | Match: ${isFromFriendToYou || isFromYouToFriend}`
          );

          if (isFromFriendToYou || isFromYouToFriend) {
            setMessages((prev) => [...prev, parsed]);
            console.log("✅ Message added to UI.");
          } else {
            console.log("🚫 Message ignored (not part of current chat).");
          }
        }
      } catch (err) {
        console.error("❌ Failed to parse WS message:", event.data, err);
      }
    };
    socket.removeEventListener("message", handleMessage); // cleanup if previously added
    console.log("🧲 Setting up socket message listener");
    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, friendId]);

  const sendMessage = async () => {
    if (input.trim() === "") return;
    const token = localStorage.getItem("token");
    const tempId = Date.now();
    const createdAt = new Date().toISOString();
    const messageText = input;

    const messageData = {
      senderId: yourUserId,
      receiverId: friendId,
      message: messageText,
      createdAt,
      status: "sending",
      tempId,
    };

    setMessages((prev) => [...prev, messageData]);
    setInput("");

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "message",
          token,
          receiverId: friendId,
          message: messageText,
          createdAt,
        })
      );
    }

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

      const saved = await response.json();

      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === tempId ? { ...msg, status: "sent" } : msg
        )
      );
    } catch (err) {
      console.error("❌ Error saving to DB:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === tempId ? { ...msg, status: "failed" } : msg
        )
      );
    }
  };

  const sendTypingEvent = () => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "typing",
          to: friendId,
        })
      );
    }
  };

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isFriendTyping]);

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
            src={
              profilePicture
                ? `https://authservice-xemo.onrender.com${profilePicture}`
                : "/Images/human.png"
            }
          />
          <div className={`statusIndicator_chat ${statusClass}`}></div>
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
            />
          </div>
        ) : (
          <div className="chat_container" ref={chatContainerRef}>
            {/* 🌀 Loader for fetching older messages */}
            {isFetchingMore && (
              <div className="loader_div">
                <img
                  alt="Loading older messages"
                  className="chats_loader"
                  src="/Images/loader.gif"
                />
              </div>
            )}

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
                    : "No date"}
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
                <img src="/Images/typing2.gif" alt="Typing..." />
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
