const express = require("express");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 3000;

const users = []; 
const tokenBlacklist=[];

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const JWT_EXPIRES_IN = "1h";

app.post("/signup",async (req, res) => {
    const { email, password } = req.body;
    if (users.find(user => user.email === email)) {
        return res.status(400).json({ message: "User already exists" });}
        const hash = await bcrypt.hash(password, 10);
  users.push({ email, password: hash });
  res.json({ message: "User registered" });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({ token });
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "No token" });

  const token = auth.split(" ")[1];
  if (tokenBlacklist.includes(token)) {
    return res.status(403).json({ message: "Logged out" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(403).json({ message: "Invalid token" });
  }
}


app.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.post("/logout", (req, res) => {
  const { token } = req.body;
  tokenBlacklist.push(token);
  res.json({ message: "Logged out" });
});

app.get("/", (req, res) => {
    res.send("Collab Canvas server is running!");
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
