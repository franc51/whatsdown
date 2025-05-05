import React, { useState, useEffect, useRef } from "react";
import "./chat.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import VideoCall from "../VideoCall/videocall";

export default function Chat({ socket, setActiveChatId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [yourUserId, setYourUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [skip, setSkip] = useState(50);
  const [hasMore, setHasMore] = useState(true);
  const [friendPhone, setFriendPhone] = useState(""); // To store phone number input
  const [isInCall, setIsInCall] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const yourUserIdRef = useRef(null);
  const friendIdRef = useRef(null);
  const [message, setMessage] = useState(""); // For showing success/error messages

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef([]);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageHandlerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    nickname,
    status: friendStatus,
    profilePicture,
    wsConnected,
  } = location.state || {};

  const params = useParams();
  const friendId = params.friendId || location.state?.friendId;

  const handleEndCall = () => {
    setIsInCall(false);
  };

  useEffect(() => {
    friendIdRef.current = friendId;
    yourUserIdRef.current = yourUserId;
  }, [friendId, yourUserId]);

  useEffect(() => {
    if (!socket) return;
    const token = localStorage.getItem("token");

    const register = () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "register", token }));
      }
    };

    socket.addEventListener("open", register);
    return () => socket.removeEventListener("open", register);
  }, [socket]);

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
        setMessages(data.map((msg) => ({ ...msg, isUnread: false })));
      } catch (err) {
        console.error("❌ Error fetching message history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [friendId]);

  useEffect(() => {
    if (!socket || !friendIdRef.current || !yourUserIdRef.current) return;

    const handleMessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        console.log("📥 WS received:", parsed);

        const { senderId, receiverId, type } = parsed;

        if (
          type === "start-call" &&
          parsed.senderId === friendIdRef.current
        ) {
          console.log("🚨 Incoming call detected! Showing call modal.");
          setIsInCall(true);
        }

        // Handle typing event
        if (type === "typing" && senderId === friendIdRef.current) {
          console.log("✏️ Friend is typing...");
          setIsFriendTyping(true);

          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsFriendTyping(false);
            console.log("⌛ Typing timeout expired.");
          }, 1000);

          // Handle message event
        } else if (type === "message") {
          const isFromFriendToYou =
            senderId === friendIdRef.current &&
            receiverId === yourUserIdRef.current;
          const isFromYouToFriend =
            senderId === yourUserIdRef.current &&
            receiverId === friendIdRef.current;

          console.log(
            `📨 Incoming message | From: ${senderId} To: ${receiverId} | Match: ${
              isFromFriendToYou || isFromYouToFriend
            }`
          );

          // If the message is part of the current chat, add it
          if (isFromFriendToYou || isFromYouToFriend) {
            // Mark the message as unread if it's a new incoming message (and not sent by you)
            const updatedMessage = {
              ...parsed,
              isUnread: senderId !== yourUserIdRef.current,
            };

            // Add new message to the chat history
            setMessages((prev) => [...prev, updatedMessage]);
            console.log("✅ Message added to UI.");
            // If it's from the friend to you, it should be marked as unread
            if (isFromFriendToYou) {
              console.log("📥 New unread message from your friend");
            }
          } else {
            console.log("🚫 Message ignored (not part of current chat).");
          }
        }
      } catch (err) {
        console.error("❌ Failed to parse WS message:", event.data, err);
      }
    };

    messageHandlerRef.current = handleMessage;

    socket.addEventListener("message", handleMessage);

    return () => {
      if (messageHandlerRef.current) {
        socket.removeEventListener("message", messageHandlerRef.current);
      }
    };
  }, [socket, friendIdRef.current, yourUserIdRef.current]);

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
    inputRef.current?.focus();

    // Check if WebSocket is defined and open
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log("WebSocket readyState:", socket.readyState); // Log the readyState for debugging
      socket.send(
        JSON.stringify({
          type: "message",
          token,
          receiverId: friendId,
          message: messageText,
          createdAt,
        })
      );
    } else {
      console.warn("❌ WebSocket is not open or socket is undefined");
    }

    try {
      // Send message to the server to save in the database
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

      // Update message status to 'sent' after the server confirms it is saved
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === tempId ? { ...msg, status: "sent" } : msg
        )
      );
    } catch (err) {
      console.error("❌ Error saving to DB:", err);

      // Update message status to 'failed' in case of an error
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
    if (!socket) {
      console.warn("❌ Socket is not passed to the Chat component");
      return;
    }
    // Handle WebSocket events, like 'message', etc.
  }, [socket]); // Effect to check socket once it's passed
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isFriendTyping]);

  const statusClass = friendStatus === "online" ? "online" : "offline";
  useEffect(() => {
    if (socket) {
    }
  }, [socket]); // The effect runs whenever 'socket' state changes

  useEffect(() => {
    // Request notification permission when the component mounts
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        if (permission !== "granted") {
          console.warn("Notification permission not granted");
        }
      });
    } else {
      console.warn("This browser does not support notifications.");
    }
  }, []);

  const handleDeleteFriend = async () => {
    const friendId = location.state?.friendId; // 👈 Make sure you pass the friend's _id when opening the chat!

    if (!friendId) {
      setMessage("Friend ID not found.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this friend?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setMessage("You must be logged in to delete friends.");
        return;
      }

      const response = await fetch(
        "https://authservice-xemo.onrender.com/deleteFriend",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            friendId: friendId, // 👈 pass friend ID
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Friend deleted successfully!");
        setTimeout(() => {
          setMessage("");
          navigate("/"); // go back to home or friends list
        }, 2000);
      } else {
        setMessage(data.message || "An error occurred. Please try again.");
      }
    } catch (err) {
      setMessage("An error occurred. Please try again.");
    }

    setTimeout(() => setMessage(""), 5000);
  };

  // Define handleAcceptCall
  const handleAcceptCall = () => {
    console.log("Call accepted!");

    // Send a WebSocket message to the caller to notify call is accepted
    socket?.send(
      JSON.stringify({
        type: "accept-call",
        senderId: yourUserId,
        friendId: friendId,
      })
    );
    navigate("/videocall", { state: { friendId, yourUserId } });
  };

  // Define handleRejectCall
  const handleRejectCall = () => {
    console.log("Call rejected!");

    // Send a WebSocket message to notify rejection
    socket?.send(
      JSON.stringify({
        type: "reject-call",
        senderId: yourUserId,
        friendId: friendId,
      })
    );

    // Hide the call modal (you probably have a state like setIsReceivingCall(false))
    isInCall(false);
  };

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
            src="/Images/user_default.png"
          />
          <div className={`statusIndicator_chat ${statusClass}`}></div>
          <div className="homepage_chat_profile">
            <h4 className="homepage_chat_profile_name">{nickname}</h4>
            <p className="homepage_chat_profile_lastMessage">{friendStatus}</p>
          </div>
        </div>
        <div className="videocall_deleteFriend">
          {/* Button to start the call */}
          <button
            className="chat_videoCall"
            onClick={() =>
              navigate("/videocall", {
                state: {
                  friendId,
                  yourUserId,
                  isCaller: true, // explicitly mark as caller
                },
              })
            }
          />

          {/* Button to delete the friend */}
          <button
            title="Delete friend"
            className="deleteFriend_btn btn_style"
            onClick={handleDeleteFriend}
          ></button>
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
            ref={inputRef}
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
        {isInCall && (
          <div className="callModal">
            <h2>Incoming call from {nickname}!</h2>
            <button onClick={handleAcceptCall}>Accept</button>
            <button onClick={handleRejectCall}>Reject</button>
          </div>
        )}
      </div>
    </div>
  );
}
