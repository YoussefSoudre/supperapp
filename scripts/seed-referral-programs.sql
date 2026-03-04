-- =============================================================================
-- Seed : referral_programs — Système de parrainage scalable
-- =============================================================================
-- Remplacer <CITY_UUID_OUAGA> par l'UUID réel de la ville.
-- =============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Programme global (fallback — toutes les villes)
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO referral_programs (
  id, name, city_id, service_types,
  referrer_reward_type, referrer_reward_amount, max_rewards_per_referrer,
  referee_reward_type,  referee_reward_amount,
  trigger_after_trips, min_trigger_amount_xof,
  anti_abuse_config, expires_at, is_active
) VALUES (
  gen_random_uuid(),
  'Programme Global Superapp',
  NULL,                                             -- global
  '["ride","food","delivery"]'::jsonb,
  'wallet_credit', 1000, 50,                        -- parrain : +1000 XOF, max 50 filleuls
  'wallet_credit', 500,                             -- filleul : +500 XOF
  1,                                                -- dès la 1ère course
  300,                                              -- commande minimum 300 XOF
  '{
    "maxFilleulsPerReferrer": 50,
    "minAccountAgeDays": 0,
    "minTriggerAmountXof": 300,
    "maxUsersPerSubnet": 5,
    "blockSameDevice": true,
    "pendingExpiryDays": 90
  }'::jsonb,
  NULL,
  true
) ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- Programme Ouagadougou — plus généreux, spécifique moto & food
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO referral_programs (
  id, name, city_id, service_types,
  referrer_reward_type, referrer_reward_amount, max_rewards_per_referrer,
  referee_reward_type,  referee_reward_amount,
  trigger_after_trips, min_trigger_amount_xof,
  anti_abuse_config, expires_at, is_active
) VALUES (
  gen_random_uuid(),
  'Programme Ouagadougou 2026',
  '<CITY_UUID_OUAGA>',
  '["ride","food"]'::jsonb,                         -- ride + food uniquement
  'wallet_credit', 1500, 100,                       -- parrain : +1500 XOF, max 100 filleuls
  'discount', 1500,                                 -- filleul : 15% de réduction (1500/100 = 15%)
  2,                                                -- après 2 courses
  500,                                              -- commande minimum 500 XOF
  '{
    "maxFilleulsPerReferrer": 100,
    "minAccountAgeDays": 0,
    "minTriggerAmountXof": 500,
    "maxUsersPerSubnet": 3,
    "blockSameDevice": true,
    "pendingExpiryDays": 60
  }'::jsonb,
  '2026-12-31 23:59:59',
  true
) ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- Vérification / aperçu
-- ────────────────────────────────────────────────────────────────────────────
-- SELECT id, name, city_id, service_types, referrer_reward_amount,
--        trigger_after_trips, is_active
-- FROM referral_programs
-- ORDER BY created_at DESC;
