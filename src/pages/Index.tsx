import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Shield, RefreshCw, User, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedDocuments, setLoadedDocuments] = useState<string[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    toast.success('Выход выполнен');
  };

  // Load available documents
  const loadDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('document_chunks')
        .select('document_name')
        .order('document_name');

      if (error) throw error;

      // Get unique document names
      const uniqueDocs = [...new Set(data?.map(chunk => chunk.document_name) || [])];
      setLoadedDocuments(uniqueDocs);

      // Set initial greeting based on loaded documents
      if (uniqueDocs.length > 0) {
        setMessages([{
          id: "1",
          role: "assistant",
          content: `Здравствуйте! Я SP-Агент — универсальный помощник по строительным нормам и правилам.\n\n📚 В системе загружено документов: ${uniqueDocs.length}\n${uniqueDocs.map(doc => `• ${doc}`).join('\n')}\n\nЗадайте мне вопрос по любому из загруженных документов!`,
          timestamp: new Date().toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        setMessages([{
          id: "1",
          role: "assistant",
          content: "Здравствуйте! Я SP-Агент — помощник по строительным нормам.\n\n⚠️ В системе пока нет загруженных документов. Обратитесь к администратору для загрузки документов СП.",
          timestamp: new Date().toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      
      const allMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;
      let assistantContent = '';
      let assistantMessageId = (Date.now() + 1).toString();

      const createOrUpdateAssistantMessage = (content: string) => {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant' && lastMessage.id === assistantMessageId) {
            return prev.map(m => 
              m.id === assistantMessageId 
                ? { ...m, content } 
                : m
            );
          }
          return [...prev, {
            id: assistantMessageId,
            role: 'assistant' as const,
            content,
            timestamp: new Date().toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })
          }];
        });
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              createOrUpdateAssistantMessage(assistantContent);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Ошибка при отправке сообщения', {
        description: 'Пожалуйста, попробуйте еще раз'
      });
      setIsLoading(false);
    }
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
      
      <div className="border-b bg-card/50 backdrop-blur-sm px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            {isLoadingDocs ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw size={16} className="animate-spin" />
                <span>Загрузка документов...</span>
              </div>
            ) : loadedDocuments.length > 0 ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <FileText size={16} className="text-primary" />
                  <span className="font-medium">Загружено документов: {loadedDocuments.length}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {loadedDocuments.slice(0, 3).map((doc) => (
                    <Badge key={doc} variant="secondary" className="text-xs">
                      {doc}
                    </Badge>
                  ))}
                  {loadedDocuments.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{loadedDocuments.length - 3} ещё
                    </Badge>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <FileText size={16} />
                <span>Нет загруженных документов</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
                className="gap-2"
              >
                <Shield size={16} />
                Админ-панель
              </Button>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User size={16} />
                    {user.user_metadata?.full_name || 'Профиль'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User size={16} className="mr-2" />
                    Личный кабинет
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogIn size={16} className="mr-2" />
                    Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/user-login')}
                  className="gap-2"
                >
                  <LogIn size={16} />
                  Вход
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate('/register')}
                  className="gap-2"
                >
                  <UserPlus size={16} />
                  Регистрация
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        <div className="flex-1 mb-6 bg-card rounded-xl shadow-elegant border border-border overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-340px)]">
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
                    <p className="text-sm text-muted-foreground">SP-Assistant анализирует документ...</p>
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
