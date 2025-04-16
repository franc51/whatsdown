require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // To create a JWT token
const { MongoClient } = require("mongodb");
const cors = require("cors");

const { ObjectId } = require("mongodb");

const app = express();
const port = 3002;

const multer = require("multer");
const path = require("path");

// Middleware to parse JSON
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const allowedOrigins = [
  "http://localhost:3000",
  "https://whatsdown-wngp.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,POST",
    credentials: true,
  })
);

const client = new MongoClient(process.env.MONGO_URI, {
  ssl: true,
  tlsAllowInvalidCertificates: true, // Disable certificate validation
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
      process.env.JWT_SECRET
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
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(403).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = new ObjectId(decoded.userId);

    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const friend = await db
      .collection("users")
      .findOne({ phone: friendPhoneNumber });
    if (!friend) {
      return res.status(404).json({ message: "Friend not found" });
    }

    const isFriendAlready = user.friends?.some(
      (f) => f._id.toString() === friend._id.toString()
    );

    if (isFriendAlready) {
      return res.status(400).json({ message: "You are already friends" });
    }

    // Construct friend objects
    const friendInfo = {
      _id: friend._id,
      nickname: friend.nickname,
      lastMessage: "",
      lastMessageTime: null,
    };

    const userInfo = {
      _id: user._id,
      nickname: user.nickname,
      lastMessage: "",
      lastMessageTime: null,
    };

    // Add friend to user
    await db
      .collection("users")
      .updateOne({ _id: user._id }, { $addToSet: { friends: friendInfo } });

    // Add user to friend
    await db
      .collection("users")
      .updateOne({ _id: friend._id }, { $addToSet: { friends: userInfo } });

    res.status(200).json({ message: "Friend added successfully" });
  } catch (err) {
    console.error("Error adding friend:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/sendMessage", async (req, res) => {
  const { senderId, receiverId, message } = req.body;

  // Validate the inputs
  if (!senderId || !receiverId || !message || typeof message !== "string") {
    return res.status(400).json({ message: "Invalid input data" });
  }

  try {
    const createdAt = new Date();

    // Insert the message into the collection
    const messageDocument = await db.collection("messages").insertOne({
      senderId,
      receiverId,
      message,
      createdAt,
    });

    // If message insertion fails, return an error
    if (!messageDocument.insertedId) {
      return res.status(500).json({ message: "Failed to insert message" });
    }

    // Update sender's friend entry with the latest message
    const senderUpdateResult = await db.collection("users").updateOne(
      { _id: new ObjectId(senderId), "friends._id": new ObjectId(receiverId) },
      {
        $set: {
          "friends.$.lastMessage": message,
          "friends.$.lastMessageTime": createdAt,
        },
      }
    );

    // If the sender update fails, return an error
    if (senderUpdateResult.matchedCount === 0) {
      return res
        .status(500)
        .json({ message: "Failed to update sender's last message" });
    }

    // Update receiver's friend entry with the latest message
    const receiverUpdateResult = await db.collection("users").updateOne(
      { _id: new ObjectId(receiverId), "friends._id": new ObjectId(senderId) },
      {
        $set: {
          "friends.$.lastMessage": message,
          "friends.$.lastMessageTime": createdAt,
        },
      }
    );

    // If the receiver update fails, return an error
    if (receiverUpdateResult.matchedCount === 0) {
      return res
        .status(500)
        .json({ message: "Failed to update receiver's last message" });
    }

    // Return a response with message details
    res.status(200).json({
      message: "Message sent successfully",
      data: {
        senderId,
        receiverId,
        message,
        createdAt,
      },
    });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ message: "Server error" });
  }
});
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

    // Fetch friends from the user's friends field and include lastMessage and lastMessageTime
    const friendsWithLastMessage = user.friends.map((friend) => ({
      _id: friend._id,
      nickname: friend.nickname,
      lastMessage: friend.lastMessage || "No messages yet", // If lastMessage is missing, show default text
      lastMessageTime: friend.lastMessageTime || null, // If lastMessageTime is missing, show null
    }));

    res.status(200).json({ friends: friendsWithLastMessage });
  } catch (err) {
    console.error("Error fetching friends:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get User's Info Route
app.get("/getUserInfo", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Get token from the Authorization header
    if (!token) {
      return res.status(403).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = new ObjectId(decoded.userId);

    const user = await db.collection("users").findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error("Error fetching user info:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/messages/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;
  const skip = parseInt(req.query.skip) || 0;
  const limit = parseInt(req.query.limit) || 50;
  const before = req.query.before ? new Date(req.query.before) : null;

  try {
    const query = {
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 },
      ],
    };

    if (before) {
      query.createdAt = { $lt: before };
    }

    const messages = await db
      .collection("messages")
      .find(query)
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit)
      .toArray();

    res.status(200).json(messages.reverse()); // Send oldest → newest
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// Configure multer storage to store images in the "uploads" folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Save uploaded files in "uploads" folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Use the current timestamp as the file name
  },
});

// Initialize multer with the configured storage
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/; // Allow only image files
    const extname = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = fileTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Middleware to handle multer errors
function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred during the upload
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File size exceeds 5MB limit." });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    // Unknown error occurred
    return res.status(500).json({ message: "Server error" });
  }
  next();
}

// Profile picture upload route
app.post("/uploadProfilePicture", upload.single("profilePicture"), async (req, res) => {
  try {
    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    // Extract token from Authorization header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(403).json({ message: "No token provided" });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = new ObjectId(decoded.userId);

    // Get the uploaded file path
    const filePath = `/uploads/${req.file.filename}`;

    // Update the user's profile picture URL in the database
    const updateResult = await db
      .collection("users")
      .updateOne({ _id: userId }, { $set: { profilePicture: filePath } });

    if (updateResult.modifiedCount === 0) {
      return res.status(500).json({ message: "Failed to update profile picture in database." });
    }

    // Success: Send the URL of the uploaded file
    res.status(200).json({
      message: "Profile picture uploaded successfully!",
      url: filePath,
    });
  } catch (err) {
    console.error("Error uploading profile picture:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


app.listen(port, () => {
  console.log(`Auth server running at http://localhost:${port}`);
});
