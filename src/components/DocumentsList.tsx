import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileText, Trash2, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DocumentInfo {
  name: string;
  chunksCount: number;
  lastUpdated: string;
}

interface DocumentsListProps {
  refreshTrigger?: number;
}

export const DocumentsList = ({ refreshTrigger }: DocumentsListProps) => {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_chunks')
        .select('document_name, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by document name and count chunks
      const docsMap = new Map<string, DocumentInfo>();
      
      data?.forEach((chunk) => {
        const existing = docsMap.get(chunk.document_name);
        if (existing) {
          existing.chunksCount++;
          if (new Date(chunk.created_at) > new Date(existing.lastUpdated)) {
            existing.lastUpdated = chunk.created_at;
          }
        } else {
          docsMap.set(chunk.document_name, {
            name: chunk.document_name,
            chunksCount: 1,
            lastUpdated: chunk.created_at
          });
        }
      });

      setDocuments(Array.from(docsMap.values()));
    } catch (error: any) {
      console.error('Error loading documents:', error);
      toast.error('Ошибка загрузки', {
        description: 'Не удалось загрузить список документов'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [refreshTrigger]);

  const handleDelete = async (documentName: string) => {
    try {
      const { error } = await supabase
        .from('document_chunks')
        .delete()
        .eq('document_name', documentName);

      if (error) throw error;

      toast.success('Успешно', {
        description: `Документ "${documentName}" удален`
      });

      loadDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error('Ошибка удаления', {
        description: 'Не удалось удалить документ'
      });
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const openDeleteDialog = (documentName: string) => {
    setDocumentToDelete(documentName);
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} />
                Загруженные документы
              </CardTitle>
              <CardDescription>
                Список всех проиндексированных документов СП
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDocuments}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Обновить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="animate-spin mr-2" size={20} />
              <span className="text-muted-foreground">Загрузка...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText size={48} className="mx-auto mb-2 opacity-50" />
              <p>Нет загруженных документов</p>
              <p className="text-sm">Загрузите первый документ СП</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.name}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle size={16} className="text-green-600" />
                      <h3 className="font-medium">{doc.name}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="gap-1">
                        <FileText size={12} />
                        {doc.chunksCount} фрагментов
                      </Badge>
                      <span>
                        Обновлено: {new Date(doc.lastUpdated).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openDeleteDialog(doc.name)}
                    className="gap-2"
                  >
                    <Trash2 size={16} />
                    Удалить
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить документ?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы действительно хотите удалить документ "{documentToDelete}"?
              Все фрагменты будут удалены из базы данных. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => documentToDelete && handleDelete(documentToDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

