import { useState, useRef, useCallback } from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProfilePhotoUploadProps {
  avatarUrl: string | null;
  initials: string;
  userId: string;
  onPhotoUpdated: (url: string | null) => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

function cropToSquare(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      const maxSize = 512;
      canvas.width = maxSize;
      canvas.height = maxSize;
      const ctx = canvas.getContext('2d')!;
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, maxSize, maxSize);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to crop'))),
        'image/jpeg',
        0.85
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

const ProfilePhotoUpload = ({ avatarUrl, initials, userId, onPhotoUpdated }: ProfilePhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Alleen JPG en PNG bestanden');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Bestand mag maximaal 2MB zijn');
      return;
    }

    try {
      const cropped = await cropToSquare(file);
      setPreviewUrl(URL.createObjectURL(cropped));
      setPreviewBlob(cropped);
      setDialogOpen(true);
    } catch {
      toast.error('Fout bij verwerken afbeelding');
    }

    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleUpload = async () => {
    if (!previewBlob) return;
    setUploading(true);
    try {
      const path = `${userId}/avatar.jpg`;

      // Delete old file first (ignore errors)
      await supabase.storage.from('avatars').remove([path]);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, previewBlob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const url = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      onPhotoUpdated(url);
      toast.success('Profielfoto bijgewerkt');
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Upload mislukt');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      const path = `${userId}/avatar.jpg`;
      await supabase.storage.from('avatars').remove([path]);

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', userId);

      if (error) throw error;

      onPhotoUpdated(null);
      toast.success('Profielfoto verwijderd');
    } catch (err: any) {
      toast.error(err.message || 'Verwijderen mislukt');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-3">
        <Avatar className="w-24 h-24">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt="Profile" />
          ) : null}
          <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
            {initials || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="w-4 h-4 mr-1.5" />
            Foto wijzigen
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
              className="text-destructive hover:text-destructive"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Foto preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-40 h-40">
                <AvatarImage src={previewUrl} alt="Preview" />
              </Avatar>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDialogOpen(false)}
                  disabled={uploading}
                >
                  Annuleren
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Opslaan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfilePhotoUpload;
