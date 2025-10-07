import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DocumentUploader } from '@/components/DocumentUploader';
import { DocumentsList } from '@/components/DocumentsList';
import { LogOut, Shield, Home } from 'lucide-react';
import { toast } from 'sonner';

const Admin = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLogout = () => {
    logout();
    toast.success('Выход выполнен', {
      description: 'До свидания!'
    });
    navigate('/login');
  };

  const handleUploadComplete = () => {
    // Trigger refresh of documents list
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Панель администратора</h1>
                <p className="text-sm text-muted-foreground">Управление документами СП</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <Home size={16} />
                На главную
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut size={16} />
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Upload Section */}
          <DocumentUploader onUploadComplete={handleUploadComplete} />

          {/* Documents List */}
          <DocumentsList refreshTrigger={refreshTrigger} />

          {/* Info Card */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              ℹ️ Информация
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Поддерживаются только файлы в формате .txt</li>
              <li>• Документы автоматически индексируются в векторную базу данных</li>
              <li>• Процесс индексации может занять несколько минут</li>
              <li>• DeepSeek будет искать ответы только в загруженных документах</li>
              <li>• Для переиндексации документа удалите старую версию и загрузите новую</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;

