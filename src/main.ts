import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { VersioningType, ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import * as express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // ─── Trust proxy (IP réelle derrière nginx / load-balancer) ──────────────
  app.set('trust proxy', 1);

  // ─── Helmet — en-têtes de sécurité HTTP ──────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc:  ["'self'"],
          scriptSrc:   ["'self'"],
          styleSrc:    ["'self'", "'unsafe-inline'"],   // Swagger UI inline styles
          imgSrc:      ["'self'", 'data:', 'https:'],
          connectSrc:  ["'self'"],
          fontSrc:     ["'self'", 'https:'],
          objectSrc:   ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge:            31536000,  // 1 an
        includeSubDomains: true,
        preload:           true,
      },
      referrerPolicy:         { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false,  // nécessaire pour Swagger UI
    }),
  );

  // ─── Limite de taille des corps de requête ────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // ─── Supprimer l'en-tête x-powered-by ────────────────────────────────────
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // ─── Versioning (/api/v1/...) ─────────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('api');

  // ─── Validation globale ───────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Supprimer les champs non déclarés dans le DTO
      forbidNonWhitelisted: true,
      transform: true,       // Transformer automatiquement les types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Fichiers statiques (médias uploadés) ─────────────────────────────────
  // /static/announcements/:filename → uploads/announcements/:filename
  // En production, remplacer par un CDN (S3 + CloudFront).
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/static',
  });

  // ─── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3001'],
    credentials: true,
  });

  // ─── Swagger ─────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SuperApp BF API')
      .setDescription(
        `## Super Application Burkina Faso 🇧🇫
API REST versionnée (URI versioning — préfixe \`/api/v1/\`).

### Modules disponibles
| Module | Description |
|--------|-------------|
| **Auth** | Inscription, connexion, OTP SMS, refresh token, déconnexion |
| **Users** | Profil utilisateur, liste admin filtrée |
| **Drivers** | Profil chauffeur, gestion disponibilité (online/offline) |
| **Rides** | Courses VTC — création, acceptation, suivi, annulation, notation |
| **Delivery** | Livraison de colis — création et suivi avec filtres avancés |
| **Food** | Commandes de repas — restaurants, menu, commandes |
| **Wallet** | Wallet interne XOF — solde, transactions crédit/débit |
| **Payments** | Paiements mobile money (Orange, Moov, Coris) |
| **Pricing** | Calcul dynamique et configuration des tarifs par ville |
| **Referral** | Programme de parrainage — génération, rewards |
| **Notifications** | Push, SMS, In-App — envoi, broadcast, statistiques |
| **Cities** | Gestion des villes couvertes |
| **Admin** | RBAC — rôles, permissions, assignation |
| **Analytics** | KPIs, rapports de revenus, activité drivers |

### Authentification
Toutes les routes protégées nécessitent un **Bearer JWT** dans le header \`Authorization\`.
\`\`\`
Authorization: Bearer <access_token>
\`\`\`
L'access_token est valable **15 minutes**. Utilisez \`POST /auth/refresh\` pour en obtenir un nouveau.

### Codes de réponse communs
| Code | Signification |
|------|---------------|
| 200 | Succès avec body |
| 201 | Ressource créée |
| 204 | Succès sans body |
| 400 | Données invalides |
| 401 | Non authentifié |
| 403 | Accès refusé |
| 404 | Ressource introuvable |
| 422 | Erreur de validation |
| 429 | Trop de requêtes |

> **Devise** : XOF (Franc CFA). Tous les montants sont exprimés en **centimes** (ex: 50000 centimes = 500 FCFA).
      `,
      )
      .setVersion('1.0')
      .setContact('SuperApp BF Team', 'https://superapp.bf', 'dev@superapp.bf')
      .setLicense('Propriétaire', '')
      .addServer('http://localhost:3000', 'Développement local')
      .addServer('https://api.superapp.bf', 'Production')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Entrez votre access_token JWT (sans le préfixe "Bearer ")',
          in: 'header',
        },
        'access-token',
      )
      .addTag('Auth', 'Inscription, connexion, OTP SMS, gestion des tokens')
      .addTag('Users', 'Profil utilisateur et liste admin')
      .addTag('Drivers', 'Profil chauffeur et gestion de disponibilité')
      .addTag('Rides', 'Courses VTC — cycle de vie complet')
      .addTag('Delivery', 'Livraison de colis')
      .addTag('Food', 'Commandes de repas et gestion des restaurants')
      .addTag('Wallet', 'Wallet interne XOF — solde et historique')
      .addTag('Payments', 'Paiement mobile money et confirmation')
      .addTag('Pricing', 'Tarification dynamique par ville et service')
      .addTag('Referral', 'Programme de parrainage')
      .addTag('Notifications', 'Push, SMS, In-App — envoi et statistiques')
      .addTag('Cities', 'Villes couvertes par la plateforme')
      .addTag('Admin', 'RBAC — rôles, permissions et assignations')
      .addTag('Analytics', 'KPIs, revenus et métriques opérationnelles')
      .addTag('Announcements', 'Annonces système — admin vers utilisateurs/villes')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
        tryItOutEnabled: true,
      },
      customSiteTitle: 'SuperApp BF — API Docs',
      customCss: `
        .swagger-ui .topbar { background-color: #1a1a2e; }
        .swagger-ui .topbar .link { display: none; }
        .swagger-ui .info .title { color: #16213e; }
      `,
    });
    logger.log('Swagger docs available at /docs');
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`🚀 SuperApp BF API running on: http://localhost:${port}/api`);
  logger.log(`📖 Swagger docs: http://localhost:${port}/docs`);
}

void bootstrap();
