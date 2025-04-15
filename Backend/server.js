const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");

dotenv.config();

const wss = new WebSocket.Server({ port: 8081 });
console.log("✅ WebSocket server is listening on ws://localhost:8081");

const client = new MongoClient(process.env.MONGO_URI, {});
let db;

client.connect().then(() => {
  db = client.db("WhatsDown");
  console.log("✅ WebSocket server connected to MongoDB");
});

const connectedUsers = {}; // { userId: socket }

wss.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("message", async (data) => {
    try {
      const parsed = JSON.parse(data);
      const { type, token, receiverId, message: text, to, tempId } = parsed;

      // 🔐 Handle user registration
      if (type === "register" && token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        connectedUsers[userId] = socket;
        console.log(`✅ Registered user ${userId}`);
        broadcastStatus(userId, "online", socket);

        // Send the list of currently online users to the newly connected user
        sendOnlineUsersList(userId);
        return;
      }

      // ✍️ Handle typing
      if (type === "typing" && to) {
        const senderId = Object.keys(connectedUsers).find(
          (id) => connectedUsers[id] === socket
        );

        const recipientSocket = connectedUsers[to];
        if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
          recipientSocket.send(JSON.stringify({ type: "typing", senderId }));
          console.log(`✍️ Sent typing event from ${senderId} to ${to}`);
        }
        return;
      }

      // 💬 Handle message (normal or forward)
      if (
        type === "message" ||
        type === "forward" ||
        (token && text && receiverId)
      ) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const senderId = decoded.userId;
        const senderNickname = decoded.nickname || "Anonymous";
        connectedUsers[senderId] = socket;

        const message = {
          type: "message",
          senderId,
          receiverId,
          senderNickname,
          message: text,
          createdAt: new Date(),
          tempId,
        };

        const messageToSend = JSON.stringify(message);

        console.log("📝 Preparing message to send:", message);

        // Update lastMessage for both the sender and the receiver
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

        // Broadcast to recipient if connected
        const recipientSocket = connectedUsers[receiverId];
        if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
          console.log(`➡️ Sending message to ${receiverId}`);
          recipientSocket.send(messageToSend);
        } else {
          console.log(
            `⚠️ User ${receiverId} is not connected or WebSocket is closed.`
          );
        }

        // Echo to sender if applicable
        if (type !== "forward" && socket.readyState === WebSocket.OPEN) {
          socket.send(messageToSend);
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
        break;
      }
    }
  });
});

// Send the list of currently online users to the newly connected user
function sendOnlineUsersList(newUserId) {
  const onlineUsers = Object.keys(connectedUsers);
  const onlineMessage = JSON.stringify({
    type: "onlineUsers",
    userIds: onlineUsers,
  });

  const newUserSocket = connectedUsers[newUserId];
  if (newUserSocket && newUserSocket.readyState === WebSocket.OPEN) {
    newUserSocket.send(onlineMessage);
  }
}

function broadcastStatus(userId, status, excludeSocket = null) {
  const statusMessage = JSON.stringify({
    type: "status",
    userId,
    status, // "online" or "offline"
  });

  for (const otherId in connectedUsers) {
    const socket = connectedUsers[otherId];
    if (socket !== excludeSocket && socket.readyState === WebSocket.OPEN) {
      socket.send(statusMessage);
    }
  }

  console.log(`📡 Broadcasted ${status} status for ${userId}`);
}
