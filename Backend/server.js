const WebSocket = require("ws");
const http = require("http");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");

dotenv.config();

// Create HTTP server to bind WebSocket to
const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("WebSocket server is running.");
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Use the correct port for Render
const PORT = process.env.PORT || 10000;

const wss = new WebSocket.Server({ server });

const client = new MongoClient(process.env.MONGO_URI, {});
let db;

client.connect().then(() => {
  db = client.db("WhatsDown");
  console.log("✅ WebSocket server connected to MongoDB");
});

const connectedUsers = {};

wss.on("connection", (socket) => {
  console.log("New client connected:", socket._socket.remoteAddress);

  socket.on("message", async (data) => {
    try {
      console.log("📥 Received message:", data);
      const parsed = JSON.parse(data);
      const {
        type,
        token,
        receiverId,
        message: text,
        to,
        tempId,
        friendId,
      } = parsed;
      console.log("📥 Parsed data:", parsed);

      if (type === "register" && token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
      
        // Prevent duplicate connections
        if (connectedUsers[userId]) {
          console.warn(`⚠️ Duplicate registration attempt by ${userId}`);
          socket.send(
            JSON.stringify({ type: "error", message: "User already connected." })
          );
          return;
        }
      
        connectedUsers[userId] = socket;
        console.log(`✅ Registered user ${userId}`);
      
        broadcastStatus(userId, "online", socket);
        sendOnlineUsersList(userId);
        broadcastOnlineUsers(userId);
      
        return;
      }
      
      if (type === "start-call" && friendId) {
        const senderId = Object.keys(connectedUsers).find(
          (id) => connectedUsers[id] === socket
        );
        
        if (!senderId) {
          console.warn("❌ Could not determine senderId");
          return;
        }
      
        const recipientSocket = connectedUsers[friendId];
      
        if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
          try {
            const offerMessage = JSON.stringify({
              type: "start-call",
              senderId,
              friendId,
              offer: parsed.offer,
            });
            recipientSocket.send(offerMessage);
            console.log(`📞 Sent call offer to ${friendId}`);
          } catch (err) {
            console.error(`🚨 Failed to send offer to ${friendId}:`, err);
          }
        } else {
          console.log(`❌ User ${friendId} is not available for call.`);
        }
      
        return;
      }
      

      if (type === "answer-call" && friendId) {
        const senderId = Object.keys(connectedUsers).find(
          (id) => connectedUsers[id] === socket
        );
        const recipientSocket = connectedUsers[friendId];
        if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
          // Send WebRTC answer
          const answerMessage = JSON.stringify({
            type: "answer-call",
            senderId: senderId,
            friendId: friendId,
            answer: parsed.answer, // This will contain the WebRTC answer (SDP)
          });
          recipientSocket.send(answerMessage);
          console.log(`✅ Call answered by ${friendId}`);
        } else {
          console.log(`❌ User ${friendId} not available to answer the call.`);
        }
        return;
      }

      if (type === "end-call" && friendId) {
        const senderId = Object.keys(connectedUsers).find(
          (id) => connectedUsers[id] === socket
        );
        const recipientSocket = connectedUsers[friendId];
        if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
          // Inform other party the call is ended
          const endCallMessage = JSON.stringify({
            type: "end-call",
            senderId: senderId,
            friendId: friendId,
          });
          recipientSocket.send(endCallMessage);
          console.log(`🔴 Call ended with ${friendId}`);
        } else {
          console.log(`❌ User ${friendId} not available to end the call.`);
        }
        return;
      }

      if (type === "ice-candidate" && friendId) {
        const senderId = Object.keys(connectedUsers).find(
          (id) => connectedUsers[id] === socket
        );
        const recipientSocket = connectedUsers[friendId];
        if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
          const iceCandidateMessage = JSON.stringify({
            type: "ice-candidate",
            senderId: senderId,
            friendId: friendId,
            candidate: parsed.candidate, // ICE candidate
          });
          recipientSocket.send(iceCandidateMessage);
          console.log(`➡️ Sending ICE candidate to ${friendId}`);
        } else {
          console.log(
            `❌ User ${friendId} not available to receive ICE candidate.`
          );
        }
      }

      if (type === "typing" && to) {
        const senderId = Object.keys(connectedUsers).find(
          (id) => connectedUsers[id] === socket
        );

        const recipientSocket = connectedUsers[to];
        if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
          recipientSocket.send(JSON.stringify({ type: "typing", senderId }));
          console.log(`✍️ Sent typing event from ${senderId} to ${to}`);
        } else {
          console.log(`❌ User ${to} not available to receive typing event.`);
        }
        return;
      }

      if (
        type === "message" ||
        type === "forward" ||
        (token && text && receiverId)
      ) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const senderId = decoded.userId;
        const senderNickname = decoded.nickname || "Anonymous";

        const message = {
          type: "message",
          senderId,
          receiverId,
          senderNickname,
          message: text,
          createdAt: new Date(),
          tempId,
          isUnread: receiverId !== senderId, // Mark as unread if the sender is not the receiver
        };

        const messageToSend = JSON.stringify(message);

        console.log("📝 Preparing message to send:", message);

        Promise.all([
          db
            .collection("users")
            .updateOne({ _id: senderId }, { $set: { lastMessage: message } }),
          db
            .collection("users")
            .updateOne({ _id: receiverId }, { $set: { lastMessage: message } }),
        ])
          .then(() => console.log("✅ Updated lastMessage for both users"))
          .catch((err) => console.error("❌ Error updating lastMessage:", err));

        const recipientSocket = connectedUsers[receiverId];
        if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
          console.log(`➡️ Sending message to ${receiverId}`);
          recipientSocket.send(messageToSend);
        } else {
          console.log(`⚠️ User ${receiverId} is not connected.`);
        }

        return;
      }
    } catch (err) {
      console.error("❌ Error processing message:", err.message);
    }
  });

  socket.on("close", () => {
    for (const userId in connectedUsers) {
      if (connectedUsers[userId] === socket) {
        delete connectedUsers[userId];
        console.log(`🔌 User ${userId} disconnected`);
        broadcastStatus(userId, "offline");
        broadcastOnlineUsers(); // ✅ Notify all clients of updated list
        break;
      }
    }
  });
});

function sendOnlineUsersList(newUserId) {
  const onlineUsers = Object.keys(connectedUsers);
  const onlineMessage = JSON.stringify({
    type: "onlineUsers",
    userIds: onlineUsers,
  });

  const newUserSocket = connectedUsers[newUserId];
  if (newUserSocket && newUserSocket.readyState === WebSocket.OPEN) {
    newUserSocket.send(onlineMessage);
    console.log(`📡 Sent online users list to ${newUserId}`);
  }
}

function broadcastOnlineUsers(excludeUserId = null) {
  const onlineUsers = Object.keys(connectedUsers);
  const message = JSON.stringify({
    type: "onlineUsers",
    userIds: onlineUsers,
  });

  for (const id in connectedUsers) {
    if (id === excludeUserId) continue;
    const socket = connectedUsers[id];
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
      console.log(`📡 Sent online users update to ${id}`);
    }
  }
}

function broadcastStatus(userId, status, excludeSocket = null) {
  const statusMessage = JSON.stringify({
    type: "status",
    userId,
    status,
  });

  for (const otherId in connectedUsers) {
    const socket = connectedUsers[otherId];
    if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
      socket.send(statusMessage);
      console.log(`📡 Broadcasted ${status} status for ${userId}`);
    }
  }
}

// Start the server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ WebSocket server listening on port ${PORT}`);
});
