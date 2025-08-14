import { Router } from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Create (or get) a 1:1 conversation
router.post('/conversations', authMiddleware, async (req, res) => {
  try {
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ message: 'memberId required' });

    let convo = await Conversation.findOne({
      isGroup: false,
      members: { $all: [req.user.id, memberId], $size: 2 }
    });

    if (!convo) {
      convo = await Conversation.create({ members: [req.user.id, memberId], isGroup: false });
    }

    res.json(convo);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages (paginated)
router.get('/conversations/:id/messages', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 30 } = req.query;

    const convo = await Conversation.findById(id);
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });
    const isMember = convo.members.some(m => String(m) === String(req.user.id));
    if (!isMember) return res.status(403).json({ message: 'Not a member of this conversation' });

    const msgs = await Message.find({ conversation: id })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('sender', 'username avatarUrl');

    res.json({ items: msgs.reverse(), page: Number(page), limit: Number(limit) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Optional REST send (use sockets for realtime)
router.post('/messages', authMiddleware, async (req, res) => {
  try {
    const { conversationId, text, attachments } = req.body;
    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });

    const isMember = convo.members.some(m => String(m) === String(req.user.id));
    if (!isMember) return res.status(403).json({ message: 'Not a member of this conversation' });

    const msg = await Message.create({
      conversation: conversationId,
      sender: req.user.id,
      text,
      attachments: attachments || []
    });

    convo.lastMessageAt = new Date();
    await convo.save();

    res.status(201).json(msg);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
