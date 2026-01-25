// controllers/chatController.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getThreads = async (req, res) => {
  const threads = await prisma.conversation.findMany({
    where: { members: { some: { userId: req.user.id } } },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 }, members: { include: { user: true } } },
  });
  res.json(threads);
};

export const getMessages = async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { conversationId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  res.json(messages);
};

export const startConversation = async (req, res) => {
  const { otherUserId } = req.body;
  let convo = await prisma.conversation.findFirst({
    where: { members: { every: { userId: { in: [req.user.id, otherUserId] } } } },
  });
  if (!convo) {
    convo = await prisma.conversation.create({
      data: { members: { create: [{ userId: req.user.id }, { userId: otherUserId }] } },
    });
  }
  res.json(convo);
};

export const sendMessage = async (req, res) => {
  const message = await prisma.message.create({
    data: { conversationId: req.params.id, senderId: req.user.id, body: req.body.body },
  });
  res.status(201).json(message);
};
