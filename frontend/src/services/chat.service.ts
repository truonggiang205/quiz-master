import { apiClient } from './api';

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessageAt: string;
  createdAt: string;
  otherUser?: ChatUser | null;
  lastMessage?: Message | null;
  unreadCount?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: ChatUser;
}

export const chatService = {
  async getConversations(): Promise<Conversation[]> {
    const res = await apiClient.get('/chat/conversations');
    return res.data?.data || [];
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const res = await apiClient.get(`/chat/conversations/${conversationId}/messages`);
    return res.data?.data || [];
  },

  async searchUsers(query: string): Promise<ChatUser[]> {
    const res = await apiClient.get(`/chat/search-users?q=${encodeURIComponent(query)}`);
    return res.data?.data || [];
  }
};
