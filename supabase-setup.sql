-- ══════════════════════════════════════════════════════════════════
-- The Big Three Garage · Supabase database setup
-- Plak dit in: Supabase Dashboard → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════

-- 1. Tabel aanmaken
CREATE TABLE IF NOT EXISTS public.vehicles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  title           text        NOT NULL,
  make            text,
  year            integer,
  category        text        NOT NULL DEFAULT 'camper',
  status          text        NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available','reserved','service','part')),
  spec1           text,
  spec2           text,
  spec3           text,
  price_type      text        NOT NULL DEFAULT 'fixed'
                  CHECK (price_type IN ('fixed','ask','bid')),
  price           integer,
  marktplaats_url text,
  youtube_url     text,
  image_url       text,
  sort_order      integer     NOT NULL DEFAULT 0,
  description_nl  text,
  description_en  text,
  description_de  text
);

-- 2. Row Level Security aanzetten
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- 3. Iedereen mag lezen (bezoekers zien de voorraad)
CREATE POLICY "Publiek lezen" ON public.vehicles
  FOR SELECT USING (true);

-- 4. Alleen ingelogde gebruikers mogen schrijven (David via /admin)
CREATE POLICY "Beheerder schrijven" ON public.vehicles
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ══════════════════════════════════════════════════════════════════
-- Migratie: ontbrekende kolommen toevoegen (voor een bestaande database
-- die al draait — bij een nieuwe setup zitten ze al in de CREATE TABLE
-- hierboven). Zonder dit lukt opslaan in /admin niet: het formulier stuurt
-- deze velden altijd mee, en Postgrest weigert dan met "column vehicles.
-- ... does not exist" zodra er ook maar één kolom ontbreekt.
-- Plak dit in: Supabase Dashboard → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS youtube_url    text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS description_nl text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS description_de text;

-- ══════════════════════════════════════════════════════════════════
-- Na het uitvoeren van dit script:
--
-- A. Maak de Storage bucket aan:
--    Supabase Dashboard → Storage → New bucket
--    Naam:   vehicle-images
--    Public: JA (aanvinken)
--
-- B. Storage policies instellen:
--    → vehicle-images bucket → Policies → New policy
--    "Allow public read":
--      FOR SELECT  USING (true)
--    "Allow authenticated upload":
--      FOR INSERT  WITH CHECK (auth.uid() IS NOT NULL)
--    "Allow authenticated delete":
--      FOR DELETE  USING (auth.uid() IS NOT NULL)
--
-- C. Account aanmaken voor David:
--    Supabase Dashboard → Authentication → Users → Invite user
--    Vul Davids e-mailadres in → hij ontvangt een uitnodiging
--
-- D. Vul de Supabase-gegevens in op twee plekken:
--    - index.html         regel met SUPABASE_URL en SUPABASE_ANON_KEY
--    - admin/index.html   zelfde regels bovenaan het <script> blok
--    Gegevens vind je in: Supabase Dashboard → Settings → API
-- ══════════════════════════════════════════════════════════════════
