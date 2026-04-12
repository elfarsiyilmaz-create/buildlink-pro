-- Use single full_name on profiles; migrate legacy first_name + last_name when present.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;

UPDATE public.profiles p
SET full_name = trim(both ' ' FROM concat_ws(' ', NULLIF(trim(p.first_name), ''), NULLIF(trim(p.last_name), '')))
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'profiles' AND c.column_name = 'first_name'
)
AND (p.full_name IS NULL OR trim(p.full_name) = '');

ALTER TABLE public.profiles DROP COLUMN IF EXISTS first_name;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_name;
