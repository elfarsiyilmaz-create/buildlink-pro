/**
 * Platform Partner Programma — tiergrenzen en voortgang (client-side, gelijk aan productregels).
 */

export type PartnerTierId = 'geen' | 'brons' | 'zilver' | 'goud' | 'platina';

export type RewardTierId = Exclude<PartnerTierId, 'geen'>;

export const BRAND_PARTNER_RED = '#c0392b';

export const REWARD_TIERS: {
  id: RewardTierId;
  name: string;
  min: number;
  max: number | null;
  reward: string;
}[] = [
  { id: 'brons', name: 'Brons', min: 30, max: 54, reward: '€8' },
  { id: 'zilver', name: 'Zilver', min: 55, max: 74, reward: '€18' },
  { id: 'goud', name: 'Goud', min: 75, max: 94, reward: '€30' },
  { id: 'platina', name: 'Platina', min: 95, max: null, reward: '€40 + badge' },
];

const DUTCH_MONTHS = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
] as const;

export function dutchMonthName(month1To12: number): string {
  const i = month1To12 - 1;
  return DUTCH_MONTHS[i] ?? 'januari';
}

/** Tier op basis van punten (exacte regels). */
export function getTierFromPoints(points: number): PartnerTierId {
  const p = Math.max(0, Math.floor(points));
  if (p >= 95) return 'platina';
  if (p >= 75) return 'goud';
  if (p >= 55) return 'zilver';
  if (p >= 30) return 'brons';
  return 'geen';
}

export interface PartnerProgress {
  currentTier: PartnerTierId;
  /** Tier waar de gebruiker naartoe werkt (eerste waar punten nog onder minimum liggen). */
  nextRewardTierId: RewardTierId | null;
  nextTierDisplayName: string | null;
  pointsToNext: number;
  /** 0–100: voortgang binnen het segment naar de volgende tier. */
  progressPercent: number;
}

/**
 * Voortgang naar de eerstvolgende beloningstier.
 * - Onder 30: naar Brons (0–30)
 * - 30–54: naar Zilver (30–55)
 * - enz. Platina (95+): 100%, geen volgende tier.
 */
export function getPartnerProgress(points: number): PartnerProgress {
  const p = Math.max(0, Math.floor(points));
  const currentTier = getTierFromPoints(p);

  if (p >= 95) {
    return {
      currentTier,
      nextRewardTierId: null,
      nextTierDisplayName: null,
      pointsToNext: 0,
      progressPercent: 100,
    };
  }

  if (p < 30) {
    return {
      currentTier,
      nextRewardTierId: 'brons',
      nextTierDisplayName: 'Brons',
      pointsToNext: 30 - p,
      progressPercent: Math.min(100, (p / 30) * 100),
    };
  }

  if (p < 55) {
    return {
      currentTier,
      nextRewardTierId: 'zilver',
      nextTierDisplayName: 'Zilver',
      pointsToNext: 55 - p,
      progressPercent: ((p - 30) / (55 - 30)) * 100,
    };
  }

  if (p < 75) {
    return {
      currentTier,
      nextRewardTierId: 'goud',
      nextTierDisplayName: 'Goud',
      pointsToNext: 75 - p,
      progressPercent: ((p - 55) / (75 - 55)) * 100,
    };
  }

  return {
    currentTier,
    nextRewardTierId: 'platina',
    nextTierDisplayName: 'Platina',
    pointsToNext: 95 - p,
    progressPercent: ((p - 75) / (95 - 75)) * 100,
  };
}

export function formatPointsRange(tier: (typeof REWARD_TIERS)[number]): string {
  if (tier.max === null) return '95+ punten';
  return `${tier.min}–${tier.max} punten`;
}
