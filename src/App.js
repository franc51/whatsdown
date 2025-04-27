import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
} from "react-router-dom";

import { jwtDecode } from "jwt-decode";
import "./App.css";
import { useEffect, useRef, useState, createContext, useContext } from "react";
import WelcomePage from "./Components/Welcome-page/welcome-page.jsx";
import Homepage from "./Components/Homepage/homepage.jsx";
import Chat from "./Components/Chat/chat.jsx";
import Account from "./Components/Account/account.jsx";
import Login from "./Components/Login/login.jsx";
import VideoCall from "./Components/VideoCall/videocall.jsx";

function App() {
  const [wsConnected, setWsConnected] = useState(false);
  const { friendId } = useParams();
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendsError, setFriendsError] = useState("");
  const [activeChatId, setActiveChatId] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const socketRef = useRef(null);
  // ✅ Setup WebSocket singleton
  useEffect(() => {
    const setupWebSocket = () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("❌ No token found, WebSocket setup aborted");
        return;
      }

      const ws = new WebSocket("wss://websocket-service-30vz.onrender.com");
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        setWsConnected(true); // Update WebSocket connection status to open
        const token = localStorage.getItem("token");
        if (token) {
          console.log("Sending registration message with token");
          ws.send(JSON.stringify({ type: "register", token }));
        }
      };

      ws.onmessage = (event) => {
        const msg = event.data;
        const handleParsed = (parsed) => {
          if (parsed.type === "typing") {
            if (parsed.fromId === activeChatId) {
              setIsFriendTyping(true);
              setTimeout(() => setIsFriendTyping(false), 3000);
            }
          }
          if (parsed.type === "message") {
            setMessages((prev) => [...prev, parsed]);

            if (
              document.visibilityState === "hidden" &&
              Notification.permission === "granted"
            ) {
              navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification("New message", {
                  body: parsed.content,
                  icon: "default-avatar.png", // Set a default icon
                  data: { url: `/chat/${parsed.senderId}` },
                });
              });
            }
          }
          if (parsed.type === "status") {
            const { userId, status } = parsed;
            setOnlineUsers((prev) => ({ ...prev, [userId]: status }));
          }
          if (parsed.type === "onlineUsers") {
            const onlineMap = {};
            parsed.userIds.forEach((id) => {
              onlineMap[id] = "online";
            });
            setOnlineUsers((prev) => ({ ...prev, ...onlineMap }));
          }

          // Handling Video Call Events:
          if (parsed.type === "start-call") {
            // Handle start call event
            if (parsed.friendId === activeChatId) {
              // Automatically prompt user with a call dialog
              console.log(`Incoming call from ${parsed.friendId}`);
              // Optionally: set up UI for answering the call here
            }
          }

          if (parsed.type === "end-call") {
            // Handle end call event
            console.log(`Call with ${parsed.friendId} has ended.`);
            // Optionally: Clean up UI and state when call ends
          }
        };

        if (parsed.type === "accept-call") {
          console.log(`Call accepted by ${parsed.senderId}`);
          // You can navigate to the call page here
          navigate("/call", {
            state: { friendId: parsed.senderId, yourUserId: yourUserId },
          });
        }

        if (parsed.type === "reject-call") {
          console.log(`Call rejected by ${parsed.senderId}`);
          // Optionally: Show a "Call Rejected" popup or notification
        }

        if (msg instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => handleParsed(JSON.parse(reader.result));
          reader.readAsText(msg);
        } else {
          handleParsed(JSON.parse(msg));
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setWsConnected(false);
        setTimeout(setupWebSocket, 3000); // Try to reconnect
      };

      ws.onclose = () => {
        console.log("🔌 WebSocket closed. Reconnecting...");
        setWsConnected(false);
        setTimeout(setupWebSocket, 3000); // Try to reconnect
      };
    };

    setupWebSocket();

    return () => {
      if (socketRef.current) {
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
              path="/videocall"
              element={<VideoCall socket={socketRef.current} />}
            ></Route>
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
                  socket={socketRef.current}
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
