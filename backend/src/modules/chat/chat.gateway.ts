import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service.js';
import { UseGuards } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  // Map to store connected users: userId -> socketId
  private activeUsers = new Map<string, string>();

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.activeUsers.set(userId, client.id);
      this.server.emit('userOnline', userId);
    }
  }

  handleDisconnect(client: Socket) {
    let disconnectedUserId: string | null = null;
    this.activeUsers.forEach((socketId, userId) => {
      if (socketId === client.id) {
        disconnectedUserId = userId;
        this.activeUsers.delete(userId);
      }
    });
    if (disconnectedUserId) {
      this.server.emit('userOffline', disconnectedUserId);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: string; content: string }
  ) {
    const senderId = client.handshake.query.userId as string;
    if (!senderId || !payload.receiverId || !payload.content) return;

    try {
      const msg = await this.chatService.sendMessage(senderId, payload.receiverId, payload.content);
      
      // Send to receiver if online
      const receiverSocket = this.activeUsers.get(payload.receiverId);
      if (receiverSocket) {
        this.server.to(receiverSocket).emit('newMessage', msg);
      }
      
      // Also send back to sender so they can update UI instantly
      client.emit('messageSent', msg);
    } catch (e) {
      console.error('Socket send message error:', e);
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: string; isTyping: boolean }
  ) {
    const senderId = client.handshake.query.userId as string;
    if (!senderId || !payload.receiverId) return;

    const receiverSocket = this.activeUsers.get(payload.receiverId);
    if (receiverSocket) {
      this.server.to(receiverSocket).emit('userTyping', { userId: senderId, isTyping: payload.isTyping });
    }
  }

  @SubscribeMessage('readMessages')
  async handleReadMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: string; conversationId: string }
  ) {
    const senderId = client.handshake.query.userId as string;
    if (!senderId || !payload.receiverId || !payload.conversationId) return;

    await this.chatService.markAsRead(senderId, payload.conversationId);

    const receiverSocket = this.activeUsers.get(payload.receiverId);
    if (receiverSocket) {
      this.server.to(receiverSocket).emit('messagesRead', { 
        userId: senderId, 
        conversationId: payload.conversationId 
      });
    }
  }
}
