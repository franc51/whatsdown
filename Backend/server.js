const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const wss = new WebSocket.Server({ port: 8081 });
console.log("✅ WebSocket server is listening on ws://localhost:8081");

const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.MONGO_URI, {});

let db;
client.connect().then(() => {
  db = client.db("WhatsDown");
  console.log("✅ WebSocket server connected to MongoDB");
});

const connectedUsers = {}; // { userId: socket }

wss.on("connection", (socket) => {
  console.log("New client connected");

  // When the client sends a message
  socket.on("message", (data) => {
    try {
      const parsed = JSON.parse(data);

      // Handle initial registration
      if (parsed.type === "register" && parsed.token) {
        const decoded = jwt.verify(parsed.token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        connectedUsers[userId] = socket;
        console.log(`✅ Registered user ${userId}`);
        // Notify other users that the user is online
        broadcastUserStatus(userId, "online");
        return;
      }

      // 🔥 Handle typing event
      if (parsed.type === "typing" && parsed.to) {
        const sender = Object.keys(connectedUsers).find(
          (id) => connectedUsers[id] === socket
        );

        const typingPayload = JSON.stringify({
          type: "typing",
          senderId: sender,
        });

        const recipientSocket = connectedUsers[parsed.to];
        if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
          recipientSocket.send(typingPayload);
          console.log(`✍️ Sent typing event from ${sender} to ${parsed.to}`);
        }

        return;
      }

      const { token, text, receiverId } = parsed;
      if (!token) return;

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const senderId = decoded.userId;
      const senderNickname = decoded.nickname;

      connectedUsers[senderId] = socket;

      const messageToSend = JSON.stringify({
        senderId,
        senderNickname,
        text,
        createdAt: new Date(),
      });

      // Store message in MongoDB
      db.collection("messages").insertOne({
        senderId,
        receiverId,
        senderNickname,
        text,
        createdAt: new Date(),
      });

      // Update sender's friend entry
      db.collection("users").updateOne(
        {
          _id: new ObjectId(senderId),
          "friends._id": new ObjectId(receiverId),
        },
        {
          $set: {
            "friends.$.lastMessage": text,
            "friends.$.lastMessageTime": createdAt,
          },
        }
      );

      // Update receiver's friend entry
      db.collection("users").updateOne(
        {
          _id: new ObjectId(receiverId),
          "friends._id": new ObjectId(senderId),
        },
        {
          $set: {
            "friends.$.lastMessage": text,
            "friends.$.lastMessageTime": createdAt,
          },
        }
      );

      console.log("➡️ Sending to recipient:", messageToSend);

      const recipientSocket = connectedUsers[receiverId];
      if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
        recipientSocket.send(messageToSend);
      } else {
        console.log(`⚠️ User ${receiverId} not connected`);
      }
      // Also send the message back to the sender
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(messageToSend);
      }
    } catch (err) {
      console.error("Error processing message:", err.message);
    }
  });

  // Handle disconnection
  socket.on("close", () => {
    for (const userId in connectedUsers) {
      if (connectedUsers[userId] === socket) {
        delete connectedUsers[userId];
        console.log(`User ${userId} disconnected`);
        // Notify others that the user is offline
        broadcastUserStatus(userId, "offline");
        break;
      }
    }
  });
});

function broadcastUserStatus(userId, status) {
  // Broadcast the status update to all other connected clients
  for (const otherUserId in connectedUsers) {
    if (otherUserId !== userId) {
      const socket = connectedUsers[otherUserId];
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "status",
            userId: userId,
            status: status,
          })
        );
      }
    }
  }
}
