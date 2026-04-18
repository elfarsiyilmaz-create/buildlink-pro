import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, ShieldCheck, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Volgorde: Home → Veiligheid → Uren → Profiel */
const items = [
  { to: '/', end: true as const, Icon: Home, labelKey: 'nav.home' as const },
  { to: '/safety', end: false as const, Icon: ShieldCheck, labelKey: 'nav.safety' as const },
  { to: '/hours', end: false as const, Icon: Clock, labelKey: 'nav.hours' as const },
  { to: '/profile', end: false as const, Icon: User, labelKey: 'nav.profile' as const },
] as const;

/**
 * Ondernavigatie (iOS-achtig): vaste tabs, geen Meldingen.
 */
export function BottomNav() {
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E5E5EA] bg-white/95 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="pointer-events-auto mx-auto max-w-[430px] px-2">
        <ul className="grid grid-cols-4" aria-label="Hoofdnavigatie">
          {items.map(({ to, end, Icon, labelKey }) => (
            <li key={to} className="flex min-w-0 justify-center">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center gap-1 py-1.5 text-center transition-colors duration-150',
                    isActive ? 'text-[#1C1C1E]' : 'text-[#8E8E93]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2 : 1.75} aria-hidden />
                    <span className="text-[11px] leading-[14px] text-current">{t(labelKey)}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
