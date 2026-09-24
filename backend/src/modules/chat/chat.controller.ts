import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service.js';
import { createSuccessResponse } from '../../common/dto/api-response.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { UserEntity } from '../../entities/user.entity.js';

@ApiTags('Chat')
@Controller('chat')
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  async getConversations(@CurrentUser() user: UserEntity) {
    const data = await this.chatService.getConversations(user.id);
    return createSuccessResponse(data);
  }

  @Get('conversations/:id/messages')
  async getMessages(@CurrentUser() user: UserEntity, @Param('id') convId: string) {
    const data = await this.chatService.getMessages(user.id, convId);
    return createSuccessResponse(data);
  }

  @Get('search-users')
  async searchUsers(@CurrentUser() user: UserEntity, @Query('q') q: string) {
    const data = await this.chatService.searchUsers(q, user.id);
    return createSuccessResponse(data);
  }
}
