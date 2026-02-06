
const express = require('express');
const router = express.Router();
const { login, signup, logout, home, mailSending } = require('../controllers/userController');
const verifyToken = require('../middlewares/verifyToken');

router.post('/login', login);
router.post('/signup', signup);
router.post('/logout', logout);
router.post("/send-email", mailSending);
router.get('/home', verifyToken, home);

module.exports = router;
