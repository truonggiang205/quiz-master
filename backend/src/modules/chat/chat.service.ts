import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not } from 'typeorm';
import { ConversationEntity, MessageEntity } from '../../entities/chat.entity.js';
import { UserEntity } from '../../entities/user.entity.js';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly convRepo: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly msgRepo: Repository<MessageEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async getConversations(userId: string) {
    // Note: SQLite JSON querying is limited in simple-json, so we fetch all and filter in memory if needed.
    // Or we use Like('%userId%') which is hacky but works for UUIDs in simple-json arrays.
    const allConvs = await this.convRepo.find({
      order: { lastMessageAt: 'DESC' },
    });

    const userConvs = allConvs.filter(c => c.participants.includes(userId));

    // Map other participant data
    const result = [];
    for (const conv of userConvs) {
      const otherId = conv.participants.find(id => id !== userId);
      const otherUser = otherId ? await this.userRepo.findOneBy({ id: otherId }) : null;
      
      const lastMessage = await this.msgRepo.findOne({
        where: { conversationId: conv.id },
        order: { createdAt: 'DESC' },
      });

      const unreadCount = await this.msgRepo.count({
        where: { conversationId: conv.id, senderId: otherId, isRead: false },
      });

      result.push({
        ...conv,
        otherUser: otherUser ? { id: otherUser.id, name: otherUser.name, avatar: otherUser.avatar, role: otherUser.role } : null,
        lastMessage,
        unreadCount,
      });
    }

    return result;
  }

  async getMessages(userId: string, conversationId: string) {
    const conv = await this.convRepo.findOneBy({ id: conversationId });
    if (!conv || !conv.participants.includes(userId)) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }

    // Mark messages from other as read
    await this.msgRepo
      .createQueryBuilder()
      .update(MessageEntity)
      .set({ isRead: true })
      .where('conversationId = :cid', { cid: conversationId })
      .andWhere('senderId != :uid', { uid: userId })
      .execute();

    return await this.msgRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      relations: { sender: true },
    });
  }

  async sendMessage(senderId: string, receiverId: string, content: string) {
    if (senderId === receiverId) throw new Error('Cannot send message to yourself');

    // Find existing conversation
    let conv = null;
    const allConvs = await this.convRepo.find();
    for (const c of allConvs) {
      if (c.participants.includes(senderId) && c.participants.includes(receiverId)) {
        conv = c;
        break;
      }
    }

    if (!conv) {
      conv = this.convRepo.create({
        participants: [senderId, receiverId],
        lastMessageAt: new Date(),
      });
      conv = await this.convRepo.save(conv);
    } else {
      conv.lastMessageAt = new Date();
      await this.convRepo.save(conv);
    }

    const msg = this.msgRepo.create({
      conversationId: conv.id,
      senderId,
      content,
    });
    const savedMsg = await this.msgRepo.save(msg);
    
    // Load sender for return
    savedMsg.sender = await this.userRepo.findOneBy({ id: senderId }) as any;
    
    return savedMsg;
  }

  async searchUsers(query: string, excludeId: string) {
    if (!query) return [];
    return await this.userRepo.find({
      where: [
        { name: Like(`%${query}%`), id: Not(excludeId) },
        { email: Like(`%${query}%`), id: Not(excludeId) },
      ],
      take: 10,
      select: { id: true, name: true, email: true, avatar: true, role: true },
    });
  }
}
