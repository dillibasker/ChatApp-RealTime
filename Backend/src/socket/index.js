import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

export function createSocketServer(httpServer, corsOrigin) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true }
  });

  // Authenticate every socket
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        (socket.handshake.headers.authorization?.split(' ')[1]);

      if (!token) return next(new Error('No token'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: payload.id };
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);

    socket.on('conversation:join', async ({ conversationId }) => {
      socket.join(`convo:${conversationId}`);
    });

    socket.on('message:send', async ({ conversationId, text, attachments }) => {
      try {
        const convo = await Conversation.findById(conversationId);
        if (!convo) return socket.emit('error', { message: 'Conversation not found' });

        const isMember = convo.members.some(m => String(m) === String(userId));
        if (!isMember) return socket.emit('error', { message: 'Not a member' });

        const msg = await Message.create({
          conversation: conversationId,
          sender: userId,
          text,
          attachments: attachments || []
        });

        convo.lastMessageAt = new Date();
        await convo.save();

        io.to(`convo:${conversationId}`).emit('message:new', {
          _id: msg._id,
          conversation: conversationId,
          sender: userId,
          text,
          attachments: msg.attachments,
          createdAt: msg.createdAt
        });
      } catch (e) {
        console.error(e);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`convo:${conversationId}`).emit('typing', { userId, isTyping: true });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`convo:${conversationId}`).emit('typing', { userId, isTyping: false });
    });

    socket.on('disconnect', () => {
      // Presence hooks go here if needed
    });
  });

  return io;
}
