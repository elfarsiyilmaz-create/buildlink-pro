import { useMemo } from 'react';

export interface MissingField {
  key: string;
  labelKey: string;
  points: number;
  wizardStep?: number;
}

interface CompletenessResult {
  percentage: number;
  missingFields: MissingField[];
  color: string;
  earnedPoints: number;
}

export interface ProfileData {
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  city?: string | null;
  specialization?: string | null;
  specializations?: string[] | null;
  bio?: string | null;
  kvk_number?: string | null;
  iban?: string | null;
  preferred_language?: string | null;
}

export function useProfileCompleteness(
  profile: ProfileData | null,
  hasCertificates: boolean,
  hasAvailability: boolean
): CompletenessResult {
  return useMemo(() => {
    if (!profile) return { percentage: 0, missingFields: [], color: '#EF4444', earnedPoints: 0 };

    const missing: MissingField[] = [];
    let earned = 0;

    // Full name (10)
    if (profile.full_name?.trim()) {
      earned += 10;
    } else {
      missing.push({ key: 'name', labelKey: 'profile.missing_name', points: 10, wizardStep: 0 });
    }

    // Phone (10)
    if (profile.phone) {
      earned += 10;
    } else {
      missing.push({ key: 'phone', labelKey: 'profile.missing_phone', points: 10, wizardStep: 0 });
    }

    // Photo (10)
    if (profile.avatar_url) {
      earned += 10;
    } else {
      missing.push({ key: 'photo', labelKey: 'profile.missing_photo', points: 10, wizardStep: 1 });
    }

    // DOB (5)
    if (profile.date_of_birth) {
      earned += 5;
    } else {
      missing.push({ key: 'dob', labelKey: 'profile.missing_dob', points: 5, wizardStep: 0 });
    }

    // City (10)
    if (profile.city) {
      earned += 10;
    } else {
      missing.push({ key: 'city', labelKey: 'profile.missing_city', points: 10, wizardStep: 0 });
    }

    // Specializations (15)
    const hasSpec = (profile.specializations && profile.specializations.length > 0) || !!profile.specialization;
    if (hasSpec) {
      earned += 15;
    } else {
      missing.push({ key: 'specialization', labelKey: 'profile.missing_specialization', points: 15, wizardStep: 2 });
    }

    // Certificates (10)
    if (hasCertificates) {
      earned += 10;
    } else {
      missing.push({ key: 'certificate', labelKey: 'profile.missing_certificate', points: 10, wizardStep: 3 });
    }

    // Bio (10)
    if (profile.bio) {
      earned += 10;
    } else {
      missing.push({ key: 'bio', labelKey: 'profile.missing_bio', points: 10, wizardStep: 0 });
    }

    // KvK number (10)
    if (profile.kvk_number) {
      earned += 10;
    } else {
      missing.push({ key: 'kvk', labelKey: 'profile.missing_kvk', points: 10, wizardStep: 4 });
    }

    // IBAN (10)
    if (profile.iban) {
      earned += 10;
    } else {
      missing.push({ key: 'iban', labelKey: 'profile.missing_iban', points: 10, wizardStep: 4 });
    }

    // Language (5) - always set via default
    if (profile.preferred_language) {
      earned += 5;
    }

    // Availability (5)
    if (hasAvailability) {
      earned += 5;
    } else {
      missing.push({ key: 'availability', labelKey: 'profile.missing_availability', points: 5 });
    }

    const percentage = Math.min(100, earned);
    let color = '#EF4444';
    if (percentage > 70) color = '#3B82F6';
    else if (percentage > 40) color = '#F59E0B';
    if (percentage === 100) color = '#10B981';

    return { percentage, missingFields: missing, color, earnedPoints: earned };
  }, [profile, hasCertificates, hasAvailability]);
}
