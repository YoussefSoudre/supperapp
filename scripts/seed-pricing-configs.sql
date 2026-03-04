-- =============================================================================
-- Seed : city_pricing_configs — Moteur de pricing dynamique
-- =============================================================================
-- Remplacer <CITY_UUID_OUAGA> par l'UUID réel de la ville dans la table cities.
-- Ce script configure toutes les règles pour le service 'moto' à Ouagadougou.
-- Pour chaque ville/service, dupliquer les blocs en changeant cityId et params.
-- =============================================================================

-- Crée la table si elle n'existe pas encore (synchronize TypeORM la créera
-- automatiquement, mais ce script peut être utilisé en migration manuelle).

-- ────────────────────────────────────────────────────────────────────────────
-- Ouagadougou — SERVICE : moto
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_city UUID := '<CITY_UUID_OUAGA>';
  v_svc  TEXT := 'moto';
BEGIN

  -- 1. Tarif de base
  INSERT INTO city_pricing_configs
    (id, city_id, service_type, rule_key, name, params, conditions, priority, is_active)
  VALUES (
    gen_random_uuid(), v_city, v_svc,
    'base_fare', 'Tarif de prise en charge',
    '{"amount": 500, "currency": "XOF", "minimumFare": 700}'::jsonb,
    NULL, 1, true
  ) ON CONFLICT DO NOTHING;

  -- 2. Prix par kilomètre
  INSERT INTO city_pricing_configs
    (id, city_id, service_type, rule_key, name, params, conditions, priority, is_active)
  VALUES (
    gen_random_uuid(), v_city, v_svc,
    'per_km', 'Tarif kilométrique',
    '{"ratePerKm": 150}'::jsonb,
    NULL, 5, true
  ) ON CONFLICT DO NOTHING;

  -- 3. Prix par minute
  INSERT INTO city_pricing_configs
    (id, city_id, service_type, rule_key, name, params, conditions, priority, is_active)
  VALUES (
    gen_random_uuid(), v_city, v_svc,
    'per_minute', 'Tarif temporel',
    '{"ratePerMinute": 15}'::jsonb,
    NULL, 6, true
  ) ON CONFLICT DO NOTHING;

  -- 4. Surge dynamique (heures de pointe + demande)
  INSERT INTO city_pricing_configs
    (id, city_id, service_type, rule_key, name, params, conditions, priority, is_active)
  VALUES (
    gen_random_uuid(), v_city, v_svc,
    'dynamic_surge', 'Surge heures de pointe',
    '{
      "peakHours": [{"start": 7, "end": 9}, {"start": 17, "end": 20}],
      "peakMultiplier": 1.4,
      "demandThreshold": 1.2,
      "demandMultiplierMax": 2.5
    }'::jsonb,
    NULL, 20, true
  ) ON CONFLICT DO NOTHING;

  -- 5. Surge statique manuel (désactivé par défaut — activer lors d'événements)
  INSERT INTO city_pricing_configs
    (id, city_id, service_type, rule_key, name, params, conditions, priority, is_active)
  VALUES (
    gen_random_uuid(), v_city, v_svc,
    'surge', 'Surge soirée weekend',
    '{"multiplier": 1.5}'::jsonb,
    '{"time": {"start": "22:00", "end": "02:00"}, "days": [5, 6, 7]}'::jsonb,
    25, false   -- désactivé, activer via PATCH /pricing/admin/configs/:id/toggle
  ) ON CONFLICT DO NOTHING;

  -- 6. Réduction covoiturage
  INSERT INTO city_pricing_configs
    (id, city_id, service_type, rule_key, name, params, conditions, priority, is_active)
  VALUES (
    gen_random_uuid(), v_city, v_svc,
    'carpool_discount', 'Réduction covoiturage',
    '{"discountPerPassenger": 0.10, "maxDiscountRate": 0.40, "maxPassengers": 4}'::jsonb,
    '{"minPassengers": 2}'::jsonb,
    40, true
  ) ON CONFLICT DO NOTHING;

  -- 7. Commission plateforme (doit s'exécuter en dernier — priority 90)
  INSERT INTO city_pricing_configs
    (id, city_id, service_type, rule_key, name, params, conditions, priority, is_active)
  VALUES (
    gen_random_uuid(), v_city, v_svc,
    'platform_commission', 'Commission plateforme 15%',
    '{"rate": 0.15}'::jsonb,
    NULL, 90, true
  ) ON CONFLICT DO NOTHING;

  -- 8. Frais d'annulation (s'active uniquement si isCancellation = true)
  INSERT INTO city_pricing_configs
    (id, city_id, service_type, rule_key, name, params, conditions, priority, is_active)
  VALUES (
    gen_random_uuid(), v_city, v_svc,
    'cancellation_fee', 'Frais annulation moto',
    '{"amount": 500, "currency": "XOF"}'::jsonb,
    '{"onlyOnCancellation": true}'::jsonb,
    50, true
  ) ON CONFLICT DO NOTHING;

END $$;

-- =============================================================================
-- Exemple : Ajouter une FUTURE règle météo (aucun code à modifier !)
-- Il suffit de créer le handler WeatherSurchargeRule et d'insérer cette ligne :
-- =============================================================================
-- INSERT INTO city_pricing_configs (id, city_id, service_type, rule_key, name, params, conditions, priority, is_active)
-- VALUES (
--   gen_random_uuid(), '<CITY_UUID_OUAGA>', 'moto',
--   'weather_surcharge', 'Majoration pluie',
--   '{"multiplier": 1.3}'::jsonb,
--   '{"custom": {"weatherCondition": "rain"}}'::jsonb,
--   22, true
-- );
