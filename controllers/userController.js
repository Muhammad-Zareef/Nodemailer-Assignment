
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
require("dotenv").config();
const saltRounds = 10;

const createToken = (user) => {
    return jwt.sign({user}, process.env.JWTSECRETKEY, { expiresIn: "1d" });
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email });
        if (!user) return res.send({ status: 404, message: 'User not found' });
        bcrypt.compare(password, user.password, function (err, result) {
            if (result) {
                const token = createToken({ id: user._id, name: user.name, email: user.email });
                const thirtySeconds = 30 * 1000; // 30 seconds in milliseconds
                res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "lax", maxAge: thirtySeconds });
                return res.send({ status: 200, user, token, message: "Login successfully" });
            } else {
                return res.send({ status: 401, message: "Wrong password" });
            }
        });
    } catch (err) {
        res.send({ status: 404, message: 'User not found' });
    }
}

const signup = async (req, res) => {
    const { name, email, password } = req.body;
    bcrypt.genSalt(saltRounds, function (err, salt) {
        bcrypt.hash(password, salt, async function (err, hash) {
            if (err) return console.log(err);
            try {
                const newUser = new User({ name, email, password: hash });
                await newUser.save();
                res.status(200).send({ status: 200, newUser, message: "User has been created successfully" });
            } catch (err) {
                if (err.code === 11000) return res.status(200).send({ status: 400, success: false, message: "Email already exists. Please use another email" });
                res.status(500).json({ success: false, status: 500, message: "Internal Server Error" });
            }
        });
    });
}

const home = async (req, res) => {
    const { user } = req.user;
    try {
        res.send({
            status: 200,
            user,
            message: "Welcome User",
        });
    } catch (err) {
        res.send({
            err,
            status: 500,
            message: "Sorry! Server is not responding",
        });
    }
}

async function mailSending(req, res) {
    try {
        // Create a reusable transporter object using SMTP transport.
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: 587,
            secure: false, // use false for STARTTLS; true for SSL on port 465
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        }); 
        const { name, subject, email, message } = req.body; // Destructure and retrieve data from request body.
        // Validate required fields.
        if (!name || !subject || !email || !message) {
            return res.status(400).json({ status: "error", message: "Missing required fields" });
        }
        // Prepare the email message options.
        const mailOptions = {
            from: process.env.SENDER_EMAIL, // Sender address from environment variables.
            to: `${name} <${email}>`, // Recipient's name and email address.
            replyTo: process.env.REPLY_TO, // Sets the email address for recipient responses.
            subject: subject, // Subject line.
            text: message, // Plaintext body.
        };
        // Send email and log the response.
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.response);
        res.status(200).json({ status: "success", message: "Email sent successfully" });
    } catch (err) {
        res.send({
            status: 500,
            message: "user not authorized",
            err,
        });
    }
}

const logout = (req, res) => {
    res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "None" });
    res.json({ message: "Logged out successfully" });
}

module.exports = { login, signup, home, mailSending, logout };
