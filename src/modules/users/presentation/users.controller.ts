import {
  Controller, Get, Patch, Post, Body, Request, ParseUUIDPipe, Param,
  Query, HttpCode, HttpStatus, UseInterceptors, UploadedFile, UploadedFiles,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiOkResponse, ApiNotFoundResponse, ApiUnauthorizedResponse, ApiBadRequestResponse,
  ApiCreatedResponse, ApiConflictResponse, ApiParam, ApiQuery,
  ApiConsumes, ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../application/users.service';
import { KycStorageService } from '../application/kyc-storage.service';
import { RbacService } from '../../admin/application/rbac.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserFilterDto } from './dto/user-filter.dto';
import { KycFilterDto } from './dto/kyc-filter.dto';
import { SubmitUserKycDto } from './dto/submit-kyc.dto';
import { ReviewUserKycDto } from './dto/review-kyc.dto';
import { UserKycStatus } from '../domain/entities/user-kyc.entity';
import { UserPublicDto, NotFoundDto, UnauthorizedDto, ValidationErrorDto } from '../../../shared/dto/swagger-responses.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly kycStorage: KycStorageService,
    private readonly rbacService: RbacService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Mon profil utilisateur', description: 'Retourne le profil complet de l\'utilisateur connecté.' })
  @ApiOkResponse({ type: UserPublicDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  getMe(@Request() req: { user: { id: string } }) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Mettre à jour mon profil',
    description: 'Champs modifiables : `firstName`, `lastName`, `email`, `avatarUrl`.',
  })
  @ApiOkResponse({ type: UserPublicDto })
  @ApiBadRequestResponse({ type: ValidationErrorDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  updateMe(
    @Request() req: { user: { id: string } },
    @Body() data: Partial<{ firstName: string; lastName: string; email: string; avatarUrl: string }>,
  ) {
    return this.usersService.update(req.user.id, data);
  }

  @Patch('me/fcm-token')
  @ApiOperation({
    summary: 'Enregistrer / mettre à jour le token FCM',
    description: 'Utilisé par le client mobile pour recevoir les notifications push via Firebase Cloud Messaging.',
  })
  @ApiOkResponse({ schema: { example: { updated: true } } })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  updateFcmToken(
    @Request() req: { user: { id: string } },
    @Body('fcmToken') fcmToken: string,
  ) {
    return this.usersService.updateFcmToken(req.user.id, fcmToken);
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  @Get()
  @Roles('super_admin', 'city_admin')
  @ApiOperation({
    summary: '[Admin] Liste paginée et filtrée des utilisateurs',
    description:
      '**Filtres standards** : `page`, `limit`, `sortBy` (createdAt|firstName|lastName), `sortOrder`, ' +
      '`dateFrom`, `dateTo`, `search` (prénom/nom/email/téléphone)\n\n' +
      '**Filtres avancés** : `status` (active|inactive|suspended|pending_kyc), `cityId`, ' +
      '`phoneVerified`, `kycVerified`\n\n' +
      'Un `city_admin` ne voit que les utilisateurs de ses villes.',
  })
  @ApiOkResponse({ description: 'Liste paginée d\'utilisateurs', schema: { example: { data: [], total: 1200, page: 1, limit: 20, totalPages: 60 } } })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  async findAll(
    @Query() filters: UserFilterDto,
    @Request() req: { user: { id: string } },
  ) {
    const perms = await this.rbacService.getEffectivePermissions(req.user.id);
    const scopedCityIds = perms.hasGlobalRole ? null : perms.cityScopedRoleIds;
    return this.usersService.findAll(filters, scopedCityIds);
  }

  @Get(':id')
  @Roles('super_admin', 'city_admin')
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiOperation({ summary: '[Admin] Détail d\'un utilisateur par ID' })
  @ApiOkResponse({ type: UserPublicDto })
  @ApiNotFoundResponse({ type: NotFoundDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  // ─── KYC Client ─────────────────────────────────────────────────────────

  // ─── KYC Upload ──────────────────────────────────────────────────────────

  @Post('me/kyc/upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'tmp'),
        filename: (_req, file, cb) =>
          cb(null, `${uuidv4()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
      fileFilter: (_req, file, cb) => {
        const allowed = /^(image\/(jpeg|png|webp)|application\/pdf)$/;
        if (!allowed.test(file.mimetype)) {
          return cb(
            new Error(`Type non accepté: ${file.mimetype}. Acceptés: JPEG, PNG, WebP, PDF.`),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Uploader un document KYC individuel (optionnel)',
    description:
      'Upload un seul fichier (JPEG, PNG, WebP ou PDF — max 10 Mo) et retourne son URL publique.\n\n' +
      'Utiliser cet endpoint si vous souhaitez envoyer les documents un par un. ' +
      'Pour soumettre tous les documents en une seule requête, utilisez `POST /users/me/kyc`.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image JPEG / PNG / WebP ou PDF — max 10 Mo',
        },
      },
    },
  })
  @ApiCreatedResponse({
    schema: {
      example: {
        url:          'http://localhost:3000/static/kyc/a1b2c3.jpg',
        originalName: 'cni_recto.jpg',
        sizeBytes:    204800,
        mimeType:     'image/jpeg',
      },
    },
  })
  @ApiBadRequestResponse({ type: ValidationErrorDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  uploadKycDocument(@UploadedFile() file: Express.Multer.File) {
    return this.kycStorage.save(file);
  }

  @Post('me/kyc')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'idCardFront', maxCount: 1 },
        { name: 'selfie',      maxCount: 1 },
        { name: 'idCardBack',  maxCount: 1 },
        { name: 'addressProof', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: join(process.cwd(), 'uploads', 'tmp'),
          filename: (_req, file, cb) =>
            cb(null, `${uuidv4()}${extname(file.originalname).toLowerCase()}`),
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
          const allowed = /^(image\/(jpeg|png|webp)|application\/pdf)$/;
          if (!allowed.test(file.mimetype)) {
            return cb(
              new Error(`Type non accepté: ${file.mimetype}. Acceptés: JPEG, PNG, WebP, PDF.`),
              false,
            );
          }
          cb(null, true);
        },
      },
    ),
  )
  @ApiOperation({
    summary: 'Soumettre mon dossier KYC (tous les documents en une requête)',
    description:
      'Permet au client de soumettre ses documents KYC en une seule requête `multipart/form-data`.\n\n' +
      '**Champs de fichiers requis** :\n' +
      '- `idCardFront` — Recto de la CNI ou passeport (JPEG / PNG / WebP / PDF)\n' +
      '- `selfie` — Selfie tenant la pièce d\'identité\n\n' +
      '**Champs de fichiers optionnels** :\n' +
      '- `idCardBack` — Verso de la CNI\n' +
      '- `addressProof` — Justificatif de domicile\n\n' +
      'Taille max par fichier : **10 Mo**.\n\n' +
      'Si un dossier **rejeté** existe, il sera réinitialisé en `pending`. ' +
      'Un dossier déjà **approuvé** ne peut pas être re-soumis.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['idCardFront', 'selfie'],
      properties: {
        idCardFront:  { type: 'string', format: 'binary', description: 'Recto CNI / passeport (obligatoire)' },
        selfie:       { type: 'string', format: 'binary', description: 'Selfie tenant la pièce (obligatoire)' },
        idCardBack:   { type: 'string', format: 'binary', description: 'Verso CNI (optionnel)' },
        addressProof: { type: 'string', format: 'binary', description: 'Justificatif de domicile (optionnel)' },
      },
    },
  })
  @ApiCreatedResponse({ schema: { example: { id: 'uuid', userId: 'uuid', status: 'pending', submittedAt: '2026-03-06T10:00:00Z' } } })
  @ApiConflictResponse({ description: 'KYC déjà approuvé' })
  @ApiBadRequestResponse({ type: ValidationErrorDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  async submitKyc(
    @Request() req: { user: { id: string } },
    @UploadedFiles() files: {
      idCardFront?:  Express.Multer.File[];
      selfie?:       Express.Multer.File[];
      idCardBack?:   Express.Multer.File[];
      addressProof?: Express.Multer.File[];
    },
  ) {
    if (!files?.idCardFront?.[0]) {
      throw new BadRequestException('Le champ `idCardFront` (recto de la pièce d\'identité) est obligatoire.');
    }
    if (!files?.selfie?.[0]) {
      throw new BadRequestException('Le champ `selfie` est obligatoire.');
    }

    const [front, selfieResult] = await Promise.all([
      this.kycStorage.save(files.idCardFront[0]),
      this.kycStorage.save(files.selfie[0]),
    ]);

    const [back, address] = await Promise.all([
      files.idCardBack?.[0]  ? this.kycStorage.save(files.idCardBack[0])  : Promise.resolve(null),
      files.addressProof?.[0] ? this.kycStorage.save(files.addressProof[0]) : Promise.resolve(null),
    ]);

    const dto: SubmitUserKycDto = {
      idCardFrontUrl:  front.url,
      selfieUrl:       selfieResult.url,
      idCardBackUrl:   back?.url,
      addressProofUrl: address?.url,
    };

    return this.usersService.submitKyc(req.user.id, dto);
  }

  @Get('me/kyc')
  @ApiOperation({
    summary: 'Consulter mon statut KYC',
    description: 'Retourne le statut du dossier KYC du client connecté (`pending`, `approved`, `rejected`). Retourne `null` si aucun dossier n\'a été soumis.',
  })
  @ApiOkResponse({
    schema: {
      example: {
        id: 'uuid', userId: 'uuid', status: 'rejected',
        rejectionReason: 'Document illisible. Merci de rescanner.',
        submittedAt: '2026-03-06T10:00:00Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  getKycStatus(@Request() req: { user: { id: string } }) {
    return this.usersService.getKycStatus(req.user.id);
  }

  // ─── KYC Admin ──────────────────────────────────────────────────────────

  @Get('kyc')
  @Roles('super_admin', 'city_admin', 'manager')
  @ApiOperation({
    summary: '[Admin] Liste des dossiers KYC clients',
    description:
      'Retourne les dossiers KYC paginés et filtrables.\n\n' +
      'Chaque entrée inclut les informations de l\'utilisateur et du relecteur.\n\n' +
      'Un `city_admin` ou `manager` ne voit que les KYC des villes qui lui sont assignées.',
  })
  @ApiOkResponse({ schema: { example: { data: [], total: 10, page: 1, limit: 20, totalPages: 1 } } })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  async listKyc(
    @Query() dto: KycFilterDto,
    @Request() req: { user: { id: string } },
  ) {
    const perms = await this.rbacService.getEffectivePermissions(req.user.id);
    const scopedCityIds = perms.hasGlobalRole ? null : perms.cityScopedRoleIds;
    return this.usersService.listKyc({ ...dto, scopedCityIds });
  }

  @Patch(':id/kyc/review')
  @Roles('super_admin', 'city_admin', 'manager')
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur dont on traite le dossier KYC' })
  @ApiOperation({
    summary: '[Admin] Approuver ou rejeter un dossier KYC client',
    description:
      '- `decision: "approve"` → KYC validé, `user.kycVerified` passe à `true`\n' +
      '- `decision: "reject"` → KYC refusé, `rejectionReason` obligatoire, client notifié\n\n' +
      'Accesssible par `super_admin`, `city_admin` et `manager` (restreint à leurs villes).',
  })
  @ApiOkResponse({ schema: { example: { id: 'uuid', status: 'approved', reviewedAt: '2026-03-06T12:00:00Z', reviewedBy: 'admin-uuid' } } })
  @ApiNotFoundResponse({ type: NotFoundDto })
  @ApiBadRequestResponse({ type: ValidationErrorDto })
  @ApiConflictResponse({ description: 'KYC déjà approuvé' })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  async reviewKyc(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: ReviewUserKycDto,
    @Request() req: { user: { id: string } },
  ) {
    const perms = await this.rbacService.getEffectivePermissions(req.user.id);
    if (!perms.hasGlobalRole) {
      // city_admin / manager can only review KYC for users in their assigned cities
      const targetUser = await this.usersService.findById(userId);
      if (!perms.cityScopedRoleIds.includes(targetUser.cityId)) {
        throw new ForbiddenException('You do not have permission to review KYC for users in this city');
      }
    }
    return this.usersService.reviewKyc(userId, dto, req.user.id);
  }
}
