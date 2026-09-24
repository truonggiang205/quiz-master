import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationEntity, MessageEntity } from '../../entities/chat.entity.js';
import { UserEntity } from '../../entities/user.entity.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { ChatGateway } from './chat.gateway.js';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationEntity, MessageEntity, UserEntity])],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
