const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Root
app.get("/", (req, res) => {
  res.send("Collab Canvas server is running!");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
