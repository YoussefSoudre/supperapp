import { Module } from '@nestjs/common';
import { TypeOrmModule }  from '@nestjs/typeorm';
import { BullModule }   from '@nestjs/bullmq';
import { JwtModule }      from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// ─── Entities ─────────────────────────────────────────────────────────────────
import { Notification }             from './domain/entities/notification.entity';
import { NotificationDeliveryLog }  from './domain/entities/notification-delivery-log.entity';
import { BroadcastNotification }    from './domain/entities/broadcast-notification.entity';
import { User }                     from '../users/domain/entities/user.entity';

// ─── Constants ────────────────────────────────────────────────────────────────
import { NOTIFICATION_QUEUES } from './domain/constants/notification.constants';

// ─── Services ────────────────────────────────────────────────────────────────
import { NotificationsService }          from './application/notifications.service';
import { NotificationQueueService }      from './application/notification-queue.service';
import { NotificationRateLimiterService } from './application/notification-rate-limiter.service';
import { BroadcastService }              from './application/broadcast.service';

// ─── Channel helpers + adapters ───────────────────────────────────────────────
import { NotificationDeliveryHelper } from './application/channels/notification-delivery.helper';
import { PushAdapter }   from './application/channels/adapters/push.adapter';
import { SmsAdapter }    from './application/channels/adapters/sms.adapter';
import { EmailAdapter }  from './application/channels/adapters/email.adapter';

// ─── Processors ───────────────────────────────────────────────────────────────
import { PushProcessor }      from './application/channels/push.processor';
import { SmsProcessor }       from './application/channels/sms.processor';
import { EmailProcessor }     from './application/channels/email.processor';
import { InAppProcessor }     from './application/channels/inapp.processor';
import { WebSocketProcessor } from './application/channels/websocket.processor';

// ─── Gateway ──────────────────────────────────────────────────────────────────
import { NotificationGateway }   from './infrastructure/websocket/notification.gateway';
import { NotificationsController } from './presentation/notifications.controller';

/**
 * NotificationsModule
 * ────────────────────
 * Architecture queue-based pour 2M+ utilisateurs :
 *  BullMQ × 5 canaux  →  5 processors  →  3 adapters + gateway
 *
 * Queues :
 *  - notification:push       (FCM)
 *  - notification:sms        (Twilio / Orange BF)
 *  - notification:email      (SMTP / SendGrid)
 *  - notification:inapp      (DB + WebSocket)
 *  - notification:websocket  (Socket.IO pur)
 */
@Module({
  imports: [
    // TypeORM — 4 entités : Notification, DeliveryLog, Broadcast, User (pour BroadcastService)
    TypeOrmModule.forFeature([
      Notification,
      NotificationDeliveryLog,
      BroadcastNotification,
      User,
    ]),

    // JWT — pour authentifier les connexions WebSocket
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),

    // BullMQ — connexion globale + enregistrement des 5 queues
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host:     config.get<string>('REDIS_HOST', 'localhost'),
          port:     config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail:     500,
        },
      }),
      inject: [ConfigService],
    }),

    BullModule.registerQueue(
      { name: NOTIFICATION_QUEUES.PUSH },
      { name: NOTIFICATION_QUEUES.SMS },
      { name: NOTIFICATION_QUEUES.EMAIL },
      { name: NOTIFICATION_QUEUES.INAPP },
      { name: NOTIFICATION_QUEUES.WEBSOCKET },
    ),
  ],

  controllers: [NotificationsController],

  providers: [
    // Services
    NotificationsService,
    NotificationQueueService,
    NotificationRateLimiterService,
    BroadcastService,

    // Channel infrastructure
    NotificationDeliveryHelper,
    PushAdapter,
    SmsAdapter,
    EmailAdapter,

    // BullMQ Processors
    PushProcessor,
    SmsProcessor,
    EmailProcessor,
    InAppProcessor,
    WebSocketProcessor,

    // WebSocket Gateway
    NotificationGateway,
  ],

  exports: [NotificationsService, NotificationQueueService, BroadcastService],
})
export class NotificationsModule {}

