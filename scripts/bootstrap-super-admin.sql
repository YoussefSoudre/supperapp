-- ============================================================
-- Bootstrap Super Admin
-- Utilisateur : df227b15-aec2-403f-9a6a-e7b5aea0f730
--               Angela Kaboré (+22671896548)
--
-- Opérations :
--   1. Assigne le rôle super_admin (scope=GLOBAL, city_id=NULL)
--   2. Assigne TOUTES les permissions directement à cet utilisateur
--      (redondant avec le rôle, mais garantit un accès même si la
--       matrice role_permissions devait être réinitialisée)
-- ============================================================

DO $$
DECLARE
  v_user_id   UUID := 'df227b15-aec2-403f-9a6a-e7b5aea0f730';
  v_role_id   UUID;
BEGIN

  -- ─── 1. Récupérer l'ID du rôle super_admin ─────────────────────────────
  SELECT id INTO v_role_id FROM roles WHERE slug = 'super_admin';

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Rôle super_admin introuvable. Exécuter seed-rbac.sql d''abord.';
  END IF;

  -- ─── 2. Assigner le rôle super_admin (idempotent) ──────────────────────
  INSERT INTO user_roles (
    id, user_id, role_id, city_id,
    granted_by, expires_at, is_active, reason, granted_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    v_role_id,
    NULL,                              -- scope GLOBAL → city_id NULL
    v_user_id,                         -- auto-bootstrap
    NULL,                              -- permanent
    true,
    'Bootstrap super_admin initial',
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Rôle super_admin assigné à %', v_user_id;

END $$;
