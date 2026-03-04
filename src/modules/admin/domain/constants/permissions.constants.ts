/**
 * RBAC Permissions Registry
 * ──────────────────────────
 * Source-of-truth pour toutes les permissions disponibles dans le système.
 * Ces constantes sont utilisées :
 *  1. Par le décorateur @RequirePermission() sur les routes
 *  2. Par le script de seed SQL pour initialiser la base
 *  3. Par les tests unitaires
 *
 * Convention de nommage : "RESOURCE:ACTION"
 *  resource = module métier (minuscule)
 *  action   = verbe (minuscule)
 *
 * Ajouter une permission = ajouter une constante ici + seed SQL.
 * Aucune modification de code dans les guards n'est nécessaire.
 */

// ─── Rides ───────────────────────────────────────────────────────────────────
export const PERM_RIDES_READ         = 'rides:read';         // Voir la liste des courses
export const PERM_RIDES_MANAGE       = 'rides:manage';       // Créer, modifier, annuler des courses
export const PERM_RIDES_CANCEL       = 'rides:cancel';       // Annuler une course en cours
export const PERM_RIDES_DISPATCH     = 'rides:dispatch';     // Affecter manuellement un chauffeur

// ─── Drivers ─────────────────────────────────────────────────────────────────
export const PERM_DRIVERS_READ       = 'drivers:read';       // Voir les chauffeurs
export const PERM_DRIVERS_MANAGE     = 'drivers:manage';     // Créer, modifier chauffeurs
export const PERM_DRIVERS_SUSPEND    = 'drivers:suspend';    // Suspendre/réactiver un chauffeur
export const PERM_DRIVERS_KYC        = 'drivers:kyc';        // Valider KYC chauffeur

// ─── Users ───────────────────────────────────────────────────────────────────
export const PERM_USERS_READ         = 'users:read';         // Voir les utilisateurs
export const PERM_USERS_MANAGE       = 'users:manage';       // Créer, modifier
export const PERM_USERS_BAN          = 'users:ban';          // Bannir/débannir un utilisateur
export const PERM_USERS_IMPERSONATE  = 'users:impersonate';  // Connexion au nom d'un user (super admin)

// ─── Payments ────────────────────────────────────────────────────────────────
export const PERM_PAYMENTS_READ      = 'payments:read';      // Voir les paiements
export const PERM_PAYMENTS_REFUND    = 'payments:refund';    // Émettre un remboursement
export const PERM_PAYMENTS_EXPORT    = 'payments:export';    // Exporter les transactions CSV/Excel

// ─── Wallet ──────────────────────────────────────────────────────────────────
export const PERM_WALLET_READ        = 'wallet:read';        // Voir les wallets
export const PERM_WALLET_CREDIT      = 'wallet:credit';      // Créditer manuellement un wallet
export const PERM_WALLET_DEBIT       = 'wallet:debit';       // Débiter manuellement

// ─── Delivery ────────────────────────────────────────────────────────────────
export const PERM_DELIVERY_READ      = 'delivery:read';      // Voir les livraisons
export const PERM_DELIVERY_MANAGE    = 'delivery:manage';    // Gérer les livraisons

// ─── Food ────────────────────────────────────────────────────────────────────
export const PERM_FOOD_READ          = 'food:read';          // Voir les commandes food
export const PERM_FOOD_MANAGE        = 'food:manage';        // Gérer les restaurants, menus
export const PERM_FOOD_ORDERS        = 'food:orders';        // Gérer les commandes

// ─── Pricing ─────────────────────────────────────────────────────────────────
export const PERM_PRICING_READ       = 'pricing:read';       // Voir les configs de prix
export const PERM_PRICING_CONFIGURE  = 'pricing:configure';  // Modifier les règles de pricing

// ─── Cities ──────────────────────────────────────────────────────────────────
export const PERM_CITIES_READ        = 'cities:read';        // Voir les villes
export const PERM_CITIES_MANAGE      = 'cities:manage';      // Créer, modifier des villes

// ─── Analytics ───────────────────────────────────────────────────────────────
export const PERM_ANALYTICS_READ     = 'analytics:read';     // Dashboards et KPIs
export const PERM_ANALYTICS_EXPORT   = 'analytics:export';   // Exporter les rapports

// ─── Referral ────────────────────────────────────────────────────────────────
export const PERM_REFERRAL_READ      = 'referral:read';      // Voir les programmes de parrainage
export const PERM_REFERRAL_MANAGE    = 'referral:manage';    // Créer/modifier les programmes

// ─── Admin / RBAC ──────────────────────────────────────────────────────────
export const PERM_ADMIN_ROLES        = 'admin:roles';        // Gérer les rôles
export const PERM_ADMIN_PERMISSIONS  = 'admin:permissions';  // Gérer les permissions
export const PERM_ADMIN_USERS_ROLES  = 'admin:users_roles';  // Assigner des rôles aux users
export const PERM_ADMIN_AUDIT_LOGS   = 'admin:audit_logs';   // Voir les logs d'audit
export const PERM_ADMIN_CONFIG       = 'admin:config';       // Configuration système globale

// ─── Notifications ───────────────────────────────────────────────────────────
export const PERM_NOTIF_SEND         = 'notifications:send';      // Envoyer notif individuelle
export const PERM_NOTIF_BROADCAST    = 'notifications:broadcast'; // Broadcast par ville/rôle

// ─────────────────────────────────────────────────────────────────────────────
// Matrice des permissions par rôle système
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Permissions par rôle système.
 * Utilisé par le script de seed SQL pour pré-remplir role_permissions.
 *
 * ⚠ Ces listes sont la DÉFINITION des rôles système.
 * Les rôles custom créés en DB peuvent avoir des permissions différentes.
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  // ── Super Admin ─────────────────────────────────────────────────────────
  // Toutes les permissions. Non modifiable.
  super_admin: [
    PERM_RIDES_READ,   PERM_RIDES_MANAGE,   PERM_RIDES_CANCEL,   PERM_RIDES_DISPATCH,
    PERM_DRIVERS_READ, PERM_DRIVERS_MANAGE, PERM_DRIVERS_SUSPEND, PERM_DRIVERS_KYC,
    PERM_USERS_READ,   PERM_USERS_MANAGE,   PERM_USERS_BAN,      PERM_USERS_IMPERSONATE,
    PERM_PAYMENTS_READ, PERM_PAYMENTS_REFUND, PERM_PAYMENTS_EXPORT,
    PERM_WALLET_READ, PERM_WALLET_CREDIT, PERM_WALLET_DEBIT,
    PERM_DELIVERY_READ, PERM_DELIVERY_MANAGE,
    PERM_FOOD_READ, PERM_FOOD_MANAGE, PERM_FOOD_ORDERS,
    PERM_PRICING_READ, PERM_PRICING_CONFIGURE,
    PERM_CITIES_READ, PERM_CITIES_MANAGE,
    PERM_ANALYTICS_READ, PERM_ANALYTICS_EXPORT,
    PERM_REFERRAL_READ, PERM_REFERRAL_MANAGE,
    PERM_ADMIN_ROLES, PERM_ADMIN_PERMISSIONS, PERM_ADMIN_USERS_ROLES,
    PERM_ADMIN_AUDIT_LOGS, PERM_ADMIN_CONFIG,
    PERM_NOTIF_SEND, PERM_NOTIF_BROADCAST,
  ],

  // ── City Admin ──────────────────────────────────────────────────────────
  // Gestion complète d'une ville (scope=CITY)
  city_admin: [
    PERM_RIDES_READ,   PERM_RIDES_MANAGE,   PERM_RIDES_CANCEL,   PERM_RIDES_DISPATCH,
    PERM_DRIVERS_READ, PERM_DRIVERS_MANAGE, PERM_DRIVERS_SUSPEND, PERM_DRIVERS_KYC,
    PERM_USERS_READ,   PERM_USERS_MANAGE,   PERM_USERS_BAN,
    PERM_PAYMENTS_READ, PERM_PAYMENTS_REFUND,
    PERM_WALLET_READ, PERM_WALLET_CREDIT,
    PERM_DELIVERY_READ, PERM_DELIVERY_MANAGE,
    PERM_FOOD_READ, PERM_FOOD_MANAGE, PERM_FOOD_ORDERS,
    PERM_PRICING_READ, PERM_PRICING_CONFIGURE,
    PERM_ANALYTICS_READ,
    PERM_REFERRAL_READ,
    PERM_NOTIF_SEND, PERM_NOTIF_BROADCAST,
    PERM_ADMIN_AUDIT_LOGS,
  ],

  // ── Manager ─────────────────────────────────────────────────────────────
  // Opérations quotidiennes d'une ville (pas de config pricing ni ban)
  manager: [
    PERM_RIDES_READ,   PERM_RIDES_MANAGE,   PERM_RIDES_CANCEL,   PERM_RIDES_DISPATCH,
    PERM_DRIVERS_READ, PERM_DRIVERS_MANAGE, PERM_DRIVERS_SUSPEND,
    PERM_USERS_READ,
    PERM_PAYMENTS_READ,
    PERM_WALLET_READ,
    PERM_DELIVERY_READ, PERM_DELIVERY_MANAGE,
    PERM_FOOD_READ, PERM_FOOD_ORDERS,
    PERM_PRICING_READ,
    PERM_ANALYTICS_READ,
    PERM_NOTIF_SEND,
  ],

  // ── Support ─────────────────────────────────────────────────────────────
  // Lecture + remboursements + annulations correctives
  support: [
    PERM_RIDES_READ, PERM_RIDES_CANCEL,
    PERM_DRIVERS_READ,
    PERM_USERS_READ,
    PERM_PAYMENTS_READ, PERM_PAYMENTS_REFUND,
    PERM_WALLET_READ, PERM_WALLET_CREDIT,
    PERM_DELIVERY_READ,
    PERM_FOOD_READ, PERM_FOOD_ORDERS,
    PERM_NOTIF_SEND,
  ],

  // ── Finance ─────────────────────────────────────────────────────────────
  // Lecture financière étendue + exports (scope=GLOBAL)
  finance: [
    PERM_PAYMENTS_READ, PERM_PAYMENTS_REFUND, PERM_PAYMENTS_EXPORT,
    PERM_WALLET_READ, PERM_WALLET_CREDIT, PERM_WALLET_DEBIT,
    PERM_ANALYTICS_READ, PERM_ANALYTICS_EXPORT,
    PERM_REFERRAL_READ,
    PERM_RIDES_READ,
    PERM_DELIVERY_READ,
    PERM_FOOD_READ,
  ],

  // ── Analyste ────────────────────────────────────────────────────────────
  // Lecture seule + exports analytics (scope=GLOBAL)
  analyste: [
    PERM_ANALYTICS_READ, PERM_ANALYTICS_EXPORT,
    PERM_RIDES_READ,
    PERM_DRIVERS_READ,
    PERM_USERS_READ,
    PERM_PAYMENTS_READ,
    PERM_DELIVERY_READ,
    PERM_FOOD_READ,
    PERM_REFERRAL_READ,
    PERM_PRICING_READ,
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Tous les slugs disponibles (utilisé pour validation DTO)
// ─────────────────────────────────────────────────────────────────────────────
export const ALL_PERMISSION_SLUGS = [
  PERM_RIDES_READ,   PERM_RIDES_MANAGE,   PERM_RIDES_CANCEL,    PERM_RIDES_DISPATCH,
  PERM_DRIVERS_READ, PERM_DRIVERS_MANAGE, PERM_DRIVERS_SUSPEND, PERM_DRIVERS_KYC,
  PERM_USERS_READ,   PERM_USERS_MANAGE,   PERM_USERS_BAN,       PERM_USERS_IMPERSONATE,
  PERM_PAYMENTS_READ, PERM_PAYMENTS_REFUND, PERM_PAYMENTS_EXPORT,
  PERM_WALLET_READ, PERM_WALLET_CREDIT, PERM_WALLET_DEBIT,
  PERM_DELIVERY_READ, PERM_DELIVERY_MANAGE,
  PERM_FOOD_READ, PERM_FOOD_MANAGE, PERM_FOOD_ORDERS,
  PERM_PRICING_READ, PERM_PRICING_CONFIGURE,
  PERM_CITIES_READ, PERM_CITIES_MANAGE,
  PERM_ANALYTICS_READ, PERM_ANALYTICS_EXPORT,
  PERM_REFERRAL_READ, PERM_REFERRAL_MANAGE,
  PERM_ADMIN_ROLES, PERM_ADMIN_PERMISSIONS, PERM_ADMIN_USERS_ROLES,
  PERM_ADMIN_AUDIT_LOGS, PERM_ADMIN_CONFIG,
  PERM_NOTIF_SEND, PERM_NOTIF_BROADCAST,
] as const;

export type PermissionSlug = (typeof ALL_PERMISSION_SLUGS)[number];
