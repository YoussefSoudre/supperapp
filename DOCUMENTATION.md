# SuperApp BF — Documentation API Complète

**Version :** 1.0  
**Date :** Mars 2026  
**Base URL :** `http://localhost:3000/api/v1`  
**Format :** JSON (sauf uploads multipart)  
**Authentification :** JWT Bearer Token (`Authorization: Bearer <access_token>`)

---

## Table des matières

1. [Architecture générale](#1-architecture-générale)
2. [Authentification & Sécurité](#2-authentification--sécurité)
3. [Module Auth](#3-module-auth)
4. [Module Users](#4-module-users)
5. [Module Drivers](#5-module-drivers)
6. [Module Rides (Courses)](#6-module-rides-courses)
7. [Module Delivery (Livraison)](#7-module-delivery-livraison)
8. [Module Food (Restauration)](#8-module-food-restauration)
9. [Module Payments](#9-module-payments)
10. [Module Wallet](#10-module-wallet)
11. [Module Cities (Villes)](#11-module-cities-villes)
12. [Module Pricing (Tarification)](#12-module-pricing-tarification)
13. [Module Referral (Parrainage)](#13-module-referral-parrainage)
14. [Module Analytics](#14-module-analytics)
15. [Module Announcements (Annonces)](#15-module-announcements-annonces)
16. [Module Notifications](#16-module-notifications)
17. [Module Admin & RBAC](#17-module-admin--rbac)
18. [Module Scheduling (Planification)](#18-module-scheduling-planification)
19. [Module Dispatch & Tracking (WebSocket)](#19-module-dispatch--tracking-websocket)
20. [Codes d'erreur standard](#20-codes-derreur-standard)
21. [Récapitulatif des endpoints](#21-récapitulatif-des-endpoints)

---

## 1. Architecture générale

### Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | NestJS (Node.js) |
| Base de données | PostgreSQL |
| Cache & Sessions | Redis |
| File d'attente (jobs) | BullMQ (Redis-backed) |
| Authentification | JWT (access) + UUID (refresh, Redis) |
| Upload fichiers | Multer (local disk) |
| WebSocket | Socket.IO |
| Email dev | Mailhog |
| SMS (prod) | Twilio / Orange |
| Push (prod) | Firebase Cloud Messaging (FCM) |

### Versioning

Tous les endpoints sont préfixés `/api/v1/`.

### Flux général

```
Client Mobile / Web
       │
       ▼
   API NestJS (port 3000)
       │
       ├── JwtAuthGuard  → valide le Bearer Token
       ├── RolesGuard    → vérifie le rôle (super_admin, city_admin…)
       ├── PermissionGuard → vérifie la permission RBAC (rides:read…)
       │
       ├── PostgreSQL (données persistantes)
       ├── Redis (cache RBAC, tokens, OTP, géolocalisation)
       └── BullMQ (jobs asynchrones : notifications, dispatch, planning)

   WebSocket Gateway (port 3001)
       └── /tracking namespace → géolocalisation temps réel
```

---

## 2. Authentification & Sécurité

### Tokens JWT

| Token | Durée | Stockage |
|-------|-------|---------|
| `access_token` | 7 jours (configurable) | Côté client (mémoire / AsyncStorage) |
| `refresh_token` | 30 jours | Redis (révocable instantanément) |

Le payload JWT contient : `{ sub: userId, phone, cityId }`.

### Protections anti-bruteforce

- **Par IP** : 15 tentatives / 15 min → blocage 30 min
- **Par identifiant** : 5 tentatives / 10 min → blocage 20 min
- Actif sur : `/auth/register`, `/auth/login`, `/auth/otp/send`

### OTP SMS

- 6 chiffres, valable **5 minutes**
- Max **5 envois / heure** par numéro
- Max **5 tentatives** de vérification → blocage 15 min
- Consommé à usage unique après succès

### Rôles et permissions (RBAC)

| Rôle | Scope | Description |
|------|-------|-------------|
| `super_admin` | Global | Accès total, toutes villes |
| `city_admin` | Ville | Admin complet d'une ville |
| `manager` | Ville | Opérations quotidiennes |
| `support` | Ville | Support client (lecture + annulations) |
| `finance` | Ville | Comptabilité et rapports financiers |
| `analyste` | Ville | Lecture analytics uniquement |

Les permissions RBAC sont sous la forme `ressource:action` (ex: `rides:read`, `payments:refund`). Elles sont stockées en cache Redis avec invalidation automatique lors d'un changement de rôle.

---

## 3. Module Auth

> **Base path :** `/api/v1/auth`

### 3.1 Inscription

**`POST /auth/register?cityId={uuid}`**

Crée un compte utilisateur. Le compte est créé en statut **inactif** jusqu'à la vérification du numéro de téléphone par OTP.

**Body :**
```json
{
  "firstName": "Angela",
  "lastName": "Kaboré",
  "phone": "71896548",
  "password": "MonMotDePasse123!",
  "email": "angela@example.com"
}
```

> Le téléphone est automatiquement normalisé : `71896548` → `+22671896548`

**Query param :**
- `cityId` (UUID, obligatoire) — ville principale de l'utilisateur

**Réponse 201 :**
```json
{
  "message": "Account created. Please verify your phone number with the OTP sent by SMS.",
  "phone": "+22671896548"
}
```

> Un OTP à 6 chiffres est envoyé automatiquement par SMS. Les tokens JWT **ne sont pas encore retournés** — il faut d'abord vérifier le téléphone.

---

### 3.2 Envoi OTP (renvoi manuel)

**`POST /auth/otp/send`**

Envoie (ou renvoie) un OTP SMS.

**Body :**
```json
{
  "phone": "+22671896548"
}
```

**Réponse 200 :**
```json
{
  "message": "OTP sent successfully"
}
```

---

### 3.3 Vérification OTP & Activation du compte

**`POST /auth/otp/verify`**

Vérifie l'OTP, active le compte (`status: active`, `phoneVerified: true`) et retourne les tokens JWT.

**Body :**
```json
{
  "phone": "+22671896548",
  "code": "482931"
}
```

**Réponse 200 :**
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "e320c760-22e4-44f2-a69f-3439e6aee2fe",
  "expires_in": 604800,
  "user": {
    "id": "df227b15-aec2-403f-9a6a-e7b5aea0f730",
    "firstName": "Angela",
    "lastName": "Kaboré",
    "phone": "+22671896548",
    "status": "active",
    "phoneVerified": true,
    "cityId": "650e8400-e29b-41d4-a716-446655440001"
  }
}
```

---

### 3.4 Connexion

**`POST /auth/login`**

**Body :**
```json
{
  "phone": "+22671896548",
  "password": "MonMotDePasse123!"
}
```

**Réponse 200 :** même structure que `/auth/otp/verify`

**Erreurs possibles :**
- `401` — Identifiants invalides
- `401` — Compte inactif (téléphone non vérifié)
- `401` — Compte suspendu

---

### 3.5 Renouvellement des tokens

**`POST /auth/refresh`**

Révoque l'ancien `refresh_token` et retourne un nouveau couple.

**Body :**
```json
{
  "refresh_token": "e320c760-22e4-44f2-a69f-3439e6aee2fe"
}
```

---

### 3.6 Déconnexion

**`POST /auth/logout`** *(Bearer)*

```json
{
  "refresh_token": "e320c760-22e4-44f2-a69f-3439e6aee2fe"
}
```
Réponse : `204 No Content`

**`POST /auth/logout/all`** *(Bearer)*

Révoque tous les refresh_tokens de l'utilisateur (tous appareils). Réponse : `204 No Content`

---

## 4. Module Users

> **Base path :** `/api/v1/users`  
> **Auth :** Bearer Token requis sur tous les endpoints

### 4.1 Mon profil

**`GET /users/me`**

Retourne le profil complet de l'utilisateur connecté.

**Réponse 200 :**
```json
{
  "id": "df227b15-...",
  "firstName": "Angela",
  "lastName": "Kaboré",
  "phone": "+22671896548",
  "email": null,
  "status": "active",
  "cityId": "650e8400-...",
  "referralCode": "ANGE-EF5011",
  "phoneVerified": true,
  "kycVerified": false,
  "avatarUrl": null,
  "createdAt": "2026-03-06T13:45:06.544Z"
}
```

---

### 4.2 Modifier mon profil

**`PATCH /users/me`**

**Body (champs optionnels) :**
```json
{
  "firstName": "Angela",
  "lastName": "Kaboré",
  "email": "angela@example.com",
  "avatarUrl": "https://..."
}
```

---

### 4.3 Token FCM Push

**`PATCH /users/me/fcm-token`**

Enregistre ou met à jour le token Firebase pour les notifications push.

**Body :**
```json
{
  "fcmToken": "dK8YvA..."
}
```

---

### 4.4 KYC — Upload d'un document

**`POST /users/me/kyc/upload`**

Upload d'un fichier KYC individuel. Formats acceptés : JPEG, PNG, WebP, PDF. Taille max : 10 Mo.

**Multipart form-data :**
- `file` — le fichier

**Réponse 201 :**
```json
{
  "url": "http://localhost:3000/static/kyc/a1b2c3.jpg",
  "originalName": "cni_recto.jpg",
  "sizeBytes": 204800,
  "mimeType": "image/jpeg"
}
```

---

### 4.5 KYC — Soumettre le dossier complet

**`POST /users/me/kyc`**

Soumet tous les documents KYC en une requête.

**Multipart form-data :**
| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| `idCardFront` | ✅ | Recto CNI / passeport |
| `selfie` | ✅ | Selfie tenant la pièce d'identité |
| `idCardBack` | ❌ | Verso CNI |
| `addressProof` | ❌ | Justificatif de domicile |

**Comportement :**
- Si dossier **rejeté** existe → réinitialisé en `pending`
- Si dossier **approuvé** → `409 Conflict` (impossible de re-soumettre)

**Réponse 201 :**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "status": "pending",
  "submittedAt": "2026-03-06T10:00:00Z"
}
```

---

### 4.6 KYC — Consulter mon statut

**`GET /users/me/kyc`**

Retourne `null` si aucun dossier soumis.

```json
{
  "id": "uuid",
  "status": "rejected",
  "rejectionReason": "Document illisible. Merci de rescanner.",
  "submittedAt": "2026-03-06T10:00:00Z"
}
```

---

### 4.7 [Admin] Liste des utilisateurs

**`GET /users`** — Rôles : `super_admin`, `city_admin`

Un `city_admin` ne voit automatiquement que les utilisateurs de ses villes assignées.

**Query params :**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `page` | number | Page (défaut: 1) |
| `limit` | number | Résultats par page (défaut: 20) |
| `sortBy` | string | `createdAt` \| `firstName` \| `lastName` |
| `sortOrder` | string | `ASC` \| `DESC` |
| `search` | string | Recherche prénom/nom/email/téléphone |
| `status` | string | `active` \| `inactive` \| `suspended` \| `pending_kyc` |
| `cityId` | UUID | Filtrer par ville |
| `phoneVerified` | boolean | Filtrer par vérification téléphone |
| `kycVerified` | boolean | Filtrer par statut KYC |
| `dateFrom` | ISO8601 | Date de création minimum |
| `dateTo` | ISO8601 | Date de création maximum |

**Réponse :**
```json
{
  "data": [...],
  "total": 1200,
  "page": 1,
  "limit": 20,
  "totalPages": 60
}
```

---

### 4.8 [Admin] Détail d'un utilisateur

**`GET /users/:id`** — Rôles : `super_admin`, `city_admin`

---

### 4.9 [Admin] Liste des dossiers KYC

**`GET /users/kyc`** — Rôles : `super_admin`, `city_admin`, `manager`

Retourne les dossiers enrichis avec informations utilisateur et relecteur.

**Query params :**
| Paramètre | Description |
|-----------|-------------|
| `status` | `pending` \| `approved` \| `rejected` |
| `cityId` | Filtrer par ville |
| `search` | Recherche sur nom/téléphone de l'utilisateur |
| `dateFrom` / `dateTo` | Plage de dates de soumission |
| `reviewedBy` | UUID de l'admin relecteur |
| `page` / `limit` | Pagination |

**Réponse (données enrichies) :**
```json
{
  "data": [
    {
      "kycId": "uuid",
      "status": "pending",
      "submittedAt": "2026-03-05T08:00:00Z",
      "userId": "uuid",
      "userFirstName": "Angela",
      "userLastName": "Kaboré",
      "userPhone": "+22671896548",
      "userCityId": "uuid",
      "reviewerId": null,
      "reviewerFirstName": null,
      "reviewerLastName": null,
      "idCardFrontUrl": "http://...",
      "selfieUrl": "http://..."
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### 4.10 [Admin] Approuver / Rejeter un KYC

**`PATCH /users/:id/kyc/review`** — Rôles : `super_admin`, `city_admin`, `manager`

Les `city_admin` et `manager` ne peuvent traiter que les dossiers des utilisateurs de leurs villes assignées.

**Body :**
```json
{
  "decision": "approve"
}
```
ou
```json
{
  "decision": "reject",
  "rejectionReason": "Photo de selfie floue. Merci de recommencer."
}
```

**Effets :**
- `approve` → `user.kycVerified = true`, statut KYC → `approved`
- `reject` → `rejectionReason` obligatoire, l'utilisateur peut re-soumettre

---

## 5. Module Drivers

> **Base path :** `/api/v1/drivers`  
> **Auth :** Bearer Token requis

### 5.1 Mon profil chauffeur

**`GET /drivers/me`**

```json
{
  "id": "uuid",
  "userId": "uuid",
  "isOnline": false,
  "dispatchScore": 4.7,
  "vehicle": { "type": "moto", "brand": "Honda", "plate": "BF-1234-A" },
  "documents": { "driverLicense": "url", "insurance": "url" }
}
```

---

### 5.2 Se mettre en ligne

**`POST /drivers/me/online`**

Rend le chauffeur disponible pour recevoir des courses. Le compte chauffeur doit être vérifié.

**Réponse 200 :**
```json
{
  "isOnline": true,
  "message": "You are now online and available for dispatch."
}
```

---

### 5.3 Se mettre hors ligne

**`POST /drivers/me/offline`**

```json
{
  "isOnline": false,
  "message": "You are now offline."
}
```

---

## 6. Module Rides (Courses)

> **Base path :** `/api/v1/rides`  
> **Auth :** Bearer Token requis

### États d'une course

```
PENDING → SEARCHING → ACCEPTED → IN_PROGRESS → COMPLETED
                                              → CANCELLED
SCHEDULED (futur) → SEARCHING (au moment du départ)
```

---

### 6.1 Créer une course

**`POST /rides`**

**Body :**
```json
{
  "pickupLat": 12.3681,
  "pickupLng": -1.5275,
  "pickupAddress": "Avenue Kwamé Nkrumah, Ouagadougou",
  "dropoffLat": 12.3510,
  "dropoffLng": -1.5100,
  "dropoffAddress": "Place de la Nation, Ouagadougou",
  "type": "moto",
  "scheduledAt": null,
  "promoCode": null
}
```

> `type` : `moto` | `car` | `carpool`  
> `scheduledAt` : date ISO8601 pour une course planifiée (null = immédiate)

**Réponse 201 :** objet `Ride` complet avec `estimatedPrice`, `distanceKm`, `durationMinutes`

---

### 6.2 Mes courses (historique)

**`GET /rides`**

**Query params :**
| Paramètre | Description |
|-----------|-------------|
| `page`, `limit` | Pagination |
| `status` | Un ou plusieurs statuts |
| `type` | `moto` \| `car` \| `carpool` |
| `dateFrom`, `dateTo` | Plage de dates |
| `search` | Recherche sur l'adresse |

---

### 6.3 Détail d'une course

**`GET /rides/:id`**

---

### 6.4 Accepter une course (chauffeur)

**`PATCH /rides/:id/accept`**

Le chauffeur accepte la course assignée. `SEARCHING → ACCEPTED`.

---

### 6.5 Terminer une course

**`PATCH /rides/:id/complete`**

**Body :**
```json
{
  "finalPrice": 1500
}
```

Effets : `IN_PROGRESS → COMPLETED`, wallet chauffeur crédité (80% du prix), événement `ride.completed` émis.

---

### 6.6 Annuler une course

**`PATCH /rides/:id/cancel`**

Annulable si statut : `PENDING`, `SEARCHING`, `ACCEPTED`, `SCHEDULED`.

**Body :**
```json
{
  "reason": "Chauffeur en retard"
}
```

---

### 6.7 Modifier une course avant départ

**`PATCH /rides/:id/modify`**

Modification d'adresse avant que le chauffeur ne soit en route.

---

### 6.8 Modifier la destination en cours de route

**`PATCH /rides/:id/modify-enroute`**

**Body :**
```json
{
  "dropoffLat": 12.3600,
  "dropoffLng": -1.5200,
  "dropoffAddress": "Nouveau quartier, Ouagadougou"
}
```

> Si le détour dépasse 2 km, le chauffeur a **2 minutes** pour accepter ou refuser.

---

### 6.9 Répondre à une demande de modification (chauffeur)

**`PATCH /rides/:id/modification/respond`**

**Body :**
```json
{
  "accepted": true
}
```

---

### 6.10 Journal des modifications

**`GET /rides/:id/modification-logs`**

Historique immuable de toutes les modifications apportées à la course.

---

### 6.11 Noter une course

**`POST /rides/:id/rate`**

Disponible uniquement sur une course `COMPLETED`.

**Body :**
```json
{
  "rating": 5,
  "comment": "Chauffeur très ponctuel et sympathique."
}
```

---

## 7. Module Delivery (Livraison)

> **Base path :** `/api/v1/delivery`  
> **Auth :** Bearer Token requis

### 7.1 Créer une livraison

**`POST /delivery`**

**Body :**
```json
{
  "pickupAddress": "Zone du Bois, Ouagadougou",
  "pickupLat": 12.3681,
  "pickupLng": -1.5275,
  "dropoffAddress": "Quartier Pissy, Ouagadougou",
  "dropoffLat": 12.3400,
  "dropoffLng": -1.5500,
  "packageSize": "medium",
  "description": "Documents administratifs"
}
```

> `packageSize` : `small` | `medium` | `large`

---

### 7.2 Mes livraisons

**`GET /delivery`**

**Query params :** `page`, `limit`, `status[]`, `packageSize`, `dateFrom`, `dateTo`

---

## 8. Module Food (Restauration)

> **Base path :** `/api/v1/food`

### 8.1 Liste des restaurants

**`GET /food/restaurants`** *(public — sans token)*

**Query params :**
| Paramètre | Description |
|-----------|-------------|
| `page`, `limit` | Pagination |
| `search` | Recherche par nom |
| `cityId` | Filtrer par ville |
| `category` | Catégorie de cuisine |
| `sortBy` | `rating` \| `name` \| `createdAt` |
| `isActive` | Actif uniquement |

---

### 8.2 Passer une commande

**`POST /food/orders`** *(Bearer requis)*

**Body :**
```json
{
  "restaurantId": "uuid",
  "items": [
    { "menuItemId": "uuid", "quantity": 2 },
    { "menuItemId": "uuid", "quantity": 1 }
  ],
  "deliveryAddress": "Cité An III, Ouagadougou",
  "paymentMethod": "wallet"
}
```

> `paymentMethod` : `wallet` | `orange_money` | `moov_money` | `cash`

---

### 8.3 Mes commandes food

**`GET /food/orders`** *(Bearer requis)*

**Query params :** `page`, `limit`, `status[]`, `restaurantId`, `dateFrom`, `dateTo`

---

## 9. Module Payments

> **Base path :** `/api/v1/payments`  
> **Auth :** Bearer Token requis

### 9.1 Initier un paiement mobile money

**`POST /payments/initiate`**

**Body :**
```json
{
  "amount": 5000,
  "currency": "XOF",
  "provider": "orange_money",
  "referenceId": "uuid-de-la-course",
  "referenceType": "ride"
}
```

> `provider` : `orange_money` | `moov_money` | `coris_bank` | `wallet`

**Réponse :**
```json
{
  "id": "uuid",
  "status": "pending",
  "amount": 5000,
  "currency": "XOF",
  "provider": "orange_money"
}
```

---

### 9.2 Confirmer un paiement (webhook opérateur)

**`POST /payments/:id/confirm`**

Généralement appelé par le webhook de l'opérateur mobile money.

**Body :**
```json
{
  "providerTxId": "OM-TX-9876543"
}
```

**Effets :** statut → `success`, émission de l'événement `payment.success` (créditde wallet si topup).

---

## 10. Module Wallet

> **Base path :** `/api/v1/wallet`  
> **Auth :** Bearer Token requis

### 10.1 Mon wallet

**`GET /wallet`**

```json
{
  "id": "uuid",
  "userId": "uuid",
  "balance": 25000,
  "currency": "XOF",
  "updatedAt": "2026-03-06T12:00:00Z"
}
```

> Le solde est en **centimes XOF** (`25000 = 250 FCFA`).

---

### 10.2 Historique des transactions

**`GET /wallet/transactions`**

**Query params :**
| Paramètre | Description |
|-----------|-------------|
| `page`, `limit` | Pagination |
| `type` | `credit` \| `debit` |
| `reason[]` | Motif de transaction |
| `minAmount`, `maxAmount` | Plage de montants |
| `dateFrom`, `dateTo` | Plage de dates |
| `sortBy` | `createdAt` \| `amount` \| `balanceAfter` |

---

## 11. Module Cities (Villes)

> **Base path :** `/api/v1/cities`

### 11.1 Liste des villes actives

**`GET /cities`** *(public — sans token)*

```json
[
  { "id": "uuid", "name": "Ouagadougou", "slug": "ouagadougou", "status": "active" },
  { "id": "uuid", "name": "Bobo-Dioulasso", "slug": "bobo-dioulasso", "status": "active" }
]
```

---

### 11.2 Détail d'une ville

**`GET /cities/:slug`** *(public — sans token)*

```json
{
  "id": "uuid",
  "name": "Ouagadougou",
  "slug": "ouagadougou",
  "lat": 12.3681,
  "lng": -1.5275,
  "radius": 30,
  "currency": "XOF"
}
```

---

### 11.3 [Admin] Toutes les villes

**`GET /cities/admin/all`** — Rôle : `super_admin`

Retourne toutes les villes y compris `inactive` et `coming_soon`.

---

### 11.4 [Admin] Créer une ville

**`POST /cities`** — Rôle : `super_admin`

**Body :**
```json
{
  "name": "Koudougou",
  "slug": "koudougou",
  "lat": 12.2534,
  "lng": -2.3649,
  "radius": 20,
  "status": "coming_soon"
}
```

---

### 11.5 [Admin] Activer une ville

**`PATCH /cities/:id/activate`** — Rôle : `super_admin`

---

### 11.6 [Admin] Désactiver une ville

**`PATCH /cities/:id/deactivate`** — Rôle : `super_admin`

**Body (optionnel) :**
```json
{
  "message": "Maintenance programmée jusqu'au 10 mars. Service suspendu temporairement."
}
```

**Effets :** statut → `inactive` + notification PUSH et IN_APP envoyée à tous les utilisateurs de la ville.

---

### 11.7 [Admin] Supprimer une ville

**`DELETE /cities/:id`** — Rôle : `super_admin`

> ⚠️ **Opération irréversible.** Réponse : `204 No Content`.

---

## 12. Module Pricing (Tarification)

> **Base path :** `/api/v1/pricing`  
> **Auth :** Bearer Token requis (admin pour les endpoints de config)

### 12.1 Estimer le prix d'une course

**`POST /pricing/estimate`**

**Body :**
```json
{
  "serviceType": "moto",
  "distanceKm": 5.2,
  "durationMinutes": 15,
  "passengersCount": 1,
  "demandFactor": 1.2
}
```

> `serviceType` : `moto` | `car` | `carpool` | `delivery`

**Réponse :**
```json
{
  "total": 1950,
  "breakdown": {
    "base": 500,
    "distanceFee": 1300,
    "surcharge": 150
  },
  "currency": "XOF"
}
```

---

### 12.2 Calculer les frais d'annulation

**`POST /pricing/cancellation-fee`**

**Body :**
```json
{
  "serviceType": "moto",
  "driverEnRoute": true
}
```

**Réponse :**
```json
{
  "cancellationFee": 200,
  "currency": "XOF",
  "reason": "Driver was already en route"
}
```

---

### 12.3 [Admin] Configurations de prix d'une ville

**`GET /pricing/admin/configs/:cityId/:serviceType`** — Permission : `pricing:read`

---

### 12.4 [Admin] Créer / mettre à jour une règle de prix

**`POST /pricing/admin/configs`** — Permission : `pricing:configure`

**Body :**
```json
{
  "cityId": "uuid",
  "serviceType": "moto",
  "ruleKey": "base_fare",
  "name": "Tarif de base moto Ouagadougou",
  "params": {
    "basePrice": 500,
    "pricePerKm": 250,
    "pricePerMinute": 20
  },
  "priority": 1,
  "isActive": true
}
```

---

### 12.5 [Admin] Activer / désactiver une règle

**`PATCH /pricing/admin/configs/:id/toggle`**

**Body :**
```json
{
  "isActive": false
}
```

---

## 13. Module Referral (Parrainage)

> **Base path :** `/api/v1/referral`  
> **Auth :** Bearer Token requis

### 13.1 Mon code de parrainage et mes statistiques

**`GET /referral/my-code`**

```json
{
  "code": "ANGE-EF5011",
  "referrals": 12,
  "rewards": {
    "total": 6000,
    "currency": "XOF"
  },
  "program": {
    "name": "Programme Ouaga Mars 2026",
    "referrerRewardAmount": 500,
    "triggerAfterTrips": 1
  }
}
```

---

### 13.2 Mes filleuls

**`GET /referral/my-referrals`**

```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "Moussa",
      "lastName": "Sawadogo",
      "status": "rewarded",
      "tripsCompleted": 3,
      "rewardedAt": "2026-02-15T10:00:00Z"
    }
  ],
  "total": 12
}
```

---

### 13.3 Programmes actifs pour ma ville

**`GET /referral/programs`**

---

### 13.4 [Admin] Créer un programme de parrainage

**`POST /referral/admin/programs`** — Permission : `referral:manage`

**Body :**
```json
{
  "name": "Programme Lancement Koudougou",
  "cityId": "uuid",
  "serviceTypes": ["moto", "car"],
  "referrerRewardType": "wallet_credit",
  "referrerRewardAmount": 500,
  "refereeRewardType": "discount",
  "refereeRewardAmount": 200,
  "triggerAfterTrips": 1,
  "expiresAt": "2026-06-30T23:59:59Z",
  "antiAbuseConfig": {
    "maxFilleulsPerReferrer": 50,
    "minAccountAgeDays": 0,
    "maxUsersPerSubnet": 5,
    "blockSameDevice": true
  }
}
```

---

### 13.5 [Admin] Statistiques ROI

**`GET /referral/admin/roi/:cityId`** — Permission : `referral:read`

---

## 14. Module Analytics

> **Base path :** `/api/v1/analytics`  
> **Auth :** Bearer Token requis

### 14.1 KPIs globaux (30 derniers jours)

**`GET /analytics/metrics`** — Rôle : `super_admin` uniquement

```json
{
  "rides": { "total": 45280, "completed": 42100, "cancelled": 3180 },
  "drivers": { "total": 850, "online": 312 },
  "users": { "total": 28500, "new": 1200 },
  "deliveries": { "total": 9800 },
  "food": { "orders": 15600, "revenue": 78000000 },
  "payments": { "volume": 245000000, "currency": "XOF" },
  "period": "30d",
  "scope": "global"
}
```

---

### 14.2 KPIs par ville

**`GET /analytics/city-metrics`** — Rôles : `super_admin`, `city_admin`, `finance`, `analyste`

**Query params :** `?cityId=uuid` (optionnel pour super_admin — sans ce param, retourne les données de toutes ses villes)

Chaque rôle est automatiquement restreint à ses villes assignées.

---

### 14.3 Métriques opérationnelles

**`GET /analytics/manager-metrics`** — Rôles : `super_admin`, `city_admin`, `manager`

```json
{
  "ridesToday": 182,
  "rides7d": 1240,
  "driversLive": 47,
  "deliveriesToday": 83,
  "foodToday": 156
}
```

---

## 15. Module Announcements (Annonces)

> **Base path :** `/api/v1/announcements`  
> **Auth :** Bearer Token requis

### Cycle de vie d'une annonce

```
DRAFT → SCHEDULED → PUBLISHED → ARCHIVED
  └────────────────────────────────────┘
         (republish: archived → draft)
```

---

### 15.1 Mes annonces actives

**`GET /announcements`**

Retourne les annonces de ma ville + les annonces globales. Les épinglées apparaissent en premier. Les expirées sont exclues.

**Query params :** `page`, `limit`

---

### 15.2 Détail d'une annonce

**`GET /announcements/:id`**

---

### 15.3 Marquer une annonce comme lue

**`POST /announcements/me/read`**

**Body :**
```json
{
  "announcementId": "uuid"
}
```
Réponse : `204 No Content` (idempotent)

---

### 15.4 [Admin] Upload média

**`POST /announcements/admin/media`** — Permission : `ANNOUNCEMENTS_MANAGE`

**Multipart form-data :**
- `file` — Image (≤10 Mo) ou vidéo (≤200 Mo)

**Réponse :**
```json
{
  "url": "http://.../static/announcements/uuid.jpg",
  "mediaType": "image",
  "sizeBytes": 512000,
  "mimeType": "image/jpeg"
}
```

---

### 15.5 [Admin] Créer une annonce

**`POST /announcements/admin`** — Permission : `ANNOUNCEMENTS_MANAGE`

**Body :**
```json
{
  "title": "Nouvelle fonctionnalité disponible",
  "content": "Découvrez la livraison express...",
  "type": "info",
  "scope": "city",
  "cityId": "uuid",
  "pinned": false,
  "expiresAt": "2026-04-01T00:00:00Z",
  "mediaUrl": "http://.../image.jpg",
  "mediaType": "image"
}
```

> `type` : `info` | `maintenance` | `promotion` | `alert` | `update`  
> `scope` : `global` | `city`

Créée en statut **DRAFT** — non visible des utilisateurs.

---

### 15.6 [Admin] Publier une annonce

**`POST /announcements/admin/:id/publish`** — Permission : `ANNOUNCEMENTS_MANAGE`

Déclenche l'envoi en PUSH, IN_APP et WebSocket aux utilisateurs ciblés.

**Réponse :**
```json
{
  "id": "uuid",
  "status": "published",
  "publishedAt": "2026-03-06T14:00:00Z",
  "broadcastId": "uuid"
}
```

---

### 15.7 [Admin] Planifier une publication

**`POST /announcements/admin/:id/schedule`**

**Body :**
```json
{
  "scheduledAt": "2026-03-10T09:00:00Z"
}
```

---

### 15.8 [Admin] Autres opérations

| Endpoint | Description |
|----------|-------------|
| `POST /announcements/admin/:id/archive` | Archiver une annonce publiée |
| `POST /announcements/admin/:id/republish` | Réactiver une annonce archivée (→ DRAFT) |
| `POST /announcements/admin/:id/duplicate` | Cloner l'annonce en DRAFT (préfixe `[Copie]`) |
| `DELETE /announcements/admin/:id` | Supprimer (DRAFT uniquement) |
| `GET /announcements/admin/list` | Liste admin avec filtres (status, scope, cityId, type) |
| `GET /announcements/admin/:id/audit` | Journal d'audit immuable |
| `GET /announcements/admin/:id/audience` | Estimation du nombre d'utilisateurs ciblés |
| `GET /announcements/admin/:id/reads` | Nombre de lectures |

---

## 16. Module Notifications

> **Base path :** `/api/v1/notifications`  
> **Auth :** Bearer Token requis

### Canaux supportés

| Canal | Description |
|-------|-------------|
| `push` | Firebase Cloud Messaging (FCM) |
| `sms` | Twilio / Orange |
| `email` | SMTP / SendGrid |
| `in_app` | Notification in-app (WebSocket + BD) |

---

### 16.1 Mes notifications

**`GET /notifications`**

**Query params :**
| Paramètre | Description |
|-----------|-------------|
| `page`, `limit` | Pagination |
| `isRead` | `true` \| `false` |
| `category` | `ride` \| `food` \| `delivery` \| `payment` \| `system` \| `promo` |
| `channel` | `push` \| `email` \| `sms` \| `in_app` |
| `priority` | `low` \| `normal` \| `high` \| `critical` |
| `dateFrom`, `dateTo` | Plage de dates |

---

### 16.2 Marquer comme lue

**`PATCH /notifications/:id/read`**

```json
{ "id": "uuid", "isRead": true, "readAt": "2026-03-06T15:00:00Z" }
```

---

### 16.3 Tout marquer comme lu

**`PATCH /notifications/read-all`**

```json
{ "updated": 12 }
```

---

### 16.4 Notifications planifiées

| Endpoint | Description |
|----------|-------------|
| `GET /notifications/scheduled` | Mes notifications en attente d'envoi (jobs BullMQ) |
| `DELETE /notifications/scheduled/:id` | Annuler une notification planifiée |

---

### 16.5 Logs de livraison

**`GET /notifications/:id/delivery-logs`**

```json
{
  "data": [
    {
      "channel": "push",
      "status": "delivered",
      "attempts": 1,
      "sentAt": "2026-03-06T15:00:05Z"
    },
    {
      "channel": "sms",
      "status": "failed",
      "attempts": 3,
      "sentAt": "2026-03-06T15:00:10Z"
    }
  ]
}
```

---

### 16.6 [Admin] Envoyer une notification individuelle

**`POST /notifications/admin/send`** — Rôle admin

**Body :**
```json
{
  "userId": "uuid",
  "channel": "push",
  "category": "system",
  "title": "Votre KYC a été approuvé",
  "body": "Félicitations ! Votre identité a été vérifiée avec succès.",
  "priority": "high",
  "scheduledAt": null
}
```

---

### 16.7 [Admin] Broadcast par ville ou rôle

**`POST /notifications/admin/broadcast`** — Rôle admin

**Body :**
```json
{
  "targetCityId": "uuid",
  "targetRole": null,
  "title": "Maintenance programmée cette nuit",
  "body": "Le service sera interrompu de 02h à 04h.",
  "channels": ["push", "in_app"],
  "category": "system",
  "priority": "high",
  "scheduledAt": null
}
```

**Réponse :**
```json
{
  "broadcastId": "uuid",
  "status": "queued",
  "estimatedRecipients": 4280
}
```

---

### 16.8 [Admin] Statut d'un broadcast

**`GET /notifications/admin/broadcast/:id`**

```json
{
  "id": "uuid",
  "status": "completed",
  "total": 4280,
  "sent": 4251,
  "failed": 29
}
```

---

## 17. Module Admin & RBAC

> **Base path :** `/api/v1/admin` et `/api/v1/admin/rbac`

---

### 17.1 Bootstrap Premier Super Admin

**`POST /admin/rbac/bootstrap`** *(Sans authentification — protégé par secret)*

> Utilisé une seule fois pour initialiser le premier super_admin. Bloqué si un super_admin existe déjà.

**Headers :**
```
x-bootstrap-secret: superapp-bootstrap-secret-2026
```

**Body :**
```json
{
  "userId": "df227b15-aec2-403f-9a6a-e7b5aea0f730"
}
```

---

### 17.2 Gestion des rôles

| Endpoint | Permission | Description |
|----------|-----------|-------------|
| `GET /admin/rbac/roles` | `admin:roles` | Liste tous les rôles avec leurs permissions |
| `POST /admin/rbac/roles` | `admin:roles` | Créer un rôle custom |
| `PUT /admin/rbac/roles/:id` | `admin:roles` | Modifier un rôle non-système |
| `DELETE /admin/rbac/roles/:id` | `admin:roles` | Supprimer un rôle non-système |

**Body création d'un rôle :**
```json
{
  "name": "Modérateur",
  "slug": "moderateur",
  "scope": "city",
  "description": "Modération du contenu",
  "color": "#FF6B35"
}
```

---

### 17.3 Gestion des permissions

| Endpoint | Permission | Description |
|----------|-----------|-------------|
| `GET /admin/rbac/permissions` | `admin:permissions` | Catalogue de toutes les permissions |
| `POST /admin/rbac/permissions` | `admin:permissions` | Créer une permission custom |
| `POST /admin/rbac/roles/:id/permissions` | `admin:permissions` | Assigner des permissions à un rôle |
| `DELETE /admin/rbac/roles/:roleId/permissions/:permId` | `admin:permissions` | Retirer une permission d'un rôle |

**Body assignation de permissions :**
```json
{
  "slugs": ["rides:read", "users:read", "payments:read"]
}
```

---

### 17.4 Gestion des rôles utilisateurs

| Endpoint | Permission | Description |
|----------|-----------|-------------|
| `POST /admin/rbac/users/:userId/roles` | `admin:users_roles` | Assigner un rôle à un utilisateur |
| `DELETE /admin/rbac/users/:userId/roles/:userRoleId` | `admin:users_roles` | Révoquer un rôle |
| `GET /admin/rbac/users/:userId/roles` | `admin:users_roles` | Rôles actifs d'un utilisateur |
| `GET /admin/rbac/users/:userId/permissions` | `admin:users_roles` | Permissions effectives d'un utilisateur |
| `GET /admin/rbac/me/permissions` | Toute auth | Mes propres permissions |

**Body assignation d'un rôle :**
```json
{
  "roleId": "uuid-du-role",
  "cityId": "uuid-de-la-ville",
  "expiresAt": null,
  "reason": "Nouveau city admin pour Bobo"
}
```

> Pour `scope=global` (ex: `super_admin`), omettre `cityId`.  
> Pour `scope=city`, le `cityId` est **obligatoire**.

---

### 17.5 Logs d'audit

| Endpoint | Permission | Description |
|----------|-----------|-------------|
| `GET /admin/rbac/audit-logs` | `admin:audit_logs` | Logs d'audit paginés et filtrés |
| `GET /admin/rbac/audit-logs/summary` | `admin:audit_logs` | Résumé agrégé des actions |

**Query params audit-logs :**
| Paramètre | Description |
|-----------|-------------|
| `userId` | Filtrer par utilisateur |
| `outcome` | `success` \| `failure` |
| `resource` | Ressource ciblée |
| `cityId` | Filtrer par ville |
| `from`, `to` | Plage de dates |
| `page`, `limit` | Pagination |

**Réponse summary :**
```json
{
  "total": 1580,
  "byAction": { "users:read": 850, "rides:manage": 320 },
  "failureRate": 0.023,
  "topResources": ["rides", "users", "payments"]
}
```

---

### 17.6 Invitation KYC

**`POST /admin/kyc/invite`** — Rôles : `super_admin`, `city_admin`

Envoie une invitation aux clients sans KYC.

**Body :**
```json
{
  "target": "city",
  "cityId": "uuid",
  "channels": ["push", "sms"],
  "title": "Vérifiez votre identité",
  "body": "Complétez votre vérification KYC pour accéder à toutes les fonctionnalités."
}
```

> `target` : `single_user` | `all_without_kyc` | `city`

**Réponse :**
```json
{
  "notified": 1240
}
```

---

## 18. Module Scheduling (Planification)

> Pas d'endpoint HTTP. Service de fond CRON automatique.

### Comportement

| CRON | Fréquence | Action |
|------|-----------|--------|
| Scan rides planifiées | Toutes les minutes | Courses avec `scheduledAt ∈ [now, now+16min]` → job BullMQ avec délai exactement 1 min avant le départ |
| Nettoyage | Toutes les heures | Annule les courses `SCHEDULED` dont le `scheduledAt` est dépassé sans avoir été déclenché |

**Caractéristiques :**
- Dédupliquation par job ID (`ride-{rideId}`)
- 3 tentatives avec backoff exponentiel en cas d'échec
- Aucune action manuelle requise — entièrement automatique

---

## 19. Module Dispatch & Tracking (WebSocket)

> **URL WebSocket :** `ws://localhost:3001/tracking`  
> Implémenté avec Socket.IO

### Connexion

```javascript
const socket = io('http://localhost:3001/tracking', {
  auth: { token: 'Bearer eyJhbGci...' }
});
```

---

### Événements Client → Serveur

#### `track:ride` — Passager : rejoindre le suivi d'une course

```json
{
  "rideId": "uuid",
  "userId": "uuid"
}
```

Le client rejoint la room `ride:{rideId}` et reçoit immédiatement la dernière position connue du chauffeur (depuis Redis).

---

#### `driver:location` — Chauffeur : envoyer sa position

```json
{
  "driverId": "uuid",
  "lat": 12.3681,
  "lng": -1.5275,
  "heading": 045,
  "speedKmh": 35
}
```

La position est stockée dans Redis (géolocalisation Redis GEO + métadonnées) et brodcastée à tous les passagers qui suivent ce chauffeur.

---

### Événements Serveur → Client

#### `driver:position` — Mise à jour de position

```json
{
  "driverId": "uuid",
  "lat": 12.3681,
  "lng": -1.5275,
  "heading": 045,
  "speedKmh": 35
}
```

Émis à la room `ride:{rideId}` à chaque mise à jour de position du chauffeur.

---

## 20. Codes d'erreur standard

| Code HTTP | Signification | Exemple |
|-----------|--------------|---------|
| `200` | Succès | GET, PATCH réussi |
| `201` | Créé | POST réussi |
| `204` | Pas de contenu | DELETE, logout |
| `400` | Données invalides | Champ manquant, format incorrect |
| `401` | Non authentifié | Token absent, expiré, OTP invalide |
| `403` | Interdit | Rôle insuffisant, ville hors scope |
| `404` | Non trouvé | Ressource inexistante |
| `409` | Conflit | Téléphone déjà enregistré, KYC déjà approuvé |
| `429` | Trop de requêtes | Limite OTP, bruteforce |
| `500` | Erreur serveur | Erreur interne |

**Format des erreurs :**
```json
{
  "statusCode": 400,
  "message": ["phone must be a valid phone number"],
  "error": "Bad Request"
}
```

---

## 21. Récapitulatif des endpoints

| Module | Endpoints publics | Endpoints authentifiés | Endpoints admin |
|--------|------------------|----------------------|-----------------|
| Auth | 5 | 2 | — |
| Users | — | 6 | 4 |
| Drivers | — | 3 | — |
| Rides | — | 11 | — |
| Delivery | — | 2 | — |
| Food | 1 | 2 | — |
| Payments | — | 2 | — |
| Wallet | — | 2 | — |
| Cities | 2 | — | 5 |
| Pricing | — | 2 | 4 |
| Referral | — | 3 | 5 |
| Analytics | — | — | 3 |
| Announcements | — | 3 | 13 |
| Notifications | — | 5 | 6 |
| Admin / RBAC | 1 (bootstrap) | 1 | 15 |
| Scheduling | — | — | (CRON) |
| Dispatch | — | — | (WebSocket) |
| **Total** | **9** | **44** | **55+** |

**Total : ~108 endpoints HTTP + 2 événements WebSocket**

---

## Catalogue des permissions RBAC

| Permission | Ressource | Description |
|-----------|-----------|-------------|
| `rides:read` | Courses | Voir la liste des courses |
| `rides:manage` | Courses | Créer, modifier des courses |
| `rides:cancel` | Courses | Annuler une course |
| `rides:dispatch` | Courses | Affecter manuellement un chauffeur |
| `drivers:read` | Chauffeurs | Voir les chauffeurs |
| `drivers:manage` | Chauffeurs | Créer, modifier chauffeurs |
| `drivers:suspend` | Chauffeurs | Suspendre/réactiver |
| `drivers:kyc` | Chauffeurs | Valider KYC chauffeur |
| `users:read` | Utilisateurs | Voir les utilisateurs |
| `users:manage` | Utilisateurs | Créer, modifier |
| `users:ban` | Utilisateurs | Bannir/débannir |
| `users:impersonate` | Utilisateurs | Connexion au nom d'un user |
| `payments:read` | Paiements | Voir les paiements |
| `payments:refund` | Paiements | Émettre un remboursement |
| `payments:export` | Paiements | Exporter CSV/Excel |
| `wallet:read` | Wallet | Voir les wallets |
| `wallet:credit` | Wallet | Créditer manuellement |
| `wallet:debit` | Wallet | Débiter manuellement |
| `delivery:read` | Livraison | Voir les livraisons |
| `delivery:manage` | Livraison | Gérer les livraisons |
| `food:read` | Food | Voir les commandes |
| `food:manage` | Food | Gérer restaurants et menus |
| `food:orders` | Food | Gérer les commandes |
| `pricing:read` | Pricing | Voir les configs de prix |
| `pricing:configure` | Pricing | Modifier les règles de prix |
| `cities:read` | Villes | Voir les villes |
| `cities:manage` | Villes | Créer, modifier des villes |
| `analytics:read` | Analytics | Dashboards et KPIs |
| `analytics:export` | Analytics | Exporter les rapports |
| `referral:read` | Parrainage | Voir les programmes |
| `referral:manage` | Parrainage | Créer/modifier les programmes |
| `admin:roles` | Admin | Gérer les rôles |
| `admin:permissions` | Admin | Gérer les permissions |
| `admin:users_roles` | Admin | Assigner des rôles |
| `admin:audit_logs` | Admin | Voir les logs d'audit |
| `admin:config` | Admin | Configuration système |
| `notifications:send` | Notifications | Envoyer une notification |
| `notifications:broadcast` | Notifications | Broadcast ville/rôle |

---

*Documentation générée le 6 mars 2026 — SuperApp BF v1.0*
