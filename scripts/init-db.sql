-- SuperApp BF — PostgreSQL Schema Init
-- Exécuté au démarrage du conteneur PostgreSQL
-- TypeORM gère la création des tables via migrations

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- UUID generation
CREATE EXTENSION IF NOT EXISTS "postgis";      -- Géospatial (drivers location)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Recherche textuelle (restaurants, adresses)
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- Index composites plus efficaces

-- ─── Fonctions utilitaires ───────────────────────────────────────────────────

-- Distance Haversine entre deux points GPS (en km)
CREATE OR REPLACE FUNCTION haversine_km(
  lat1 FLOAT, lon1 FLOAT, lat2 FLOAT, lon2 FLOAT
) RETURNS FLOAT LANGUAGE SQL IMMUTABLE AS $$
  SELECT 6371 * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(lat2 - lat1) / 2), 2) +
    COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
    POWER(SIN(RADIANS(lon2 - lon1) / 2), 2)
  ))
$$;

-- Trouver les chauffeurs dans un rayon (optimisé)
CREATE OR REPLACE FUNCTION find_drivers_within_radius(
  center_lat FLOAT,
  center_lon FLOAT,
  radius_km  FLOAT,
  p_city_id  UUID
) RETURNS TABLE(
  id UUID, user_id UUID, vehicle_type TEXT, last_lat FLOAT, last_lng FLOAT,
  distance_km FLOAT, rating NUMERIC
) LANGUAGE SQL STABLE AS $$
  SELECT
    d.id, d.user_id, d.vehicle_type::TEXT,
    d.last_lat, d.last_lng,
    haversine_km(center_lat, center_lon, d.last_lat, d.last_lng) AS distance_km,
    d.rating
  FROM drivers d
  WHERE d.status = 'online'
    AND d.city_id = p_city_id
    AND d.last_lat IS NOT NULL
    AND haversine_km(center_lat, center_lon, d.last_lat, d.last_lng) <= radius_km
  ORDER BY distance_km ASC
  LIMIT 10;
$$;

-- ─── Notes de stratégie de partitionnement ───────────────────────────────────
-- Les tables rides, deliveries, food_orders, wallet_transactions, notifications
-- devraient être partitionnées par RANGE sur created_at.
-- Exemple (exécuter APRÈS création par TypeORM migrations):
--
-- ALTER TABLE rides RENAME TO rides_old;
-- CREATE TABLE rides (LIKE rides_old INCLUDING ALL)
--   PARTITION BY RANGE (created_at);
-- CREATE TABLE rides_2026_01 PARTITION OF rides
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
-- -- etc.
-- INSERT INTO rides SELECT * FROM rides_old;
-- DROP TABLE rides_old;

-- ─── Index PostGIS pour drivers (exécuter après migration TypeORM) ───────────
-- CREATE INDEX IF NOT EXISTS idx_drivers_geoloc
--   ON drivers USING GIST (
--     ST_SetSRID(ST_MakePoint(last_lng, last_lat), 4326)
--   )
--   WHERE status = 'online';

-- ─── Index GIN pour recherche textuelle restaurants ──────────────────────────
-- CREATE INDEX IF NOT EXISTS idx_restaurants_name_trgm
--   ON restaurants USING GIN (name gin_trgm_ops);

-- ─── Données de bootstrap ────────────────────────────────────────────────────
-- (sera surchargé par les seeds NestJS)

INSERT INTO cities (id, name, slug, country_code, currency, status, center_lat, center_lng, radius_km)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Ouagadougou',    'ouagadougou',    'BF', 'XOF', 'active', 12.3647, -1.5333, 30),
  ('550e8400-e29b-41d4-a716-446655440002', 'Bobo-Dioulasso',  'bobo-dioulasso', 'BF', 'XOF', 'active', 11.1771, -4.2979, 25),
  ('550e8400-e29b-41d4-a716-446655440003', 'Koudougou',       'koudougou',      'BF', 'XOF', 'coming_soon', 12.2536, -2.3626, 15)
ON CONFLICT DO NOTHING;

-- Règles de tarification Ouagadougou
INSERT INTO pricing_rules (
  id, city_id, service_type, name,
  base_fare, per_km_rate, per_minute_rate, minimum_fare, maximum_fare,
  surge_multiplier, currency, priority, is_active
) VALUES
  -- MOTO jour (Ouaga)
  ('650e8400-e29b-41d4-a716-446655440001',
   '550e8400-e29b-41d4-a716-446655440001', 'moto', 'Moto Standard Ouaga',
   200, 150, 20, 500, 10000, 1.0, 'XOF', 0, true),
  -- MOTO nuit 22h-6h (Ouaga)
  ('650e8400-e29b-41d4-a716-446655440002',
   '550e8400-e29b-41d4-a716-446655440001', 'moto', 'Moto Nuit Ouaga',
   300, 200, 30, 800, 15000, 1.5, 'XOF', 10, true),
  -- CAR jour (Ouaga)
  ('650e8400-e29b-41d4-a716-446655440003',
   '550e8400-e29b-41d4-a716-446655440001', 'car', 'Voiture Standard Ouaga',
   500, 250, 40, 1000, 20000, 1.0, 'XOF', 0, true)
ON CONFLICT DO NOTHING;

-- Configurations paiement Ouagadougou
INSERT INTO city_payment_configs (
  id, city_id, provider, is_enabled, config, fee_percent, fee_fixed, priority
) VALUES
  ('750e8400-e29b-41d4-a716-446655440001',
   '550e8400-e29b-41d4-a716-446655440001', 'orange_money', true,
   '{"merchant_key": "CHANGE_ME", "environment": "sandbox"}', 0.01, 0, 1),
  ('750e8400-e29b-41d4-a716-446655440002',
   '550e8400-e29b-41d4-a716-446655440001', 'moov_money', true,
   '{"api_key": "CHANGE_ME", "environment": "sandbox"}', 0.01, 0, 2),
  ('750e8400-e29b-41d4-a716-446655440003',
   '550e8400-e29b-41d4-a716-446655440001', 'cash', true, '{}', 0, 0, 99)
ON CONFLICT DO NOTHING;

-- Rôles système
INSERT INTO roles (id, name, slug, description, is_system, is_active) VALUES
  ('850e8400-e29b-41d4-a716-446655440001', 'Super Admin',    'super_admin',    'Accès total à la plateforme', true, true),
  ('850e8400-e29b-41d4-a716-446655440002', 'City Admin',     'city_admin',     'Admin d''une ville spécifique', true, true),
  ('850e8400-e29b-41d4-a716-446655440003', 'Support',        'support',        'Accès lecture et litiges', true, true),
  ('850e8400-e29b-41d4-a716-446655440004', 'Finance',        'finance',        'Accès paiements et wallet', true, true)
ON CONFLICT DO NOTHING;

-- Programme de parrainage global
INSERT INTO referral_programs (
  id, name, city_id, referrer_reward_type, referrer_reward_amount,
  referee_reward_type, referee_reward_amount, trigger_after_trips, is_active
) VALUES (
  '950e8400-e29b-41d4-a716-446655440001',
  'Programme Parrainage Standard', NULL,
  'wallet_credit', 50000,    -- 500 XOF pour le parrain
  'wallet_credit', 25000,    -- 250 XOF pour le filleul
  3,                          -- déclenché après 3 courses
  true
) ON CONFLICT DO NOTHING;
