const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User"); 
const registerSchema = require("../validations/authValidate").registerSchema;

const tokenBlacklist = [];

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const JWT_EXPIRES_IN = "1h";

exports.registerUser = async (req, res) => {
    const validation = registerSchema.safeParse({ body: req.body });
    if (!validation.success) {
        return res.status(400).json({ message: "Invalid input", errors: validation.error.errors });
    }
    try {
        console.log("Register body:", req.body);
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hash = await bcrypt.hash(password, 10);

        const newUser = new User({ email, password: hash });
        await newUser.save();

        return res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        console.error("Register error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

exports.loginUser = async (req, res) => {
    const validation = registerSchema.safeParse({ body: req.body });
    if (!validation.success) {
        return res.status(400).json({ message: "Invalid input", errors: validation.error.errors });
    }
    try {
        console.log("Login body:", req.body);
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        return res.status(200).json({ token });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.logoutUser = (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ message: "Token required for logout" });
    }
    tokenBlacklist.push(token);
    res.json({ message: "Logged out successfully" });
};
exports.getBlacklist = () => tokenBlacklist;
