require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // To create a JWT token
const { MongoClient } = require("mongodb");
const cors = require("cors");

const { ObjectId } = require("mongodb");

const app = express();
const port = 3002;

// Middleware to parse JSON
app.use(express.json());

app.use(cors());

const client = new MongoClient(process.env.MONGO_URI, {
  useUnifiedTopology: true,
});

// Connect to MongoDB
let db;
client
  .connect()
  .then(() => {
    db = client.db("WhatsDown"); // Make sure the database name is consistent with the previous one
    console.log("Connected to MongoDB!");
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });

// Signup Route
app.post("/signup", async (req, res) => {
  const { nickname, phone, password } = req.body;

  if (!nickname || !phone || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await db.collection("users").findOne({ phone });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with that phone" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = {
      nickname,
      phone,
      password: hashedPassword,
      friends: [],
    };

    // Store user in MongoDB
    await db.collection("users").insertOne(newUser);

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("Error during signup:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login Route
app.post("/login", async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res
      .status(400)
      .json({ message: "Both phone and password are required" });
  }

  try {
    const user = await db.collection("users").findOne({ phone });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Compare password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, nickname: user.nickname, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // Token expires in 1 hour
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add Friend Route

app.post("/addFriend", async (req, res) => {
  const { friendPhoneNumber } = req.body;

  if (!friendPhoneNumber) {
    return res.status(400).json({ message: "Phone number is required" });
  }

  try {
    // Extract user information from the JWT token
    const token = req.headers.authorization?.split(" ")[1]; // Get token from the Authorization header
    if (!token) {
      return res.status(403).json({ message: "No token provided" });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = new ObjectId(decoded.userId);

    // Find the user from the token (use ObjectId for querying)
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the friend by phone number
    const friend = await db
      .collection("users")
      .findOne({ phone: friendPhoneNumber });
    if (!friend) {
      return res.status(404).json({ message: "Friend not found" });
    }

    // Check if the friend's ObjectId is already in the user's friends array
    const isFriendAlready = user.friends.some(
      (friendId) => friendId.toString() === friend._id.toString()
    );

    if (isFriendAlready) {
      return res.status(400).json({ message: "You are already friends" });
    }

    // Add friend to the user's friend list (store friend's ObjectId)
    await db.collection("users").updateOne(
      { _id: ObjectId(userId) },
      { $addToSet: { friends: friend._id } } // Using $addToSet to avoid duplicates
    );

    res.status(200).json({ message: "Friend added successfully" });
  } catch (err) {
    console.error("Error adding friend:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Friends Route
app.get("/getFriends", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Get token from the Authorization header
    if (!token) {
      return res.status(403).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = new ObjectId(decoded.userId);

    // Find the user based on the userId from the token
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch the friends list from the user's friends field (use ObjectId references)
    const friends = await db
      .collection("users")
      .find({
        _id: { $in: user.friends.map((friendId) => new ObjectId(friendId)) },
      })
      .toArray();

    res.status(200).json({ friends });
  } catch (err) {
    console.error("Error fetching friends:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`Auth server running at http://localhost:${port}`);
});
