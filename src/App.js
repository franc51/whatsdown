import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

import "./App.css";
import WelcomePage from "./Components/Welcome-page/welcome-page.jsx";
import Homepage from "./Components/Homepage/homepage.jsx";
import Chat from "./Components/Chat/chat.jsx";
import Account from "./Components/Account/account.jsx";
import Login from "./Components/Login/login.jsx";
import { useWebSocket } from "./Components/Hooks/useWebSocket.js";

function App() {
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendsError, setFriendsError] = useState("");
  const [activeChatId, setActiveChatId] = useState(null);
  const [socketError, setSocketError] = useState(null);

  const {
    socket,
    sendMessage,
    connected: wsConnected,
  } = useWebSocket({
    onMessage: (parsed) => {
      setMessages((prev) => [...prev, parsed]);

      if (
        document.visibilityState === "hidden" &&
        Notification.permission === "granted"
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification("New message", {
            body: parsed.content,
            icon: "default-avatar.png",
            data: { url: `/chat/${parsed.senderId}` },
          });
        });
      }
    },
    onTyping: (parsed) => {
      if (parsed.fromId === activeChatId) {
        setIsFriendTyping(true);
        setTimeout(() => setIsFriendTyping(false), 3000);
      }
    },
    onStatusUpdate: (parsed) => {
      if (parsed.type === "status") {
        setOnlineUsers((prev) => ({ ...prev, [parsed.userId]: parsed.status }));
      } else if (parsed.type === "onlineUsers") {
        const map = {};
        parsed.userIds.forEach((id) => (map[id] = "online"));
        setOnlineUsers((prev) => ({ ...prev, ...map }));
      }
    },
    onError: () => {
      setSocketError("WebSocket error");
    },
    onReconnectAttempt: () => {
      console.log("🔁 Attempting WebSocket reconnection...");
    },
  });

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

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
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
          console.error("⚠️ Error fetching friends:", data.message);
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

  if (isPageLoading) {
    return (
      <img alt="Loading" className="chats_loader" src="/Images/loader.gif" />
    );
  }

  if (isLoggedIn) {
    return (
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
            path="/chat/:friendId"
            element={
              <Chat
                socket={socket}
                messages={messages}
                isFriendTyping={isFriendTyping}
                sendMessage={sendMessage}
                setMessages={setMessages}
                setActiveChatId={setActiveChatId}
                wsConnected={wsConnected}
                onlineUsers={onlineUsers}
              />
            }
          />
          <Route path="/account" element={<Account />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Router>
    );
  }

  return <WelcomePage />;
}

export default App;
