import React, { useEffect, useState, useRef } from 'react';
import { socket } from '../socket';
import api from '../api/axios';

export default function Chat({ conversationId, user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (!socket || !conversationId) return;
    
    socket.emit('join', conversationId);
    socket.on('message', (m) => setMessages((prev) => [...prev, m]));
    
    return () => {
      socket.off('message');
      socket.emit('leave', conversationId);
    };
  }, [conversationId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    // Load initial messages via REST
    if (!conversationId) return;
    api.get(`/api/chat/${conversationId}/messages`).then((res) => setMessages(res.data)).catch(() => {});
  }, [conversationId]);

  const send = async () => {
    if (!text || !conversationId || !socket) return;
    const payload = { conversationId, senderId: user?.id, body: text };
    socket.emit('sendMessage', payload);
    setText('');
  };

  if (!conversationId) return <div className="p-4">Select a conversation</div>;

  return (
    <div className="flex flex-col h-96 w-full border rounded bg-white text-black">
      <div className="flex-1 overflow-auto p-2" ref={listRef}>
        {messages.map((m) => (
          <div key={m.id} className={`mb-2 ${m.senderId === user?.id ? 'text-right' : 'text-left'}`}>
            <div className="inline-block px-3 py-2 rounded-lg bg-gray-100">{m.body}</div>
            <div className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <div className="p-2 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 p-2 border rounded" />
        <button onClick={send} className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
      </div>
    </div>
  );
}
