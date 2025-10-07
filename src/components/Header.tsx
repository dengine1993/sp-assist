import { FileText, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary to-accent p-2 rounded-lg shadow-elegant">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                SP-Агент
              </h1>
              <p className="text-xs text-muted-foreground">
                Помощник по строительным нормам
              </p>
            </div>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Info className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>О SP-Агенте</DialogTitle>
                <DialogDescription className="space-y-3 pt-2">
                  <p>
                    SP-Агент — это универсальный интеллектуальный помощник для работы со 
                    строительными нормами и правилами (СП).
                  </p>
                  <p>
                    Задавайте вопросы по любым загруженным документам СП, и агент найдет ответы 
                    строго на основе официальных документов.
                  </p>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-semibold mb-1">Возможности:</p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Поиск по всем загруженным документам СП</li>
                      <li>Ответы на технические вопросы</li>
                      <li>Ссылки на конкретные документы и разделы</li>
                      <li>Работа только с проверенными нормативами</li>
                    </ul>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                      <strong>Примечание:</strong> Документы СП загружаются администратором через 
                      специальную панель управления.
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
};
