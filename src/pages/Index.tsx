import { useState } from "react";
import { Header } from "@/components/Header";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Здравствуйте! Я SP-Assistant — помощник по СП 60.13330.2020 \"Отопление, вентиляция и кондиционирование воздуха\". Задайте мне вопрос или используйте кнопку поиска для работы с документом.",
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response (will be replaced with actual AI when Lovable Cloud is enabled)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Функция AI-ответов будет доступна после подключения Lovable Cloud. Пока что я могу помочь вам с базовой информацией о СП 60.13330.2020.",
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleSearchSP = () => {
    toast.info("Открываю СП 60.13330.2020", {
      description: "Документ откроется в новой вкладке"
    });
    window.open("/sp-60-13330-2020.pdf", "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-muted/30">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        <div className="flex-1 mb-6 bg-card rounded-xl shadow-elegant border border-border overflow-hidden">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="p-6 space-y-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                />
              ))}
              {isLoading && (
                <div className="flex gap-3 p-4 rounded-lg bg-card border border-border">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground shrink-0">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Думаю...</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="bg-card rounded-xl shadow-elegant border border-border p-4">
          <ChatInput
            onSendMessage={handleSendMessage}
            onSearchSP={handleSearchSP}
            disabled={isLoading}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
