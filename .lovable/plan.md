

# Alhan Groep ZZP-Portaal — Implementatieplan

## Samenvatting
Een premium, mobile-first ZZP-portaal met WOW-factor voor Alhan Groep B.V. Rood/wit/donkergrijs huisstijl, 11 talen, dark mode, Supabase backend.

## Vereiste: Supabase connectie
Het project heeft nog geen Supabase connectie. Ik zal je vragen om Lovable Cloud in te schakelen of een Supabase project te koppelen voordat de database en auth worden gebouwd. **De eerste stap na goedkeuring is dit opzetten.**

## Bouwvolgorde

### Stap 1 — Project Foundation
- Design system: rode huisstijl (#FF0000), dark mode CSS variabelen, Inter/Poppins font
- i18n setup met react-i18next, alle 11 talen, RTL support voor Arabisch
- Framer Motion installeren
- Logo component (SVG van het Alhan Groep logo)
- Basisstructuur: layout, routing, sidebar navigatie

**Bestanden:**
- `src/index.css` — kleuren + dark mode
- `src/i18n/` — config + 11 vertaalbestanden
- `src/components/Logo.tsx`
- `src/components/Layout.tsx` — sidebar + header
- `src/components/LanguageSwitcher.tsx`
- `src/components/ThemeToggle.tsx`

### Stap 2 — Supabase & Database
- Lovable Cloud activeren (of Supabase koppelen)
- Database migraties: profiles, zzp_profiles, documenten, referrals, opdrachten, opdracht_reacties
- User roles via aparte tabel (admin/zzp)
- RLS policies voor alle tabellen
- Storage bucket voor documenten en avatars
- Auth trigger voor automatische profile aanmaak

### Stap 3 — Authenticatie
- Login pagina (email + wachtwoord, taalwissel, remember me)
- Registratie pagina (met optioneel referral code veld)
- Wachtwoord vergeten + reset pagina
- Splash screen (2.5s, Framer Motion animatie, Alhan branding)
- Auth guard / protected routes

**Bestanden:**
- `src/pages/Login.tsx`
- `src/pages/Register.tsx`
- `src/pages/ForgotPassword.tsx`
- `src/pages/ResetPassword.tsx`
- `src/components/SplashScreen.tsx`
- `src/hooks/useAuth.ts`

### Stap 4 — Home Screen
- Welkom header met naam + avatar
- 2x2 widget grid (tijd, datum, weer, temperatuur)
- Open-Meteo API integratie (gratis, geen key)
- Beschikbaarheid toggle (groot, geanimeerd, real-time Supabase update)
- Profiel compleetheid balk
- Quick stats rij (documenten, rijbewijs, regio, referrals)

**Bestanden:**
- `src/pages/Home.tsx`
- `src/components/home/WeatherWidget.tsx`
- `src/components/home/AvailabilityToggle.tsx`
- `src/components/home/ProfileCompleteness.tsx`
- `src/components/home/QuickStats.tsx`

### Stap 5 — Profiel & Onboarding
- 5-staps onboarding flow met progress bar (nieuw gebruikers)
- Profielpagina voor bestaande gebruikers (inline editing)
- Document upload met status indicators
- Alhan Score + badges
- Confetti animatie bij voltooiing (canvas-confetti)

**Bestanden:**
- `src/pages/Profile.tsx`
- `src/components/profile/OnboardingFlow.tsx`
- `src/components/profile/OnboardingStep1.tsx` t/m `Step5.tsx`
- `src/components/profile/ProfileView.tsx`
- `src/components/profile/DocumentUpload.tsx`
- `src/components/profile/BadgeDisplay.tsx`

### Stap 6 — Werk (Opdrachten)
- Opdrachten lijst met filter (discipline, regio)
- Opdracht kaarten met details
- "Ik ben beschikbaar" actie met bevestigingsanimatie
- Empty state

**Bestanden:**
- `src/pages/Work.tsx`
- `src/components/work/AssignmentCard.tsx`
- `src/components/work/AssignmentFilters.tsx`

### Stap 7 — Netwerk (Referrals)
- Persoonlijke referral code (kopieerbaar)
- Deelbare kaart (WhatsApp share)
- Referral lijst met status
- Bonus overzicht

**Bestanden:**
- `src/pages/Network.tsx`
- `src/components/network/ReferralCard.tsx`
- `src/components/network/ShareCard.tsx`

### Stap 8 — Instellingen
- Taalwisselaar (11 vlaggen)
- Dark mode toggle
- Wachtwoord wijzigen
- Account verwijderen
- App info

**Bestanden:**
- `src/pages/Settings.tsx`

## Technische details

- **State management**: React Query voor server state, React context voor auth/theme/language
- **Animaties**: Framer Motion voor page transitions, sidebar, toggles
- **Weather**: Open-Meteo free API + browser Geolocation API
- **File uploads**: Supabase Storage met RLS
- **RTL**: `dir="rtl"` op html element wanneer Arabisch geselecteerd
- **Dark mode**: CSS class strategy, toggle opgeslagen in localStorage
- **Responsive**: mobile-first, Tailwind breakpoints, getest op 426px viewport

