import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DocumentUploaderProps {
  onUploadComplete?: () => void;
}

export const DocumentUploader = ({ onUploadComplete }: DocumentUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.txt')) {
        toast.error('Ошибка', {
          description: 'Пожалуйста, выберите файл в формате .txt'
        });
        return;
      }
      setFile(selectedFile);
      
      // Auto-fill document name from filename
      const nameWithoutExt = selectedFile.name.replace('.txt', '');
      setDocumentName(nameWithoutExt);
    }
  };

  const handleUpload = async () => {
    if (!file || !documentName.trim()) {
      toast.error('Ошибка', {
        description: 'Выберите файл и укажите название документа'
      });
      return;
    }

    setIsUploading(true);

    try {
      // Read file content
      const text = await file.text();
      
      if (text.length < 100) {
        throw new Error('Файл слишком короткий. Минимум 100 символов');
      }

      toast.info('Обработка документа', {
        description: 'Создание embeddings и индексация...'
      });

      // Send to edge function for processing
      const { data, error } = await supabase.functions.invoke('process-pdf', {
        body: {
          pdfText: text,
          documentName: documentName.trim()
        }
      });

      if (error) throw error;

      toast.success('Успешно!', {
        description: `Документ "${documentName}" загружен. Обработано ${data.chunksProcessed} фрагментов`
      });

      // Reset form
      setFile(null);
      setDocumentName('');
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Ошибка загрузки', {
        description: error.message || 'Не удалось загрузить документ'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload size={20} />
          Загрузка нового документа СП
        </CardTitle>
        <CardDescription>
          Загрузите файл в формате .txt для индексации в векторную базу данных
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="document-name">Название документа</Label>
          <Input
            id="document-name"
            type="text"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="Например: СП 60.13330.2020"
            disabled={isUploading}
          />
          <p className="text-xs text-muted-foreground">
            Это имя будет использоваться для идентификации документа в системе
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="file-upload">Файл документа (.txt)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="file-upload"
              type="file"
              accept=".txt"
              onChange={handleFileChange}
              disabled={isUploading}
              className="flex-1"
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText size={16} />
                <span>{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleUpload}
          disabled={!file || !documentName.trim() || isUploading}
          className="w-full gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Загрузка и индексация...
            </>
          ) : (
            <>
              <Upload size={16} />
              Загрузить документ
            </>
          )}
        </Button>

        {isUploading && (
          <p className="text-sm text-muted-foreground text-center">
            Это может занять несколько минут в зависимости от размера документа...
          </p>
        )}
      </CardContent>
    </Card>
  );
};

