-- ══════════════════════════════════════════════════════════════════
-- The Big Three Garage · "hidden" veld voor voertuigen
-- Plak dit in: Supabase Dashboard → SQL Editor → New query → Run
--
-- Doet twee dingen:
-- 1. Voegt een "hidden" kolom toe (voertuigen met hidden=true verschijnen
--    nergens meer op de site, maar blijven zichtbaar in het adminpaneel
--    zodat David ze later kan bekijken/verwijderen/terugzetten).
-- 2. Verbergt meteen de 15 voertuigen waarvan de gekoppelde Marktplaats-
--    advertentie op 2026-08-23 een 410 Gone teruggaf (advertentie
--    verlopen/verwijderd) — dit zijn de "zwarte kaarten" op de site.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

UPDATE public.vehicles SET hidden = true
WHERE id IN (
  '9abc6536-a201-4ac8-8d91-49025a52b14a', -- SAVANA EXPLORER CAMPER
  '65a796e3-854b-4476-9def-23bb9823085b', -- DUCATO BUS CAMPER
  '3d58dae7-f2fd-4a7f-bb0b-4be8d43ac215', -- SAVANA 2500 CARGO
  '014eb470-3103-4848-bf5a-dbeec0d3f441', -- TRANSPORTER 4MOTION
  'a80a2103-d666-4c3d-be31-dd8e1e05a03d', -- SAVANA EXPLORER CAMPER
  '40daf492-6d02-4c06-b3f8-a46ccb731002', -- SAVANA LOW TOP CAMPER
  'd45509e9-97b7-415a-b6e8-feb55b48557a', -- EXPRESS EXPLORER CAMPER
  'eb3f9e64-c53f-4916-97c4-b09a92048452', -- SAVANA CAMPER LPG
  '59a61e7e-bdb2-4609-8d53-3cc7c5623d1b', -- EXPRESS CARGO 2500
  '88755a4d-c3ab-4425-b40d-70eb42da6159', -- EXPRESS EXPLORER CAMPER
  '610fc154-7551-49a3-84f5-d33f3093069f', -- SAVANA CAMPER LPG
  'e32dc369-8a03-4447-ac6f-d77123bf8b8a', -- STARCRAFT GT CAMPER
  '6f06e7a4-3b22-46a8-bd1f-00cab65c6155', -- EXPRESS VOORBUMPER HOES
  '84abba2d-d139-499f-b117-84f8d1b9f40e', -- SRT-10 OEM VELGEN 22"
  'd3397ffc-58b8-4553-b69b-85f8e498bc82'  -- EXPRESS LED LAMPJES
);