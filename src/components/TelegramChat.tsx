import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const TELEGRAM_GROUP_URL = "https://t.me/+RZrnNXoMFkwzMWM0";

interface TelegramMessage {
  id: number;
  text: string;
  from: string;
  username: string | null;
  date: number;
  chat_title: string;
}

const TelegramChat = () => {
  const [isOpen, setIsOpen] = useState(false);

  const { data: messages, isLoading, error } = useQuery({
    queryKey: ['telegram-messages'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('telegram-messages');
      if (error) throw error;
      return data.messages as TelegramMessage[];
    },
    enabled: isOpen,
    refetchInterval: isOpen ? 30000 : false, // Refresh every 30s when open
  });

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 h-96 bg-background border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-[#0088cc] text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.154.232.17.325.015.093.034.305.019.471z" />
              </svg>
              <span className="font-medium text-sm">Telegram Chat</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#0088cc]"></div>
              </div>
            )}
            
            {error && (
              <div className="text-center text-muted-foreground text-sm p-4">
                <p>Unable to load messages</p>
                <p className="text-xs mt-1">Make sure the bot is added to the group</p>
              </div>
            )}

            {messages && messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm p-4">
                <p>No messages yet</p>
                <p className="text-xs mt-1">Messages will appear here once the bot receives them</p>
              </div>
            )}

            {messages && messages.length > 0 && (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="bg-muted/50 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-primary">
                        {msg.from}
                        {msg.username && (
                          <span className="text-muted-foreground ml-1">@{msg.username}</span>
                        )}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(msg.date)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="p-3 border-t border-border">
            <a
              href={TELEGRAM_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-md text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Join Group
            </a>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#0088cc] hover:bg-[#0077b5] rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        aria-label="Toggle Telegram Chat"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-7 h-7 text-white"
          >
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.154.232.17.325.015.093.034.305.019.471z" />
          </svg>
        )}
      </button>
    </>
  );
};

export default TelegramChat;
