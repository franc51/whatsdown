const WebSocket = require("ws");
const server = new WebSocket.Server({
  port: 8080,
  clientTracking: true,
  handleProtocols: (protocols) => protocols[0], // Optional: handling protocols
});

server.on("connection", (socket) => {
  console.log("Client connected");

  // Handle messages from the client
  socket.on("message", (message) => {
    console.log("Received:", message);
    // Send to all connected clients
    server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  // Handle connection closing
  socket.on("close", () => {
    console.log("Client disconnected");
  });
});

console.log("WebSocket server is running at ws://localhost:8081");
