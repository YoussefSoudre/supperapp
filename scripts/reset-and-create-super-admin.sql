-- ============================================================
-- SCRIPT COMPLET : RESET + CRÉATION SUPER ADMIN GLOBAL
-- ============================================================
-- Ce script fait tout en une seule exécution :
--   1. Supprime TOUTES les données des tables RBAC
--   2. Crée les rôles et permissions
--   3. Crée le super admin global
--
-- ⚠️  ATTENTION : Ceci efface TOUTES les données !
-- ============================================================

DO $$
DECLARE
  -- ┌──────────────────────────────────────────────────────────┐
  -- │  📝 PERSONNALISEZ VOS IDENTIFIANTS ICI                   │
  -- └──────────────────────────────────────────────────────────┘
  v_phone       VARCHAR := '+22670000001';
  v_email       VARCHAR := 'admin@superapp.bf';
  v_first_name  VARCHAR := 'Super';
  v_last_name   VARCHAR := 'Admin';
  v_password_hash VARCHAR := '$2b$12$yXp1jnNii2SLeQSBtDy5ueAkAg9UjEycDngF5M8LUkKwKyEk/K4UG'; -- Admin@2026!

  v_user_id        UUID;
  v_role_id        UUID;
  v_global_city_id UUID;
BEGIN

  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════╗';
  RAISE NOTICE '║         🗑️  NETTOYAGE DE LA BASE DE DONNÉES        ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- ═══════════════════════════════════════════════════════════
  -- PARTIE 1 : NETTOYAGE (dans l'ordre des dépendances)
  -- ═══════════════════════════════════════════════════════════
  
  -- Supprimer les relations user_roles (dépend de users et roles)
  DELETE FROM user_roles;
  RAISE NOTICE '✅ user_roles vidée';

  -- Supprimer les utilisateurs (sauf si on veut garder les vrais users)
  DELETE FROM users;
  RAISE NOTICE '✅ users vidée';

  -- Supprimer les relations role_permissions
  DELETE FROM role_permissions;
  RAISE NOTICE '✅ role_permissions vidée';

  -- Supprimer les rôles
  DELETE FROM roles;
  RAISE NOTICE '✅ roles vidée';

  -- Supprimer les permissions
  DELETE FROM permissions;
  RAISE NOTICE '✅ permissions vidée';

  -- Supprimer la ville système GLOBAL si elle existe
  DELETE FROM cities WHERE slug = 'global-system';
  RAISE NOTICE '✅ ville système GLOBAL supprimée';

  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════╗';
  RAISE NOTICE '║         📋 CRÉATION DES RÔLES ET PERMISSIONS       ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- ═══════════════════════════════════════════════════════════
  -- PARTIE 2 : CRÉATION DES RÔLES
  -- ═══════════════════════════════════════════════════════════
  
  INSERT INTO roles (id, name, slug, scope, description, color, is_system, is_active)
  VALUES
    (gen_random_uuid(), 'Super Admin',  'super_admin', 'global', 'Accès total à la plateforme, toutes villes.',           '#EF4444', true, true),
    (gen_random_uuid(), 'City Admin',   'city_admin',  'city',   'Admin d''une ville : gestion complète.',                 '#F97316', true, true),
    (gen_random_uuid(), 'Manager',      'manager',     'city',   'Opérations quotidiennes d''une ville.',                  '#EAB308', true, true),
    (gen_random_uuid(), 'Support',      'support',     'city',   'Support client : lecture + annulations + remboursements.','#22C55E', true, true),
    (gen_random_uuid(), 'Finance',      'finance',     'city',   'Comptabilité et rapports financiers, scopé par ville.',  '#06B6D4', true, true),
    (gen_random_uuid(), 'Analyste',     'analyste',    'city',   'Lecture analytics, scopé par ville assignée.',           '#8B5CF6', true, true);

  RAISE NOTICE '✅ 6 rôles créés';

  -- ═══════════════════════════════════════════════════════════
  -- PARTIE 3 : CRÉATION DES PERMISSIONS
  -- ═══════════════════════════════════════════════════════════
  
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
    (gen_random_uuid(), 'notifications:broadcast', 'notifications', 'broadcast', 'Broadcast par ville ou rôle',          true);

  RAISE NOTICE '✅ 38 permissions créées';

  -- ═══════════════════════════════════════════════════════════
  -- PARTIE 4 : MATRICE RÔLE ↔ PERMISSIONS
  -- ═══════════════════════════════════════════════════════════
  
  WITH r AS (SELECT id, slug FROM roles),
       p AS (SELECT id, slug FROM permissions)
  INSERT INTO role_permissions (id, role_id, permission_id, granted_by)
  SELECT gen_random_uuid(), r.id, p.id, NULL
  FROM (VALUES
    -- super_admin — TOUTES les permissions
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
  JOIN p ON p.slug = t.perm_slug;

  RAISE NOTICE '✅ Matrice rôles-permissions créée';

  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════╗';
  RAISE NOTICE '║         👤 CRÉATION DU SUPER ADMIN GLOBAL          ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- ═══════════════════════════════════════════════════════════
  -- PARTIE 5 : CRÉATION DE LA VILLE SYSTÈME GLOBAL
  -- ═══════════════════════════════════════════════════════════
  
  INSERT INTO cities (
    id, name, slug, country_code, currency, status,
    center_lat, center_lng, radius_km,
    created_at, updated_at
  )
  VALUES (
    gen_random_uuid(),
    'GLOBAL - Système',
    'global-system',
    'BF', 'XOF', 'active',
    12.3714277, -1.5196603, 99999,
    NOW(), NOW()
  )
  RETURNING id INTO v_global_city_id;

  RAISE NOTICE '✅ Ville système GLOBAL créée : %', v_global_city_id;

  -- ═══════════════════════════════════════════════════════════
  -- PARTIE 6 : CRÉATION DE L'UTILISATEUR SUPER ADMIN
  -- ═══════════════════════════════════════════════════════════
  
  SELECT id INTO v_role_id FROM roles WHERE slug = 'super_admin';

  INSERT INTO users (
    id, phone, email, password_hash, 
    first_name, last_name, status, kyc_verified,
    city_id, referral_code, phone_verified,
    created_at, updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_phone, v_email, v_password_hash,
    v_first_name, v_last_name, 'active', true,
    v_global_city_id,
    'ADMIN-' || upper(substring(md5(random()::text), 1, 6)),
    true,
    NOW(), NOW()
  )
  RETURNING id INTO v_user_id;

  RAISE NOTICE '✅ Utilisateur créé : % % (%, %)', v_first_name, v_last_name, v_phone, v_email;
  RAISE NOTICE '   ID : %', v_user_id;

  -- ═══════════════════════════════════════════════════════════
  -- PARTIE 7 : ASSIGNATION DU RÔLE SUPER_ADMIN (GLOBAL)
  -- ═══════════════════════════════════════════════════════════
  
  INSERT INTO user_roles (
    id, user_id, role_id, city_id,
    granted_by, expires_at, is_active, 
    reason, granted_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id, v_role_id, NULL,  -- city_id = NULL → SCOPE GLOBAL
    v_user_id, NULL, true,
    'Bootstrap super_admin GLOBAL',
    NOW()
  );

  RAISE NOTICE '✅ Rôle super_admin GLOBAL assigné';

  -- ═══════════════════════════════════════════════════════════
  -- RÉSUMÉ FINAL
  -- ═══════════════════════════════════════════════════════════
  
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════╗';
  RAISE NOTICE '║          ✨ SUPER ADMIN CRÉÉ AVEC SUCCÈS ✨         ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 IDENTIFIANTS DE CONNEXION :';
  RAISE NOTICE '   📞 Téléphone    : %', v_phone;
  RAISE NOTICE '   📧 Email        : %', v_email;
  RAISE NOTICE '   🔑 Mot de passe : Admin@2026!';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Permissions : TOUTES (38 permissions)';
  RAISE NOTICE '🌐 Scope       : GLOBAL (toutes les villes)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT : Changez le mot de passe après connexion !';
  RAISE NOTICE '';

END $$;

-- ═══════════════════════════════════════════════════════════
-- VÉRIFICATION FINALE
-- ═══════════════════════════════════════════════════════════

SELECT 
  '✅ SUPER ADMIN' as statut,
  u.id,
  u.phone,
  u.email,
  u.first_name || ' ' || u.last_name as nom_complet,
  r.name as role,
  r.scope,
  CASE 
    WHEN ur.city_id IS NULL THEN '🌐 GLOBAL (toutes villes)'
    ELSE '🏙️ Ville: ' || c.name
  END as portee,
  (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id) as nb_permissions
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
LEFT JOIN cities c ON ur.city_id = c.id
WHERE r.slug = 'super_admin';
