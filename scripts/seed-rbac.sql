-- ============================================================
-- RBAC Seed — Rôles, Permissions, Matrice role_permissions
-- ============================================================
-- Exécuter après la création des tables (migration TypeORM).
-- Idempotent : ON CONFLICT DO NOTHING sur tous les inserts.
-- ============================================================

BEGIN;

-- ─── 1. ROLES ─────────────────────────────────────────────────────────────
INSERT INTO roles (id, name, slug, scope, description, color, is_system, is_active)
VALUES
  (gen_random_uuid(), 'Super Admin',  'super_admin', 'global', 'Accès total à la plateforme, toutes villes.',           '#EF4444', true, true),
  (gen_random_uuid(), 'City Admin',   'city_admin',  'city',   'Admin d''une ville : gestion complète.',                 '#F97316', true, true),
  (gen_random_uuid(), 'Manager',      'manager',     'city',   'Opérations quotidiennes d''une ville.',                  '#EAB308', true, true),
  (gen_random_uuid(), 'Support',      'support',     'city',   'Support client : lecture + annulations + remboursements.','#22C55E', true, true),
  (gen_random_uuid(), 'Finance',      'finance',     'city',   'Comptabilité et rapports financiers, scopé par ville.',  '#06B6D4', true, true),
  (gen_random_uuid(), 'Analyste',     'analyste',    'city',   'Lecture analytics, scopé par ville assignée.',           '#8B5CF6', true, true)
ON CONFLICT (slug) DO NOTHING;

-- ─── 2. PERMISSIONS ───────────────────────────────────────────────────────
INSERT INTO permissions (id, slug, resource, action, description, is_active)
VALUES
  -- Rides
  (gen_random_uuid(), 'rides:read',        'rides',        'read',      'Voir la liste des courses',                   true),
  (gen_random_uuid(), 'rides:manage',      'rides',        'manage',    'Créer, modifier des courses',                 true),
  (gen_random_uuid(), 'rides:cancel',      'rides',        'cancel',    'Annuler une course en cours',                 true),
  (gen_random_uuid(), 'rides:dispatch',    'rides',        'dispatch',  'Affecter manuellement un chauffeur',          true),

  -- Drivers
  (gen_random_uuid(), 'drivers:read',      'drivers',      'read',      'Voir les chauffeurs',                         true),
  (gen_random_uuid(), 'drivers:manage',    'drivers',      'manage',    'Créer, modifier chauffeurs',                  true),
  (gen_random_uuid(), 'drivers:suspend',   'drivers',      'suspend',   'Suspendre/réactiver un chauffeur',            true),
  (gen_random_uuid(), 'drivers:kyc',       'drivers',      'kyc',       'Valider KYC chauffeur',                       true),

  -- Users
  (gen_random_uuid(), 'users:read',        'users',        'read',      'Voir les utilisateurs',                       true),
  (gen_random_uuid(), 'users:manage',      'users',        'manage',    'Créer, modifier des utilisateurs',            true),
  (gen_random_uuid(), 'users:ban',         'users',        'ban',       'Bannir/débannir un utilisateur',              true),
  (gen_random_uuid(), 'users:impersonate', 'users',        'impersonate','Connexion au nom d''un utilisateur',          true),

  -- Payments
  (gen_random_uuid(), 'payments:read',     'payments',     'read',      'Voir les paiements',                          true),
  (gen_random_uuid(), 'payments:refund',   'payments',     'refund',    'Émettre un remboursement',                    true),
  (gen_random_uuid(), 'payments:export',   'payments',     'export',    'Exporter les transactions CSV/Excel',         true),

  -- Wallet
  (gen_random_uuid(), 'wallet:read',       'wallet',       'read',      'Voir les wallets',                            true),
  (gen_random_uuid(), 'wallet:credit',     'wallet',       'credit',    'Créditer manuellement un wallet',             true),
  (gen_random_uuid(), 'wallet:debit',      'wallet',       'debit',     'Débiter manuellement un wallet',              true),

  -- Delivery
  (gen_random_uuid(), 'delivery:read',     'delivery',     'read',      'Voir les livraisons',                         true),
  (gen_random_uuid(), 'delivery:manage',   'delivery',     'manage',    'Gérer les livraisons',                        true),

  -- Food
  (gen_random_uuid(), 'food:read',         'food',         'read',      'Voir les commandes food',                     true),
  (gen_random_uuid(), 'food:manage',       'food',         'manage',    'Gérer restaurants et menus',                  true),
  (gen_random_uuid(), 'food:orders',       'food',         'orders',    'Gérer les commandes',                         true),

  -- Pricing
  (gen_random_uuid(), 'pricing:read',      'pricing',      'read',      'Voir les configs de prix',                    true),
  (gen_random_uuid(), 'pricing:configure', 'pricing',      'configure', 'Modifier les règles de pricing',             true),

  -- Cities
  (gen_random_uuid(), 'cities:read',       'cities',       'read',      'Voir les villes',                             true),
  (gen_random_uuid(), 'cities:manage',     'cities',       'manage',    'Créer, modifier des villes',                  true),

  -- Analytics
  (gen_random_uuid(), 'analytics:read',    'analytics',    'read',      'Dashboards et KPIs',                          true),
  (gen_random_uuid(), 'analytics:export',  'analytics',    'export',    'Exporter les rapports',                       true),

  -- Referral
  (gen_random_uuid(), 'referral:read',     'referral',     'read',      'Voir les programmes de parrainage',           true),
  (gen_random_uuid(), 'referral:manage',   'referral',     'manage',    'Créer/modifier les programmes de parrainage', true),

  -- Admin RBAC
  (gen_random_uuid(), 'admin:roles',       'admin',        'roles',     'Gérer les rôles',                             true),
  (gen_random_uuid(), 'admin:permissions', 'admin',        'permissions','Gérer les permissions',                      true),
  (gen_random_uuid(), 'admin:users_roles', 'admin',        'users_roles','Assigner des rôles aux utilisateurs',        true),
  (gen_random_uuid(), 'admin:audit_logs',  'admin',        'audit_logs','Voir les logs d''audit',                       true),
  (gen_random_uuid(), 'admin:config',      'admin',        'config',    'Configuration système globale',               true),

  -- Notifications
  (gen_random_uuid(), 'notifications:send',      'notifications', 'send',      'Envoyer une notification individuelle', true),
  (gen_random_uuid(), 'notifications:broadcast', 'notifications', 'broadcast', 'Broadcast par ville ou rôle',          true)
ON CONFLICT (slug) DO NOTHING;

-- ─── 3. ROLE_PERMISSIONS ─────────────────────────────────────────────────
-- Helper CTE pour lisibilité : on associe les slugs aux IDs
WITH r AS (SELECT id, slug FROM roles),
     p AS (SELECT id, slug FROM permissions)

INSERT INTO role_permissions (id, role_id, permission_id, granted_by)
SELECT gen_random_uuid(), r.id, p.id, NULL
FROM (VALUES
  -- super_admin  — toutes les permissions
  ('super_admin','rides:read'),        ('super_admin','rides:manage'),
  ('super_admin','rides:cancel'),      ('super_admin','rides:dispatch'),
  ('super_admin','drivers:read'),      ('super_admin','drivers:manage'),
  ('super_admin','drivers:suspend'),   ('super_admin','drivers:kyc'),
  ('super_admin','users:read'),        ('super_admin','users:manage'),
  ('super_admin','users:ban'),         ('super_admin','users:impersonate'),
  ('super_admin','payments:read'),     ('super_admin','payments:refund'),
  ('super_admin','payments:export'),
  ('super_admin','wallet:read'),       ('super_admin','wallet:credit'),
  ('super_admin','wallet:debit'),
  ('super_admin','delivery:read'),     ('super_admin','delivery:manage'),
  ('super_admin','food:read'),         ('super_admin','food:manage'),
  ('super_admin','food:orders'),
  ('super_admin','pricing:read'),      ('super_admin','pricing:configure'),
  ('super_admin','cities:read'),       ('super_admin','cities:manage'),
  ('super_admin','analytics:read'),    ('super_admin','analytics:export'),
  ('super_admin','referral:read'),     ('super_admin','referral:manage'),
  ('super_admin','admin:roles'),       ('super_admin','admin:permissions'),
  ('super_admin','admin:users_roles'), ('super_admin','admin:audit_logs'),
  ('super_admin','admin:config'),
  ('super_admin','notifications:send'),('super_admin','notifications:broadcast'),

  -- city_admin
  ('city_admin','rides:read'),         ('city_admin','rides:manage'),
  ('city_admin','rides:cancel'),       ('city_admin','rides:dispatch'),
  ('city_admin','drivers:read'),       ('city_admin','drivers:manage'),
  ('city_admin','drivers:suspend'),    ('city_admin','drivers:kyc'),
  ('city_admin','users:read'),         ('city_admin','users:manage'),
  ('city_admin','users:ban'),
  ('city_admin','payments:read'),      ('city_admin','payments:refund'),
  ('city_admin','wallet:read'),        ('city_admin','wallet:credit'),
  ('city_admin','delivery:read'),      ('city_admin','delivery:manage'),
  ('city_admin','food:read'),          ('city_admin','food:manage'),
  ('city_admin','food:orders'),
  ('city_admin','pricing:read'),       ('city_admin','pricing:configure'),
  ('city_admin','analytics:read'),
  ('city_admin','referral:read'),
  ('city_admin','notifications:send'), ('city_admin','notifications:broadcast'),
  ('city_admin','admin:audit_logs'),

  -- manager
  ('manager','rides:read'),    ('manager','rides:manage'),
  ('manager','rides:cancel'),  ('manager','rides:dispatch'),
  ('manager','drivers:read'),  ('manager','drivers:manage'),
  ('manager','drivers:suspend'),
  ('manager','users:read'),
  ('manager','payments:read'),
  ('manager','wallet:read'),
  ('manager','delivery:read'), ('manager','delivery:manage'),
  ('manager','food:read'),     ('manager','food:orders'),
  ('manager','pricing:read'),
  ('manager','analytics:read'),
  ('manager','notifications:send'),

  -- support
  ('support','rides:read'),    ('support','rides:cancel'),
  ('support','drivers:read'),
  ('support','users:read'),
  ('support','payments:read'), ('support','payments:refund'),
  ('support','wallet:read'),   ('support','wallet:credit'),
  ('support','delivery:read'),
  ('support','food:read'),     ('support','food:orders'),
  ('support','notifications:send'),

  -- finance
  ('finance','payments:read'),   ('finance','payments:refund'),
  ('finance','payments:export'),
  ('finance','wallet:read'),     ('finance','wallet:credit'),
  ('finance','wallet:debit'),
  ('finance','analytics:read'),  ('finance','analytics:export'),
  ('finance','referral:read'),
  ('finance','rides:read'),
  ('finance','delivery:read'),
  ('finance','food:read'),

  -- analyste
  ('analyste','analytics:read'),  ('analyste','analytics:export'),
  ('analyste','rides:read'),
  ('analyste','drivers:read'),
  ('analyste','users:read'),
  ('analyste','payments:read'),
  ('analyste','delivery:read'),
  ('analyste','food:read'),
  ('analyste','referral:read'),
  ('analyste','pricing:read')

) AS t(role_slug, perm_slug)
JOIN r ON r.slug = t.role_slug
JOIN p ON p.slug = t.perm_slug
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
