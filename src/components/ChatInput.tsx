import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onSearchSP: () => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSendMessage, onSearchSP, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={onSearchSP}
          disabled={disabled}
          className="bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-accent-foreground shadow-md hover:shadow-lg transition-all duration-200"
        >
          <FileText className="w-4 h-4 mr-2" />
          Поиск по СП 60.13330.2020
        </Button>
      </div>
      <div className="relative">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Задайте вопрос по ОВиК..."
          disabled={disabled}
          className={cn(
            "min-h-[80px] pr-12 resize-none transition-all duration-200",
            "focus:ring-2 focus:ring-primary/20"
          )}
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || !message.trim()}
          className="absolute right-2 bottom-2 bg-primary hover:bg-primary-hover text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Нажмите Enter для отправки, Shift+Enter для новой строки
      </p>
    </form>
  );
};
