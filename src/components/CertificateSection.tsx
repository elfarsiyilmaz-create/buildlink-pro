import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { Plus, Trash2, AlertTriangle, FileText, Upload, Loader2, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Certificate {
  id: string;
  name: string;
  expiry_date: string | null;
  file_url: string | null;
  file_name: string | null;
}

const CertificateSection = () => {
  const { t } = useTranslation();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newExpiry, setNewExpiry] = useState<Date | undefined>();
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCertificates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('certificates')
      .select('id, name, expiry_date, file_url, file_name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    else setCertificates(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCertificates(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error(t('certificates.nameRequired'));
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (newFile) {
        fileName = newFile.name;
        const filePath = `${user.id}/${Date.now()}_${newFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('certificates')
          .upload(filePath, newFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('certificates')
          .getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('certificates').insert({
        user_id: user.id,
        name: newName.trim(),
        expiry_date: newExpiry ? format(newExpiry, 'yyyy-MM-dd') : null,
        file_url: fileUrl,
        file_name: fileName,
      });
      if (error) throw error;

      toast.success(t('certificates.added'));
      setNewName('');
      setNewExpiry(undefined);
      setNewFile(null);
      setAdding(false);
      fetchCertificates();
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (cert: Certificate) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete file from storage if exists
      if (cert.file_url) {
        const path = cert.file_url.split('/certificates/')[1];
        if (path) {
          await supabase.storage.from('certificates').remove([path]);
        }
      }

      const { error } = await supabase.from('certificates').delete().eq('id', cert.id);
      if (error) throw error;
      toast.success(t('certificates.deleted'));
      fetchCertificates();
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    }
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    return differenceInDays(new Date(date), new Date()) <= 30;
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t('certificates.title')}</h2>
        {!adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4 mr-1" />
            {t('certificates.add')}
          </Button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="space-y-3 p-4 rounded-xl bg-muted/50 border border-border">
          <div className="space-y-1.5">
            <Label>{t('certificates.name')}</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('certificates.namePlaceholder')}
              className="bg-card"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('certificates.expiryDate')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-card",
                    !newExpiry && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newExpiry ? format(newExpiry, 'dd-MM-yyyy') : t('certificates.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newExpiry}
                  onSelect={setNewExpiry}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label>{t('certificates.file')}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="hidden"
              onChange={(e) => setNewFile(e.target.files?.[0] || null)}
            />
            <Button
              variant="outline"
              className="w-full bg-card"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {newFile ? newFile.name : t('certificates.chooseFile')}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleAdd} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('common.save')}
            </Button>
            <Button variant="outline" onClick={() => { setAdding(false); setNewName(''); setNewExpiry(undefined); setNewFile(null); }}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : certificates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">{t('certificates.empty')}</p>
      ) : (
        <div className="space-y-2">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                isExpired(cert.expiry_date) ? "border-destructive/50 bg-destructive/5" :
                isExpiringSoon(cert.expiry_date) ? "border-warning/50 bg-warning/5" :
                "border-border bg-card"
              )}
            >
              <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{cert.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {cert.expiry_date && (
                    <span className={cn(
                      isExpired(cert.expiry_date) ? "text-destructive" :
                      isExpiringSoon(cert.expiry_date) ? "text-warning" : ""
                    )}>
                      {format(new Date(cert.expiry_date), 'dd-MM-yyyy')}
                    </span>
                  )}
                  {cert.file_name && <span className="truncate">• {cert.file_name}</span>}
                </div>
              </div>
              {(isExpiringSoon(cert.expiry_date) || isExpired(cert.expiry_date)) && (
                <AlertTriangle className={cn(
                  "w-4 h-4 shrink-0",
                  isExpired(cert.expiry_date) ? "text-destructive" : "text-warning"
                )} />
              )}
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(cert)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CertificateSection;
