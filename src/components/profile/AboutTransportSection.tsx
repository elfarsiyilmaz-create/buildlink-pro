import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form';

interface AboutTransportSectionProps {
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
}

const TRANSPORT_OPTIONS = [
  { value: 'work_van', label: 'Werkbus' },
  { value: 'personal_car', label: 'Eigen auto' },
  { value: 'public_transport', label: 'Openbaar vervoer' },
  { value: 'bicycle', label: 'Fiets' },
  { value: 'none', label: 'Geen' },
];

const AboutTransportSection = ({ register, watch, setValue }: AboutTransportSectionProps) => {
  const { t } = useTranslation();
  const hasEquipment = watch('has_own_equipment') || false;

  return (
    <>
      {/* About / Bio */}
      <div className="space-y-1.5">
        <Label htmlFor="bio">Over mij / Werkervaring</Label>
        <Textarea
          id="bio"
          {...register('bio')}
          placeholder="Vertel iets over jezelf en je werkervaring..."
          className="bg-card min-h-[100px]"
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground">
          {(watch('bio') || '').length}/1000
        </p>
      </div>

      {/* Transport */}
      <div className="space-y-1.5">
        <Label>Vervoer</Label>
        <Select
          value={watch('transport_type') || ''}
          onValueChange={(v) => setValue('transport_type', v)}
        >
          <SelectTrigger className="bg-card">
            <SelectValue placeholder="Hoe kom je naar werk?" />
          </SelectTrigger>
          <SelectContent>
            {TRANSPORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Own Equipment */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Eigen gereedschap/materiaal</Label>
          <Switch
            checked={hasEquipment}
            onCheckedChange={(v) => setValue('has_own_equipment', v)}
          />
        </div>
        {hasEquipment && (
          <div className="space-y-1.5">
            <Label htmlFor="equipment_description">Welk gereedschap heb je?</Label>
            <Textarea
              id="equipment_description"
              {...register('equipment_description')}
              placeholder="Bijv. trilplaat, zaagmachine, schop, eigen veiligheidskleding..."
              className="bg-card min-h-[80px]"
              maxLength={500}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default AboutTransportSection;
