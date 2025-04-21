import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
} from "react-router-dom"; // Make sure to import useParams here

import { jwtDecode } from "jwt-decode";
import "./App.css";
import { useEffect, useRef, useState } from "react";
import WelcomePage from "./Components/Welcome-page/welcome-page.jsx";
import Homepage from "./Components/Homepage/homepage.jsx";
import Chat from "./Components/Chat/chat.jsx";
import Account from "./Components/Account/account.jsx";
import Login from "./Components/Login/login.jsx";

function App() {
  const { friendId } = useParams(); // Using useParams to grab friendId from URL
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendsError, setFriendsError] = useState("");
  const [activeChatId, setActiveChatId] = useState(null);

  const socketRef = useRef(null);

  useEffect(() => {
    console.log("Friend ID in Chat component:", friendId);
  }, [friendId]);

  useEffect(() => {
    console.log("Messages in Chat component:", messages);
  }, [messages]);

  // ✅ Setup WebSocket singleton
  useEffect(() => {
    const setupWebSocket = () => {
      const token = localStorage.getItem("token");
      console.log("Sending token to WebSocket:", token);
      if (!token) {
        console.log("❌ No token found, WebSocket setup aborted");
        return;
      }

      console.log("✅ Setting up WebSocket connection...");
      const ws = new WebSocket("wss://websocket-service-30vz.onrender.com");
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        const token = localStorage.getItem("token");
        if (token) {
          console.log("Sending registration message with token");
          ws.send(JSON.stringify({ type: "register", token }));
        }
      };

      ws.onmessage = (event) => {
        console.log("📥 WebSocket message received:", event.data);
        const msg = event.data;

        const handleParsed = (parsed) => {
          if (parsed.type === "typing") {
            console.log("💬 Typing status received:", parsed);
            if (parsed.fromId === activeChatId) {
              setIsFriendTyping(true);
              setTimeout(() => setIsFriendTyping(false), 3000);
            }
          }
          if (parsed.type === "message") {
            console.log("💬 Message received:", parsed);
            setMessages((prev) => [...prev, parsed]);
          }
          if (parsed.type === "status") {
            console.log("👤 Status update:", parsed);
            const { userId, status } = parsed;
            setOnlineUsers((prev) => ({
              ...prev,
              [userId]: status,
            }));
          }
          if (parsed.type === "onlineUsers") {
            console.log("👥 Online users update:", parsed);
            const online = {};
            parsed.userIds.forEach((id) => {
              online[id] = "online";
            });
            setOnlineUsers((prev) => ({ ...prev, ...online }));
          }
        };

        // Check if the message is a blob (binary data)
        if (msg instanceof Blob) {
          console.log("⚠️ Received Blob data, parsing...");
          const reader = new FileReader();
          reader.onload = () => handleParsed(JSON.parse(reader.result));
          reader.readAsText(msg);
        } else {
          console.log("🔍 Parsing JSON message...");
          handleParsed(JSON.parse(msg));
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setTimeout(setupWebSocket, 3000); // reconnect
      };

      ws.onclose = () => {
        console.log("🔌 WebSocket closed. Reconnecting...");
        setTimeout(setupWebSocket, 3000); // reconnect
      };
    };

    // Set up the WebSocket only once
    setupWebSocket();

    // Cleanup the WebSocket connection on component unmount
    return () => {
      if (socketRef.current) {
        console.log("❌ Cleaning up WebSocket connection...");
        socketRef.current.close();
      }
    };
  }, []); // Empty dependency array to run only once

  // Fetch friends when the user is logged in
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        console.log("🔄 Fetching friends list...");
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
          const sorted = data.friends.sort((a, b) => {
            const timeA = new Date(a.lastMessageTime || 0).getTime();
            const timeB = new Date(b.lastMessageTime || 0).getTime();
            return timeB - timeA;
          });
          setFriends(sorted);
        } else {
          console.error(
            "⚠️ Error fetching friends:",
            data.message || "Unable to fetch friends."
          );
          setFriendsError(data.message || "Unable to fetch friends.");
        }
      } catch (err) {
        console.error("⚠️ An error occurred while fetching friends:", err);
        setFriendsError("An error occurred. Please try again.");
      } finally {
        setFriendsLoading(false);
      }
    };

    if (isLoggedIn) fetchFriends();
  }, [isLoggedIn]);

  // Token check & login state
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const isExpired = decoded.exp * 1000 < Date.now();
        if (isExpired) {
          console.log("❌ Token expired, logging out...");
          localStorage.removeItem("token");
          setIsLoggedIn(false);
        } else {
          console.log("✅ Token valid, user logged in.");
          setIsLoggedIn(true);
        }
      } catch (e) {
        console.error("⚠️ Invalid token:", e);
        localStorage.removeItem("token");
        setIsLoggedIn(false);
      }
    }

    const handleLoad = () => setIsPageLoading(false);
    if (document.readyState === "complete") {
      setIsPageLoading(false);
    } else {
      window.addEventListener("load", handleLoad);
    }

    return () => window.removeEventListener("load", handleLoad);
  }, []);

  // Message sender
  const sendMessage = (message) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log("📤 Sending message:", message);
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn("❌ WebSocket not open, unable to send message.");
    }
  };

  if (isPageLoading) {
    return (
      <img alt="Loading" className="chats_loader" src="/Images/loader.gif" />
    );
  }

  if (isLoggedIn) {
    return (
      <div>
        <Router>
          <Routes>
            <Route
              path="/"
              element={
                <Homepage
                  friends={friends}
                  onlineUsers={onlineUsers}
                  loading={friendsLoading}
                  error={friendsError}
                />
              }
            />
            <Route
              path="/chat/:friendId" // This is where friendId is captured from the URL
              element={
                <Chat
                  messages={messages}
                  isFriendTyping={isFriendTyping}
                  sendMessage={sendMessage}
                  setMessages={setMessages}
                  setActiveChatId={setActiveChatId}
                  friendId={friendId} // Pass friendId as prop to Chat component
                />
              }
            />
            <Route path="/account" element={<Account />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </Router>
      </div>
    );
  }

  return (
    <div>
      <WelcomePage />
    </div>
  );
}

export default App;
