import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, CheckCircle } from "lucide-react";

export const PdfProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const { toast } = useToast();

  const handleProcessPdf = async () => {
    setIsProcessing(true);
    try {
      // Fetch the PDF file
      const pdfResponse = await fetch('/sp-60-13330-2020.pdf');
      const pdfBlob = await pdfResponse.blob();
      
      // Read PDF text (simple extraction - in production you'd use pdf.js or similar)
      const text = await pdfBlob.text();
      
      if (!text || text.length < 100) {
        throw new Error('Не удалось извлечь текст из PDF');
      }

      toast({
        title: "Обработка документа",
        description: "Создание embeddings и индексация документа...",
      });

      // Send to edge function for processing
      const { data, error } = await supabase.functions.invoke('process-pdf', {
        body: {
          pdfText: text,
          documentName: 'sp-60-13330-2020'
        }
      });

      if (error) throw error;

      setIsProcessed(true);
      toast({
        title: "Успешно!",
        description: `Обработано ${data.chunksProcessed} фрагментов документа СП 60.13330.2020`,
      });
    } catch (error: any) {
      console.error('Error processing PDF:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обработать PDF документ",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isProcessed ? (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle size={16} />
          <span>PDF проиндексирован</span>
        </div>
      ) : (
        <Button
          onClick={handleProcessPdf}
          disabled={isProcessing}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {isProcessing ? (
            <>
              <Upload size={16} className="animate-spin" />
              <span>Обработка...</span>
            </>
          ) : (
            <>
              <FileText size={16} />
              <span>Индексировать СП 60.13330.2020</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
};