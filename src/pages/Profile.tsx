import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Save, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import CertificateSection from '@/components/CertificateSection';
import ProfilePhotoUpload from '@/components/profile/ProfilePhotoUpload';
import AboutTransportSection from '@/components/profile/AboutTransportSection';

const profileSchema = z.object({
  first_name: z.string().min(1, 'Verplicht').max(100),
  last_name: z.string().min(1, 'Verplicht').max(100),
  phone: z.string().min(1, 'Verplicht').regex(/^[\d\s+()-]{7,20}$/, 'Ongeldig telefoonnummer'),
  date_of_birth: z.date().optional().nullable(),
  bsn: z.string().optional().refine(v => !v || /^\d{9}$/.test(v), 'BSN moet 9 cijfers zijn'),
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      bsn: '',
      address: '',
      city: '',
      postal_code: '',
      specialization: '',
      hourly_rate: null,
      preferred_language: 'nl',
      bio: '',
      transport_type: '',
      has_own_equipment: false,
      equipment_description: '',
    },
  });

  const firstName = watch('first_name');
  const lastName = watch('last_name');
  const initials = `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();

  useEffect(() => {
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
          reset({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            phone: data.phone || '',
            bsn: data.bsn || '',
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
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone,
        date_of_birth: values.date_of_birth ? format(values.date_of_birth, 'yyyy-MM-dd') : null,
        bsn: values.bsn || null,
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
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-5 space-y-5 pb-24"
    >
      <h1 className="text-2xl font-bold text-foreground">{t('profile.title')}</h1>

      {/* Avatar Upload */}
      <ProfilePhotoUpload
        avatarUrl={avatarUrl}
        initials={initials}
        userId={userId}
        onPhotoUpdated={setAvatarUrl}
      />
      <p className="text-sm text-muted-foreground text-center">{email}</p>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">{t('profile.firstName')}</Label>
            <Input id="first_name" {...register('first_name')} className="bg-card" />
            {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name">{t('profile.lastName')}</Label>
            <Input id="last_name" {...register('last_name')} className="bg-card" />
            {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t('profile.phone')}</Label>
          <Input id="phone" type="tel" {...register('phone')} className="bg-card" />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <Label>{t('auth.email')}</Label>
          <Input value={email} readOnly disabled className="bg-muted" />
        </div>

        {/* Date of Birth */}
        <div className="space-y-1.5">
          <Label>Geboortedatum</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-card",
                  !dateOfBirth && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateOfBirth ? format(dateOfBirth, 'dd-MM-yyyy') : 'Selecteer datum'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateOfBirth}
                onSelect={(date) => {
                  setDateOfBirth(date);
                  setValue('date_of_birth', date || null);
                }}
                disabled={(date) => date > new Date() || date < new Date('1940-01-01')}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* BSN */}
        <div className="space-y-1.5">
          <Label htmlFor="bsn">BSN</Label>
          <Input id="bsn" {...register('bsn')} maxLength={9} placeholder="123456789" className="bg-card" />
          {errors.bsn && <p className="text-xs text-destructive">{errors.bsn.message}</p>}
        </div>

        {/* Address row */}
        <div className="space-y-1.5">
          <Label htmlFor="address">Adres</Label>
          <Input id="address" {...register('address')} className="bg-card" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="city">Stad</Label>
            <Input id="city" {...register('city')} className="bg-card" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postal_code">Postcode</Label>
            <Input id="postal_code" {...register('postal_code')} className="bg-card" />
          </div>
        </div>

        {/* Specialization */}
        <div className="space-y-1.5">
          <Label>Specialisatie</Label>
          <Select
            value={watch('specialization') || ''}
            onValueChange={(v) => setValue('specialization', v)}
          >
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Kies specialisatie" />
            </SelectTrigger>
            <SelectContent>
              {SPECIALIZATIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Hourly rate */}
        <div className="space-y-1.5">
          <Label htmlFor="hourly_rate">{t('profile.hourlyRate')}</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
            <Input
              id="hourly_rate"
              type="number"
              step="0.50"
              min="0"
              max="999"
              className="pl-7 bg-card"
              {...register('hourly_rate', { valueAsNumber: true })}
            />
          </div>
        </div>

        {/* About / Transport / Equipment */}
        <div className="border-t border-border pt-4 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Over jou & Uitrusting</h2>
          <AboutTransportSection register={register} watch={watch} setValue={setValue} />
        </div>

        {/* Language */}
        <div className="space-y-1.5">
          <Label>{t('settings.language')}</Label>
          <Select
            value={watch('preferred_language') || 'nl'}
            onValueChange={(v) => setValue('preferred_language', v)}
          >
            <SelectTrigger className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Save */}
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {t('common.save')}
        </Button>
      </form>

      {/* Certificates */}
      <CertificateSection />
    </motion.div>
  );
};

export default Profile;
