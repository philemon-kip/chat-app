const express = require("express");
const connectDB = require("./config/db"); // MongoDB connection
const dotenv = require("dotenv");
const cors = require("cors");
const colors = require("colors");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");

dotenv.config(); // Load environment variables from .env file

connectDB(); // Connect to MongoDB

const app = express();

app.use(cors()); // Enable CORS

// Middleware to parse JSON bodies (if needed for POST/PUT requests)
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Root route


app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes );
app.use("/api/message", messageRoutes)

// -----------------DEPLOYMENT-----------------
const __dirname1 = path.resolve();
if(process.env.NODE_ENV === 'production'){
  app.use(express.static(path.join(__dirname1, '/frontend/build')));
  app.get('*', (req, res) => res.sendFile(path.resolve(__dirname1, 'frontend', 'build', 'index.html')));
}else{
  app.get("/", (req, res) => {
  res.send("API is running successfully");
});
}

// -----------------DEPLOYMENT-----------------

app.use(notFound)
app.use(errorHandler)

// Listen on the specified port
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`.yellow.bold);
});

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
  },
});

io.on("connection", (socket) => {
  console.log("connected to socket.io");

  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log(" user joined a room: " + room);
    
  });

  socket.on('typing', (room) => {
    socket.in(room).emit('typing');
  });
  socket.on('stop typing', (room) => {
    socket.in(room).emit('stop typing');
  });

  socket.on("new message", (newMessageReceived) => {
    var chat = newMessageReceived.chat;

    if (!chat.users) return console.log("chat.users not defined");
    
    chat.users.forEach((user) => {
      if (user._id == newMessageReceived.sender._id) return;
      socket.in(user._id).emit("message received", newMessageReceived)
    });
  });
  socket.off("setup",() => {
    console.log("user disconnected");
    socket.leave(userData._id);
  });
});
