import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Search, Send, User, Mail, Bell } from 'lucide-react';
import io, { Socket } from 'socket.io-client';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { chatService, Conversation, Message, ChatUser } from '../../services/chat.service';

let socket: Socket | null = null;

export const FloatingChat: React.FC = () => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'CONTACTS' | 'CHAT'>('CONTACTS');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const latestSearchRef = useRef('');
  
  const { addToast } = useUiStore();
  const activeConvRef = useRef<Conversation | null>(null);
  const isOpenRef = useRef<boolean>(false);

  useEffect(() => {
    activeConvRef.current = activeConv;
    isOpenRef.current = isOpen;
  }, [activeConv, isOpen]);

  useEffect(() => {
    if (user && !socket) {
      // Initialize socket
      socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        query: { userId: user.id },
      });

      socket.on('newMessage', (msg: Message & { sender?: ChatUser }) => {
        setMessages(prev => {
          // If the message is for the currently open conversation, append it
          if (activeConvRef.current && activeConvRef.current.id === msg.conversationId) {
            return [...prev, msg];
          }
          return prev;
        });
        
        // Show notification if chat is not open or not in the active conversation
        if (!isOpenRef.current || (activeConvRef.current && activeConvRef.current.id !== msg.conversationId)) {
          addToast({
            type: 'info',
            title: `Tin nhắn mới từ ${msg.sender?.name || 'Ai đó'}`,
            message: msg.content,
          });
        }
        
        loadConversations(); // refresh unread count / last message
      });

      socket.on('messageSent', (msg: Message) => {
        setMessages(prev => [...prev, msg]);
        loadConversations();
      });
    }

    return () => {
      // Don't disconnect here if we want it global, but this component is root-level usually
    };
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
    }
  }, [activeConv]);

  const loadMessages = async (convId: string) => {
    try {
      const data = await chatService.getMessages(convId);
      setMessages(data);
      // clear unread count locally
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c));
      scrollToBottom();
    } catch (e) {
      console.error(e);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    const trimmed = q.trim();
    latestSearchRef.current = trimmed;

    if (trimmed.length > 2) {
      try {
        const results = await chatService.searchUsers(trimmed);
        if (latestSearchRef.current === trimmed) {
          setSearchResults(results);
        }
      } catch (e) {
        console.error('Search error:', e);
      }
    } else {
      setSearchResults([]);
    }
  };

  const startChatWith = (targetUser: ChatUser) => {
    // Check if conv exists
    const existing = conversations.find(c => c.otherUser?.id === targetUser.id);
    if (existing) {
      setActiveConv(existing);
    } else {
      // Fake a temp conversation to start chatting
      setActiveConv({
        id: 'temp',
        participants: [user!.id, targetUser.id],
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        otherUser: targetUser,
      });
      setMessages([]);
    }
    setActiveTab('CHAT');
    setSearchQuery('');
  };

  const handleSend = () => {
    if (!newMessage.trim() || !activeConv || !user) return;
    const receiverId = activeConv.otherUser?.id;
    if (!receiverId) return;

    socket?.emit('sendMessage', {
      receiverId,
      content: newMessage,
    });
    setNewMessage('');
    scrollToBottom();
  };

  const unreadTotal = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 md:w-[350px] h-[500px] bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border border-slate-100 flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
          
          {/* Header */}
          <div className="h-16 bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 flex items-center justify-between text-white shadow-md z-10">
            <div className="flex items-center gap-3">
              {activeTab === 'CHAT' && (
                <button onClick={() => { setActiveTab('CONTACTS'); setActiveConv(null); }} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
                  <User className="w-5 h-5" />
                </button>
              )}
              <div>
                <h3 className="font-bold">{activeTab === 'CHAT' ? activeConv?.otherUser?.name : 'Tin nhắn'}</h3>
                {activeTab === 'CHAT' && <p className="text-[10px] text-indigo-100 uppercase">{activeConv?.otherUser?.role}</p>}
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contacts Tab */}
          {activeTab === 'CONTACTS' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
              <div className="p-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên hoặc email..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                {searchQuery ? (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    {searchResults.length > 0 ? (
                      searchResults.map(u => (
                        <button key={u.id} onClick={() => startChatWith(u)} className="w-full flex items-center gap-3 p-3 mb-1 rounded-2xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all text-left group shadow-sm bg-white">
                          <img src={u.avatar} alt={u.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100 group-hover:ring-indigo-300 transition-all" />
                          <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-sm text-slate-800 truncate group-hover:text-indigo-700 transition-colors">{u.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                              <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                            </div>
                            <p className="text-[10px] uppercase font-bold text-indigo-500/70 mt-0.5">{u.role === 'TEACHER' ? 'Giáo viên' : 'Học sinh'}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-slate-400 text-sm">Không tìm thấy kết quả nào cho "{searchQuery}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  conversations.map(c => (
                    <button key={c.id} onClick={() => startChatWith(c.otherUser!)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all text-left group">
                      <div className="relative">
                        <img src={c.otherUser?.avatar} alt={c.otherUser?.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200" />
                        {c.unreadCount ? (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white text-[9px] font-bold text-white flex items-center justify-center">
                            {c.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <p className={`text-sm truncate ${c.unreadCount ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>{c.otherUser?.name}</p>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                            {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : ''}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${c.unreadCount ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                          {c.lastMessage?.senderId === user.id ? `Bạn: ${c.lastMessage?.content}` : c.lastMessage?.content || 'Chưa có tin nhắn'}
                        </p>
                      </div>
                    </button>
                  ))
                )}
                {!searchQuery && conversations.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    Bạn chưa có đoạn chat nào. <br/> Hãy tìm kiếm để bắt đầu!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'CHAT' && (
            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                {messages.map((m, idx) => {
                  const isMe = m.senderId === user.id;
                  return (
                    <div key={m.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        isMe 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-3 bg-white border-t border-slate-100">
                <div className="flex gap-2 items-end">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Nhắn tin..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors resize-none max-h-24 custom-scrollbar"
                    rows={1}
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 hover:bg-indigo-700 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-md shadow-indigo-200"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 hover:scale-110 active:scale-95 text-white rounded-full flex items-center justify-center shadow-[0_10px_20px_-5px_rgba(79,70,229,0.5)] transition-all relative group"
      >
        <MessageCircle className="w-6 h-6" />
        {!isOpen && unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full border-2 border-white text-[10px] font-bold text-white flex items-center justify-center animate-bounce">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>
    </div>
  );
};
