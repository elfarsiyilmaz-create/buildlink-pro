

# Profile Completeness & Wizard Plan

## Summary
Add profile completeness tracking with a progress ring, completeness banner, and a 5-step wizard to the existing Profile page. Includes database migration for new columns, new UI components, and i18n for all 11 languages.

## Database Migration

Add columns to `profiles` table (note: `onboarding_completed` already exists, `wizard_step` may not):
- `profile_completeness` integer DEFAULT 0
- `completeness_updated_at` timestamptz
- `wizard_step` integer DEFAULT 0

## New Components

### 1. `src/components/profile/ProfileCompletenessRing.tsx`
- SVG circular progress ring around avatar
- Color-coded: red (0-40%), orange (41-70%), blue (71-99%), green (100%)
- Animated fill on load with Framer Motion
- Shows percentage text below

### 2. `src/components/profile/CompletenessBanner.tsx`
- Card shown when completeness < 100%
- Progress bar with percentage
- Lists missing fields with ❌ icons and "Toevoegen" buttons
- Each item scrolls/navigates to that section or opens wizard at relevant step
- Dismissible for 24 hours (localStorage timestamp)

### 3. `src/components/profile/ProfileWizard.tsx`
- Full-screen Sheet/Dialog with 5 steps:
  1. Personal details (name, DOB, city, phone)
  2. Profile photo (reuse existing ProfilePhotoUpload)
  3. Specializations (multi-select grid — expanded list: Metselwerk, Stucwerk, Schilderwerk, Tegelwerk, Elektra, Loodgieter, Timmerwerk, Dakdekker, Vloeren, Isolatie, Gevelrenovatie, Overig)
  4. Certificates (toggle common certs + upload)
  5. Financial (BSN masked, IBAN formatted, KvK)
- Step indicator dots, Back/Next/Skip buttons
- Saves per step to Supabase
- Confetti animation on completion (reuse existing achievement pattern)

### 4. `src/hooks/useProfileCompleteness.ts`
- Calculates completeness from profile data, certificates, and availability
- Point breakdown per the spec (total 100)
- Returns: percentage, missing fields list, color code
- Recalculates on every profile update

## Changes to Existing Files

### `src/pages/Profile.tsx`
- Import and use `useProfileCompleteness` hook
- Add `ProfileCompletenessRing` around avatar area
- Add `CompletenessBanner` at top
- Add "Profiel aanvullen" button that opens wizard
- On save: recalculate and persist `profile_completeness`
- Award 100 points + achievement when reaching 100%

### `src/components/profile/ProfilePhotoUpload.tsx`
- Minor: accept optional `compact` prop for wizard mode

## Gamification Integration
- On reaching 100%: insert 100 points into `leaderboard_scores`
- Trigger achievement unlock animation
- Toast: "+100 punten! Profiel volledig!"

## i18n Updates (all 11 locale files)
Add keys under `profile`:
- `completeness_title`, `complete_your_profile`, `missing_fields`, `wizard_title`
- `step_personal`, `step_photo`, `step_specializations`, `step_certificates`, `step_financial`
- `profile_complete`, `points_earned`, `add_now`, `completeness_percent`
- `missing_photo`, `missing_specialization`, `missing_bsn`, `missing_bio`, `missing_city`, `missing_phone`, `missing_certificate`, `missing_iban`, `missing_availability`

## Technical Notes
- The `specialization` column currently stores a single value. For multi-select specializations in the wizard, we'll store as comma-separated or change to a text array. Recommend adding a new `specializations` text[] column via migration.
- IBAN field doesn't exist in the profiles table yet — needs to be added via migration (`iban` text).
- KvK field doesn't exist — needs `kvk_number` text column.
- All new columns are nullable with sensible defaults.

## File Summary
- **Migration**: Add `profile_completeness`, `wizard_step`, `iban`, `kvk_number`, `specializations` columns
- **New files**: `ProfileCompletenessRing.tsx`, `CompletenessBanner.tsx`, `ProfileWizard.tsx`, `useProfileCompleteness.ts`
- **Modified files**: `Profile.tsx`, `ProfilePhotoUpload.tsx`, all 11 locale files

