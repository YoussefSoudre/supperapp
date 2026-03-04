-- ============================================================
-- Migration : system_announcements
-- ============================================================
-- Crée la table des annonces système et ajoute les permissions
-- RBAC associées.
--
-- Idempotent (ON CONFLICT DO NOTHING).
-- Exécuter APRÈS le seed-rbac.sql initial.
-- ============================================================

BEGIN;

-- ─── 1. TABLE system_announcements ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_announcements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by          UUID        NOT NULL,
  title               VARCHAR(250) NOT NULL,
  content             TEXT         NOT NULL,
  short_description   VARCHAR(100),

  type   VARCHAR(20)  NOT NULL DEFAULT 'info'
    CHECK (type   IN ('info','maintenance','promotion','alert','update')),

  status VARCHAR(20)  NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','archived')),

  scope  VARCHAR(10)  NOT NULL DEFAULT 'global'
    CHECK (scope  IN ('global','city')),

  city_id             UUID,          -- null si scope = 'global'
  channels            JSONB  NOT NULL DEFAULT '["push","in_app","websocket"]',
  pinned              BOOLEAN NOT NULL DEFAULT false,
  action_url          TEXT,

  -- Média associé (image ou vidéo)
  media_url           TEXT,          -- URL publique (CDN ou local)
  media_type          VARCHAR(10)    -- 'image' | 'video'
    CHECK (media_type IN ('image', 'video')),
  media_thumbnail_url TEXT,          -- vignette pour les vidéos

  metadata            JSONB,
  target_roles        JSONB,         -- ex: ["user","driver"]
  published_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  broadcast_id        UUID,          -- référence BullMQ broadcast

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_ann_status_scope
  ON system_announcements (status, scope);

CREATE INDEX IF NOT EXISTS idx_ann_city_status
  ON system_announcements (city_id, status);

CREATE INDEX IF NOT EXISTS idx_ann_published_at
  ON system_announcements (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_ann_expires_at
  ON system_announcements (expires_at)
  WHERE expires_at IS NOT NULL;

-- Trigger updated_at automatique
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_system_announcements_updated_at'
  ) THEN
    CREATE TRIGGER trg_system_announcements_updated_at
      BEFORE UPDATE ON system_announcements
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;

-- ─── 2. PERMISSIONS RBAC ──────────────────────────────────────────────────

INSERT INTO permissions (id, slug, resource, action, description, "isActive")
VALUES
  (gen_random_uuid(), 'announcements:read',   'announcements', 'read',   'Lire toutes les annonces système (admin)',          true),
  (gen_random_uuid(), 'announcements:manage', 'announcements', 'manage', 'Créer, publier et archiver des annonces système',   true)
ON CONFLICT (slug) DO NOTHING;

-- ─── 3. ATTRIBUTION AUX RÔLES SYSTÈME ────────────────────────────────────
-- super_admin → announcements:read + announcements:manage
-- city_admin  → announcements:read + announcements:manage (scope ville)

INSERT INTO role_permissions (id, "roleId", "permissionId")
SELECT
  gen_random_uuid(),
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE
  r.slug IN ('super_admin', 'city_admin')
  AND p.slug IN ('announcements:read', 'announcements:manage')
ON CONFLICT DO NOTHING;

COMMIT;
