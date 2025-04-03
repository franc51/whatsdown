const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors()); // Allows requests from the frontend
app.use(express.json()); // Parses JSON data


app.get("/api/message", (req, res) => {
  res.json({ message: "Server is runnnig" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
