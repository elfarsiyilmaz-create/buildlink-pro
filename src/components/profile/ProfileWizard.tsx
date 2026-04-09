import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Loader2, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import ProfilePhotoUpload from './ProfilePhotoUpload';

const WIZARD_SPECIALIZATIONS = [
  'Metselwerk', 'Stucwerk', 'Schilderwerk', 'Tegelwerk',
  'Elektra', 'Loodgieter', 'Timmerwerk', 'Dakdekker',
  'Vloeren', 'Isolatie', 'Gevelrenovatie', 'Grondwerker',
  'Stratenmaker', 'Lasser', 'Machinist', 'Kraanmachinist',
  'Hovenier', 'Overig',
];

const COMMON_CERTS = ['VCA basis', 'VCA VOL', 'Rijbewijs B', 'Rijbewijs BE', 'Rijbewijs C', 'Rijbewijs CE', 'BHV', 'Hoogwerker', 'Steiger'];

interface ProfileWizardProps {
  open: boolean;
  onClose: () => void;
  initialStep?: number;
  profileData: any;
  userId: string;
  avatarUrl: string | null;
  onProfileUpdated: () => void;
  onAvatarUpdated: (url: string | null) => void;
}

const TOTAL_STEPS = 5;

const ProfileWizard = ({
  open,
  onClose,
  initialStep = 0,
  profileData,
  userId,
  avatarUrl,
  onProfileUpdated,
  onAvatarUpdated,
}: ProfileWizardProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Step 1: Personal
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();
  const [bio, setBio] = useState('');

  // Step 3: Specializations
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);

  // Step 4: Certificates
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);

  // Step 5: Financial
  const [bsn, setBsn] = useState('');
  const [iban, setIban] = useState('');
  const [kvk, setKvk] = useState('');

  useEffect(() => {
    if (open && profileData) {
      setFirstName(profileData.first_name || '');
      setLastName(profileData.last_name || '');
      setPhone(profileData.phone || '');
      setCity(profileData.city || '');
      setBio(profileData.bio || '');
      setDateOfBirth(profileData.date_of_birth ? new Date(profileData.date_of_birth) : undefined);
      setSelectedSpecs(profileData.specializations || (profileData.specialization ? [profileData.specialization] : []));
      setBsn(profileData.bsn || '');
      setIban(profileData.iban || '');
      setKvk(profileData.kvk_number || '');
      setStep(initialStep);
    }
  }, [open, profileData, initialStep]);

  const saveStep = async () => {
    setSaving(true);
    try {
      let payload: any = { wizard_step: step + 1 };

      if (step === 0) {
        if (!firstName || !lastName) {
          toast.error(t('auth.fillAllFields'));
          setSaving(false);
          return false;
        }
        payload = {
          ...payload,
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          city: city || null,
          date_of_birth: dateOfBirth ? format(dateOfBirth, 'yyyy-MM-dd') : null,
          bio: bio || null,
        };
      } else if (step === 2) {
        if (selectedSpecs.length === 0) {
          toast.error(t('profile.missing_specialization'));
          setSaving(false);
          return false;
        }
        payload = {
          ...payload,
          specializations: selectedSpecs,
          specialization: selectedSpecs[0],
        };
      } else if (step === 3) {
        // Save certificates
        for (const cert of selectedCerts) {
          const { data: existing } = await supabase
            .from('certificates')
            .select('id')
            .eq('user_id', userId)
            .eq('name', cert)
            .maybeSingle();

          if (!existing) {
            await supabase.from('certificates').insert({
              user_id: userId,
              name: cert,
            });
          }
        }
      } else if (step === 4) {
        payload = {
          ...payload,
          bsn: bsn || null,
          iban: iban || null,
          kvk_number: kvk || null,
        };
      }

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('user_id', userId);

      if (error) throw error;
      onProfileUpdated();
      return true;
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const ok = await saveStep();
    if (ok === false) return;

    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      // Completed all steps
      setShowConfetti(true);
      toast.success(t('profile.profile_complete') + ' 🎉');
      setTimeout(() => {
        setShowConfetti(false);
        onClose();
      }, 2500);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const initials = `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();

  const stepVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <motion.div key="step0" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-4">
            <h2 className="text-lg font-semibold">{t('profile.step_personal')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('profile.firstName')} *</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="bg-card" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('profile.lastName')} *</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} className="bg-card" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('profile.phone')}</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" className="bg-card" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('profile.region')}</Label>
              <Input value={city} onChange={e => setCity(e.target.value)} className="bg-card" />
            </div>
            <div className="space-y-1.5">
              <Label>Geboortedatum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-card", !dateOfBirth && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateOfBirth ? format(dateOfBirth, 'dd-MM-yyyy') : 'Selecteer datum'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateOfBirth} onSelect={setDateOfBirth} disabled={(d) => d > new Date() || d < new Date('1940-01-01')} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>{t('profile.missing_bio')}</Label>
              <Textarea value={bio} onChange={e => setBio(e.target.value)} className="bg-card min-h-[80px]" maxLength={1000} />
            </div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div key="step1" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-4">
            <h2 className="text-lg font-semibold">{t('profile.step_photo')}</h2>
            <ProfilePhotoUpload avatarUrl={avatarUrl} initials={initials} userId={userId} onPhotoUpdated={onAvatarUpdated} />
          </motion.div>
        );

      case 2:
        return (
          <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-4">
            <h2 className="text-lg font-semibold">{t('profile.step_specializations')}</h2>
            <p className="text-sm text-muted-foreground">Selecteer minimaal 1</p>
            <div className="grid grid-cols-2 gap-2">
              {WIZARD_SPECIALIZATIONS.map(spec => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => {
                    setSelectedSpecs(prev =>
                      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
                    );
                  }}
                  className={cn(
                    "py-2.5 px-3 rounded-xl text-sm font-medium border transition-all",
                    selectedSpecs.includes(spec)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-foreground hover:border-primary/50"
                  )}
                >
                  {spec}
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div key="step3" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-4">
            <h2 className="text-lg font-semibold">{t('profile.step_certificates')}</h2>
            <div className="space-y-2">
              {COMMON_CERTS.map(cert => (
                <button
                  key={cert}
                  type="button"
                  onClick={() => {
                    setSelectedCerts(prev =>
                      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
                    );
                  }}
                  className={cn(
                    "flex items-center justify-between w-full py-3 px-4 rounded-xl border transition-all",
                    selectedCerts.includes(cert)
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border"
                  )}
                >
                  <span className="text-sm font-medium text-foreground">{cert}</span>
                  {selectedCerts.includes(cert) && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div key="step4" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-4">
            <h2 className="text-lg font-semibold">{t('profile.step_financial')}</h2>
            <div className="bg-accent/50 rounded-xl p-3 text-xs text-muted-foreground">
              🔒 {t('profile.financial_security_note')}
            </div>
            <div className="space-y-1.5">
              <Label>BSN</Label>
              <Input value={bsn} onChange={e => setBsn(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="•••••••••" maxLength={9} className="bg-card" />
            </div>
            <div className="space-y-1.5">
              <Label>IBAN</Label>
              <Input value={iban} onChange={e => setIban(e.target.value.toUpperCase())} placeholder="NL00 BANK 0000 0000 00" className="bg-card" />
            </div>
            <div className="space-y-1.5">
              <Label>KvK nummer</Label>
              <Input value={kvk} onChange={e => setKvk(e.target.value)} placeholder="12345678" className="bg-card" />
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto p-5">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full transition-all",
                i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/60" : "w-2 bg-border"
              )}
            />
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mb-4">
          {step + 1} / {TOTAL_STEPS}
        </p>

        {showConfetti ? (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center gap-4 py-20"
          >
            <PartyPopper className="w-16 h-16 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">{t('profile.profile_complete')} 🎉</h2>
            <p className="text-muted-foreground text-center">{t('profile.points_earned')}</p>
          </motion.div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>

            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {t('common.back')}
                </Button>
              )}
              <Button onClick={handleNext} disabled={saving} className="flex-1">
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : step === TOTAL_STEPS - 1 ? (
                  <Check className="w-4 h-4 mr-1" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-1" />
                )}
                {step === TOTAL_STEPS - 1 ? t('common.submit') : t('common.next')}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ProfileWizard;
