const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const users = [];
const tokenBlacklist = [];

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const JWT_EXPIRES_IN = "1h";

exports.registerUser = async (req, res) => {
    const { username, email, password } = req.body;
    if (users.find(user => user.email === email)) {
        return res.status(400).json({ message: "User already exists" });
    }
    const hash = await bcrypt.hash(password, 10);
    users.push({ username, email, password: hash });
    res.json({ message: "User registered" });
}
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    const user = users.find((u) => u.email === email);
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token });
}
exports.logoutUser = (req, res) => {
    const { token } = req.body;
    tokenBlacklist.push(token);
    res.json({ message: "Logged out" });
}

exports.getUsers =() => users;

exports.getBlacklist =() => tokenBlacklist;