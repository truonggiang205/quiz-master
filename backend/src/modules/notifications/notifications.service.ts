import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationEntity,
  NotificationType,
  NotificationTargetRole,
} from '../../entities/notification.entity.js';
import { UserEntity } from '../../entities/user.entity.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async getUserNotifications(userId: string, role: string) {
    const notifications = await this.notificationRepo.find({
      order: { createdAt: 'DESC' },
    });

    const userRoleEnum = role === 'TEACHER' ? NotificationTargetRole.TEACHER : NotificationTargetRole.STUDENT;

    // Filter relevant notifications
    const relevant = notifications.filter(n => {
      if (n.type === NotificationType.PERSONAL && n.recipientId === userId) {
        return true;
      }
      if (n.type === NotificationType.GENERAL && (n.targetRole === NotificationTargetRole.ALL || n.targetRole === userRoleEnum)) {
        return true;
      }
      return false;
    });

    // Map to add `isRead` flag for this specific user
    return relevant.map(n => {
      // Safely parse readBy array (fallback for DB issues)
      let readByArray: string[] = [];
      try {
        readByArray = typeof n.readBy === 'string' ? JSON.parse(n.readBy) : (n.readBy || []);
      } catch (e) {
        readByArray = [];
      }

      return {
        ...n,
        isRead: readByArray.includes(userId),
      };
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.notificationRepo.findOneBy({ id: notificationId });
    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }

    let readByArray: string[] = [];
    try {
      readByArray = typeof notification.readBy === 'string' ? JSON.parse(notification.readBy) : (notification.readBy || []);
    } catch (e) {
      readByArray = [];
    }

    if (!readByArray.includes(userId)) {
      readByArray.push(userId);
      notification.readBy = readByArray;
      await this.notificationRepo.save(notification);
    }

    return { success: true };
  }

  async markAllAsRead(userId: string, role: string) {
    const notifications = await this.getUserNotifications(userId, role);
    const unread = notifications.filter(n => !n.isRead);

    for (const n of unread) {
      const entity = await this.notificationRepo.findOneBy({ id: n.id });
      if (entity) {
        let readByArray: string[] = [];
        try {
          readByArray = typeof entity.readBy === 'string' ? JSON.parse(entity.readBy) : (entity.readBy || []);
        } catch (e) {
          readByArray = [];
        }
        if (!readByArray.includes(userId)) {
          readByArray.push(userId);
          entity.readBy = readByArray;
          await this.notificationRepo.save(entity);
        }
      }
    }
    return { success: true };
  }

  // --- Helpers to create notifications ---

  async broadcastGeneralNotification(title: string, message: string, targetRole: NotificationTargetRole) {
    const notif = this.notificationRepo.create({
      title,
      message,
      type: NotificationType.GENERAL,
      targetRole,
      readBy: [],
    });
    return await this.notificationRepo.save(notif);
  }

  async createPersonalNotification(recipientId: string, title: string, message: string) {
    const notif = this.notificationRepo.create({
      title,
      message,
      type: NotificationType.PERSONAL,
      targetRole: NotificationTargetRole.NONE,
      recipientId,
      readBy: [],
    });
    return await this.notificationRepo.save(notif);
  }
}
