const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const users = [];
const tokenBlacklist = [];

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const JWT_EXPIRES_IN = "1h";

exports.registerUser = async (req, res) => {
    console.log("Register body:", req.body);
    const { email, password } = req.body;
    if (users.find(user => user.email === email)) {
        return res.status(400).json({ message: "User already exists" });
    }
    const hash = await bcrypt.hash(password, 10);
    users.push({ email, password: hash });
    res.json({ message: "User registered" });
}
exports.loginUser = async (req, res) => {
    try {
        console.log("Login body:", req.body);

        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Find user
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Compare password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Generate token
        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // Send response
        return res.status(200).json({ token });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

exports.logoutUser = (req, res) => {
    const { token } = req.body;
    tokenBlacklist.push(token);
    res.json({ message: "Logged out" });
}

exports.getUsers =() => users;

exports.getBlacklist =() => tokenBlacklist;