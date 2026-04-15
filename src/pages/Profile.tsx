import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, ChevronLeft, Loader2, Bell, Clock3, Home as HomeIcon, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, initialsFromFullName } from '@/lib/utils';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import { Link, useNavigate } from 'react-router-dom';

const profileSchema = z.object({
  full_name: z.string().min(1, 'Verplicht').max(200),
  phone: z.string().min(1, 'Verplicht').regex(/^[\d\s+()-]{7,20}$/, 'Ongeldig telefoonnummer'),
  date_of_birth: z.date().optional().nullable(),
  kvk_number: z.string().optional().refine(v => !v || /^\d{8}$/.test(v), 'KVK moet 8 cijfers zijn'),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  postal_code: z.string().max(10).optional(),
  specialization: z.string().optional(),
  hourly_rate: z.number().min(0).max(999).optional().nullable(),
  preferred_language: z.string().optional(),
  bio: z.string().max(1000).optional(),
  transport_type: z.string().optional(),
  has_own_equipment: z.boolean().optional(),
  equipment_description: z.string().max(500).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const SPECIALIZATIONS = [
  'Grondwerker', 'Timmerman', 'Stratenmaker', 'Lasser', 'Machinist',
  'Kraanmachinist', 'Hovenier', 'Schilder', 'Elektricien', 'Loodgieter', 'Overig',
];

const LANGUAGES = [
  { code: 'nl', label: 'Nederlands' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'pl', label: 'Polski' },
  { code: 'ro', label: 'Română' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ar', label: 'العربية' },
  { code: 'bg', label: 'Български' },
];

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [hasCerts, setHasCerts] = useState(false);
  const [hasAvail, setHasAvail] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rewardedRef = useRef(false);

  const completeness = useProfileCompleteness(profileData, hasCerts, hasAvail);

  // Gamification: award 100 points + achievement when profile hits 100%
  useEffect(() => {
    if (completeness.percentage !== 100 || !userId || rewardedRef.current) return;
    
    const awardReward = async () => {
      try {
        // Check if already rewarded (profile_completeness already 100 in DB)
        const { data: existing } = await supabase
          .from('profiles')
          .select('profile_completeness')
          .eq('user_id', userId)
          .single();
        
        if (existing?.profile_completeness === 100) {
          rewardedRef.current = true;
          return;
        }

        rewardedRef.current = true;

        // Update profile_completeness
        await supabase.from('profiles').update({
          profile_completeness: 100,
          completeness_updated_at: new Date().toISOString(),
        }).eq('user_id', userId);

        // Upsert leaderboard score: add 100 points
        const { data: score } = await supabase
          .from('leaderboard_scores')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (score) {
          await supabase.from('leaderboard_scores').update({
            total_points: score.total_points + 100,
          }).eq('user_id', userId);
        } else {
          await supabase.from('leaderboard_scores').insert({
            user_id: userId,
            total_points: 100,
          });
        }

        // Unlock "Volledig Profiel" achievement
        const { data: achievement } = await supabase
          .from('achievements')
          .select('id')
          .eq('name', 'Volledig Profiel')
          .single();

        if (achievement) {
          const { data: existing } = await supabase
            .from('user_achievements')
            .select('id')
            .eq('user_id', userId)
            .eq('achievement_id', achievement.id)
            .maybeSingle();

          if (!existing) {
            await supabase.from('user_achievements').insert({
              user_id: userId,
              achievement_id: achievement.id,
            });
          }
        }

        // Show toast
        toast.success(t('profile.profile_complete') + ' 🎉 +100 ' + t('dashboard.points'), {
          duration: 5000,
        });
      } catch (err) {
        console.error('Error awarding profile reward:', err);
      }
    };

    awardReward();
  }, [completeness.percentage, userId, t]);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '', phone: '', kvk_number: '', address: '', city: '',
      postal_code: '', specialization: '', hourly_rate: null, preferred_language: 'nl',
      bio: '', transport_type: '', has_own_equipment: false, equipment_description: '',
    },
  });

  const fullNameWatch = watch('full_name');
  const initials = initialsFromFullName(fullNameWatch);
  const hasOwnEquipment = watch('has_own_equipment');

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || '');
      setUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfileData(data);
        reset({
          full_name: data.full_name || '',
          phone: data.phone || '',
          kvk_number: data.kvk_number || '',
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          specialization: data.specialization || '',
          hourly_rate: data.hourly_rate ? Number(data.hourly_rate) : null,
          preferred_language: data.preferred_language || 'nl',
          date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : null,
          bio: (data as any).bio || '',
          transport_type: (data as any).transport_type || '',
          has_own_equipment: (data as any).has_own_equipment || false,
          equipment_description: (data as any).equipment_description || '',
        });
        if (data.date_of_birth) setDateOfBirth(new Date(data.date_of_birth));
        setAvatarUrl(data.avatar_url || null);
      }

      // Check certificates
      const { count: certCount } = await supabase
        .from('certificates')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setHasCerts((certCount || 0) > 0);

      // Check availability
      const { count: availCount } = await supabase
        .from('availability')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setHasAvail((availCount || 0) > 0);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [refreshKey]);

  const onSubmit = async (values: ProfileFormValues) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        full_name: values.full_name,
        phone: values.phone,
        date_of_birth: values.date_of_birth ? format(values.date_of_birth, 'yyyy-MM-dd') : null,
        kvk_number: values.kvk_number || null,
        address: values.address || null,
        city: values.city || null,
        postal_code: values.postal_code || null,
        specialization: values.specialization || null,
        hourly_rate: values.hourly_rate ?? null,
        preferred_language: values.preferred_language || 'nl',
        bio: values.bio || null,
        transport_type: values.transport_type || null,
        has_own_equipment: values.has_own_equipment || false,
        equipment_description: values.has_own_equipment ? (values.equipment_description || null) : null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success(t('common.success'));
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Alleen JPG en PNG bestanden');
      return;
    }

    try {
      setUploadingPhoto(true);
      const path = `${userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const signedUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: signedUrl })
        .eq('user_id', userId);
      if (updateError) throw updateError;

      setAvatarUrl(signedUrl);
      toast.success('Profielfoto bijgewerkt');
    } catch (err: any) {
      toast.error(err.message || 'Upload mislukt');
    } finally {
      setUploadingPhoto(false);
      if (event.target) event.target.value = '';
    }
  };

  const profilePercentage = useMemo(
    () => (Number.isFinite(completeness.percentage) ? completeness.percentage : 0),
    [completeness.percentage],
  );

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f3f3f5]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#f3f3f5]">
      <div className="mx-auto w-full max-w-[430px] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+128px)] pt-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-1 text-[17px] text-[#B91C1C]"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Terug</span>
        </button>

        <h1 className="mb-3 text-[40px] font-semibold leading-none tracking-[-0.01em] text-zinc-900">Profiel</h1>

        <section className="rounded-[18px] border border-black/[0.035] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[17px] font-medium text-zinc-900">Profiel aanvullen</p>
            <p className="text-[17px] text-zinc-700">{profilePercentage}% compleet</p>
          </div>
          <div className="h-[4px] bg-zinc-200">
            <div className="h-full bg-[#B91C1C]" style={{ width: `${profilePercentage}%` }} />
          </div>
          <p className="px-4 py-3 text-[15px] text-zinc-700">Vul je profiel aan om meer opdrachten te krijgen</p>
        </section>

        <section className="mt-4 rounded-[18px] border border-black/[0.035] bg-white px-4 py-6 text-center shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
          <div className="relative mx-auto mb-3.5 h-[94px] w-[94px]">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full rounded-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-100 text-[42px] font-medium text-zinc-500">
                {initials || 'ZZ'}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-8.5 w-8.5 items-center justify-center rounded-full bg-[#B91C1C] text-white shadow"
              aria-label="Upload profielfoto"
            >
              {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[15px] text-zinc-700">{email || 'fwvjkn25xc@privaterelay.appleid.com'}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </section>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <section className="overflow-hidden rounded-[18px] border border-black/[0.04] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
            <h2 className="border-b border-zinc-200 px-4 py-3 text-[13px] font-medium uppercase tracking-wide text-zinc-600">
              PERSOONLIJKE GEGEVENS
            </h2>

            <div className="border-b border-zinc-200 px-4 py-3">
              <p className="text-[13px] text-zinc-700">Volledige naam</p>
              <Input {...register('full_name')} placeholder="Voer je naam in" className="mt-1 h-7 border-0 px-0 text-[17px] shadow-none focus-visible:ring-0" />
              {errors.full_name ? <p className="mt-1 text-xs text-destructive">{errors.full_name.message}</p> : null}
            </div>

            <div className="border-b border-zinc-200 px-4 py-3">
              <p className="text-[13px] text-zinc-700">Telefoonnummer</p>
              <Input {...register('phone')} placeholder="06 - 1234 5678" className="mt-1 h-7 border-0 px-0 text-[17px] shadow-none focus-visible:ring-0" />
              {errors.phone ? <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p> : null}
            </div>

            <div className="border-b border-zinc-200 px-4 py-3">
              <p className="text-[13px] text-zinc-700">E-mailadres</p>
              <p className="mt-1 text-[17px] text-zinc-900">{email}</p>
            </div>

            <div className="px-4 py-3">
              <p className="text-[13px] text-zinc-700">Geboortedatum</p>
              <Input
                type="date"
                value={dateOfBirth ? format(dateOfBirth, 'yyyy-MM-dd') : ''}
                onChange={e => {
                  const nextDate = e.target.value ? new Date(e.target.value) : undefined;
                  setDateOfBirth(nextDate);
                  setValue('date_of_birth', nextDate || null);
                }}
                className="mt-1 h-7 border-0 px-0 text-[17px] shadow-none focus-visible:ring-0"
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-[18px] border border-black/[0.04] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
            <h2 className="border-b border-zinc-200 px-4 py-3 text-[13px] font-medium uppercase tracking-wide text-zinc-600">
              BEDRIJFSGEGEVENS
            </h2>

            <div className="border-b border-zinc-200 px-4 py-3">
              <p className="text-[13px] text-zinc-700">KVK nummer</p>
              <Input {...register('kvk_number')} maxLength={8} placeholder="12345678" className="mt-1 h-7 border-0 px-0 text-[17px] shadow-none focus-visible:ring-0" />
            </div>

            <div className="border-b border-zinc-200 px-4 py-3">
              <p className="text-[13px] text-zinc-700">Adres</p>
              <Input {...register('address')} placeholder="Straatnaam + nummer" className="mt-1 h-7 border-0 px-0 text-[17px] shadow-none focus-visible:ring-0" />
            </div>

            <div className="grid grid-cols-2 border-b border-zinc-200">
              <div className="border-r border-zinc-200 px-4 py-3">
                <p className="text-[13px] text-zinc-700">Stad</p>
                <Input {...register('city')} placeholder="Stad" className="mt-1 h-7 border-0 px-0 text-[17px] shadow-none focus-visible:ring-0" />
              </div>
              <div className="px-4 py-3">
                <p className="text-[13px] text-zinc-700">Postcode</p>
                <Input {...register('postal_code')} placeholder="1234 AB" className="mt-1 h-7 border-0 px-0 text-[17px] shadow-none focus-visible:ring-0" />
              </div>
            </div>

            <div className="border-b border-zinc-200 px-4 py-3">
              <p className="text-[13px] text-zinc-700">Specialisatie</p>
              <Select value={watch('specialization') || ''} onValueChange={v => setValue('specialization', v)}>
                <SelectTrigger className="mt-1 h-7 border-0 px-0 text-[17px] shadow-none focus:ring-0">
                  <SelectValue placeholder="Kies specialisatie" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALIZATIONS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="px-4 py-3">
              <p className="text-[13px] text-zinc-700">Uurtarief</p>
              <Input
                type="number"
                step="0.50"
                min="0"
                max="999"
                {...register('hourly_rate', { valueAsNumber: true })}
                placeholder="€"
                className="mt-1 h-7 border-0 px-0 text-[17px] shadow-none focus-visible:ring-0"
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-[18px] border border-black/[0.04] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
            <h2 className="border-b border-zinc-200 px-4 py-3 text-[13px] font-medium uppercase tracking-wide text-zinc-600">
              OVER JOU & UITRUSTING
            </h2>

            <div className="border-b border-zinc-200 px-4 py-3">
              <p className="text-[13px] text-zinc-700">Over mij / Werkervaring</p>
              <textarea
                {...register('bio')}
                rows={3}
                placeholder="Vertel iets over jezelf en je werkervaring..."
                className={cn(
                  'mt-1 w-full resize-none border-0 bg-transparent p-0 text-[17px] text-zinc-900 outline-none placeholder:text-zinc-400',
                )}
              />
            </div>

            <div className="border-b border-zinc-200 px-4 py-3">
              <p className="text-[13px] text-zinc-700">Vervoer</p>
              <Select value={watch('transport_type') || ''} onValueChange={v => setValue('transport_type', v)}>
                <SelectTrigger className="mt-1 h-7 border-0 px-0 text-[17px] shadow-none focus:ring-0">
                  <SelectValue placeholder="Hoe kom je naar werk?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="bus">Bus</SelectItem>
                  <SelectItem value="trein">Trein</SelectItem>
                  <SelectItem value="fiets">Fiets</SelectItem>
                  <SelectItem value="anders">Anders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-b border-zinc-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-[17px] text-zinc-900">Eigen gereedschap</p>
                <Switch
                  checked={!!hasOwnEquipment}
                  onCheckedChange={checked => setValue('has_own_equipment', checked)}
                />
              </div>
            </div>

            <div className="px-4 py-3">
              <p className="text-[13px] text-zinc-700">Taal</p>
              <Select value={watch('preferred_language') || 'nl'} onValueChange={v => setValue('preferred_language', v)}>
                <SelectTrigger className="mt-1 h-7 border-0 px-0 text-[17px] shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(l => (
                    <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <button
            type="submit"
            className="h-[47px] w-full rounded-[12px] bg-[#C0161E] text-[17px] font-semibold text-white disabled:opacity-60"
            disabled={saving}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Opslaan
              </span>
            ) : 'Opslaan'}
          </button>
        </form>

        <section className="mt-4 overflow-hidden rounded-[18px] border border-black/[0.04] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <h2 className="text-[13px] font-medium uppercase tracking-wide text-zinc-600">MIJN CERTIFICATEN</h2>
            <button type="button" className="text-[14px] font-medium text-[#B91C1C]">+ Toevoegen</button>
          </div>
          <p className="px-4 py-6 text-center text-[15px] text-zinc-500">
            {hasCerts ? 'Certificaten toegevoegd' : 'Nog geen certificaten toegevoegd'}
          </p>
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto w-full max-w-[430px] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+9px)]">
          <nav className="pointer-events-auto rounded-[20px] border border-black/[0.05] bg-white px-3 py-1 shadow-[0_-1px_8px_rgba(15,23,42,0.06)]">
            <ul className="grid grid-cols-4">
              <li>
                <Link to="/" className="flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <HomeIcon className="h-5 w-5" />
                  <span className="text-[11px]">Home</span>
                </Link>
              </li>
              <li>
                <Link to="/hours" className="flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <Clock3 className="h-5 w-5" />
                  <span className="text-[11px]">Uren</span>
                </Link>
              </li>
              <li>
                <Link to="/notifications" className="flex flex-col items-center gap-0.5 py-1 text-zinc-500">
                  <Bell className="h-5 w-5" />
                  <span className="text-[11px]">Meldingen</span>
                </Link>
              </li>
              <li>
                <Link to="/profile" aria-current="page" className="flex flex-col items-center gap-0.5 py-1 text-[#B91C1C]">
                  <User className="h-5 w-5" />
                  <span className="text-[11px] font-medium">Profiel</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Profile;
