import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema(
  {
    name: { type: String }, // for group chats
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    isGroup: { type: Boolean, default: false },
    lastMessageAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model('Conversation', ConversationSchema);
