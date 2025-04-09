const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const wss = new WebSocket.Server({ port: 8081 });
console.log("✅ WebSocket server is listening on ws://localhost:8081");

const connectedUsers = {}; // { userId: socket }

wss.on("connection", (socket) => {
  console.log("New client connected");

  // When the client sends a message
  socket.on("message", (data) => {
    try {
      const parsed = JSON.parse(data);
      const { token, text, receiverId } = parsed;
      if (!token) return;

      // Decode the sender's ID from the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const senderId = decoded.userId;
      const senderNickname = decoded.nickname;

      // Save this socket under sender's ID
      connectedUsers[senderId] = socket;

      // Compose message
      const messageToSend = JSON.stringify({
        senderId,
        senderNickname: decoded.nickname,
        text,
      });

      // Send message to the receiver if connected
      const recipientSocket = connectedUsers[receiverId];
      if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
        recipientSocket.send(messageToSend);
      }
    } catch (err) {
      console.error("Error processing message:", err.message);
    }
  });

  // Handle disconnection
  socket.on("close", () => {
    // Optional: remove the user from `connectedUsers` when they disconnect
    for (const userId in connectedUsers) {
      if (connectedUsers[userId] === socket) {
        delete connectedUsers[userId];
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});
