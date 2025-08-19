import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, avatarUrl } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email, password is required' });
    }

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ message: 'User already exists' });

    const user = await User.create({ username, email, password, avatarUrl });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      user: { id: user._id, username: user.username, email: user.email, avatarUrl: user.avatarUrl },
      token
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    console.log("Request body:", req.body);
console.log("Email or Username:", emailOrUsername);

const user = await User.findOne({
  $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
}).select('+password');

console.log("User found:", user);

    if (!user) return res.status(401).json({ message: 'Invalid credentialhhhs' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      user: { id: user._id, username: user.username, email: user.email, avatarUrl: user.avatarUrl },
      token
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
