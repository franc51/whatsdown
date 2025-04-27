import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
} from "react-router-dom";
import { useEffect, useRef, useState, createContext, useContext } from "react";
import { jwtDecode } from "jwt-decode";

import "./App.css";
import WelcomePage from "./Components/Welcome-page/welcome-page.jsx";
import Homepage from "./Components/Homepage/homepage.jsx";
import Chat from "./Components/Chat/chat.jsx";
import Account from "./Components/Account/account.jsx";
import Login from "./Components/Login/login.jsx";
import VideoCall from "./Components/VideoCall/videocall.jsx";

function App() {
  const [wsConnected, setWsConnected] = useState(false);
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

  const [isInCall, setIsInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [senderId, setSenderId] = useState(false);
  const [Offer, setOffer] = useState(false);
  const [peerConnection, setPeerConnection] = useState(false);

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
          ws.send(JSON.stringify({ type: "register", token }));
        }
      };

      ws.onmessage = (event) => {
        const msg = event.data;

        // Function to handle the parsed data
        const handleParsed = (parsed) => {
          if (!parsed) return; // Safeguard: don't proceed if parsed is not defined

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
            if (parsed.friendId === activeChatId) {
              console.log(`Incoming call from ${parsed.senderId}`);
              // Here, trigger the UI to show an "Accept" and "Decline" button
              // Example: set state to show the modal or buttons
              setIsInCall(false); // Not yet in call, waiting for the user to accept
              setIncomingCall(true); // Show "Accept/Decline" buttons on UI
              setSenderId(parsed.senderId); // Store the senderId to use in the accept/answer call
              setOffer(parsed.offer); // Store the offer to set as remote description
            }
          }

          if (parsed.type === "answer") {
            // Handle the answer
            if (peerConnection.current) {
              peerConnection.current.setRemoteDescription(
                new RTCSessionDescription(parsed.answer)
              );
            }
          }

          if (parsed.type === "end-call") {
            console.log(`Call with ${parsed.friendId} has ended.`);
          }
        };

        // Check if msg is a Blob (binary data)
        if (msg instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => handleParsed(JSON.parse(reader.result));
          reader.readAsText(msg);
        } else {
          try {
            handleParsed(JSON.parse(msg)); // Try parsing and handle
          } catch (error) {
            console.error("Error parsing WebSocket message", error); // Catch parsing errors
          }
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

    setupWebSocket(); // Initialize the WebSocket connection

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [activeChatId]); // Dependency array to ensure WebSocket setup is re-triggered when `activeChatId` changes

  // Fetch friends when the user is logged in
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
