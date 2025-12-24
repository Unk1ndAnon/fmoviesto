import { useState, useRef, useEffect } from 'react';
import { Send, Smile, X, Crown, Users, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { WatchPartyMessage, WatchPartyMember, getDisplayName } from '@/hooks/useWatchParty';
import { toast } from 'sonner';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

interface WatchPartyChatProps {
  messages: WatchPartyMessage[];
  members: WatchPartyMember[];
  isHost: boolean;
  isConnected: boolean;
  roomCode?: string;
  sessionId: string;
  onSendMessage: (message: string, type?: 'chat' | 'reaction') => void;
  onClose: () => void;
  onLeave: () => void;
}

export function WatchPartyChat({
  messages,
  members,
  isHost,
  isConnected,
  roomCode,
  sessionId,
  onSendMessage,
  onClose,
  onLeave,
}: WatchPartyChatProps) {
  const [input, setInput] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const displayName = getDisplayName();

  const getInviteLink = () => {
    if (!roomCode) return '';
    const path = window.location.pathname;
    return `https://fmov.online${path}?party=${roomCode}`;
  };

  const copyInviteLink = () => {
    if (!roomCode) return;
    const url = getInviteLink();
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emoji: string) => {
    onSendMessage(emoji, 'reaction');
    setShowEmojis(false);
  };

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">{members.length}</span>
          </div>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-yellow-500"
          )} />
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Room Code & Invite */}
      {roomCode && (
        <div className="px-4 py-3 bg-primary/10 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Room Code</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyInviteLink}
              className="h-7 gap-1 text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
          <p className="font-mono font-bold text-primary mb-2">{roomCode}</p>
          <div className="bg-background/50 rounded p-2">
            <p className="text-xs text-muted-foreground mb-1">Invite Link</p>
            <p className="text-xs font-mono text-foreground break-all select-all">
              {getInviteLink()}
            </p>
          </div>
        </div>
      )}

      {/* Members */}
      <div className="px-4 py-2 border-b border-border">
        <p className="text-xs text-muted-foreground mb-2">In Party</p>
        <div className="flex flex-wrap gap-1">
          {members.map((member) => (
            <span
              key={member.id}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                member.session_id === sessionId
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {member.is_host && <Crown className="w-3 h-3 text-yellow-400" />}
              {member.display_name}
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col",
                msg.message_type === 'system' && "items-center"
              )}
            >
              {msg.message_type === 'system' ? (
                <span className="text-xs text-muted-foreground italic">
                  {msg.message}
                </span>
              ) : msg.message_type === 'reaction' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {msg.display_name}
                  </span>
                  <span className="text-2xl">{msg.message}</span>
                </div>
              ) : (
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2",
                    msg.session_id === sessionId
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {msg.session_id !== sessionId && (
                    <p className="text-xs font-medium mb-1 opacity-70">
                      {msg.display_name}
                    </p>
                  )}
                  <p className="text-sm break-words">{msg.message}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Emoji Bar */}
      {showEmojis && (
        <div className="flex gap-2 px-4 py-2 border-t border-border bg-secondary/50">
          {EMOJI_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="text-xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojis(!showEmojis)}
            className="shrink-0"
          >
            <Smile className="w-5 h-5" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button onClick={handleSend} size="icon" className="shrink-0">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Leave Button */}
      <div className="p-4 pt-0">
        <Button
          variant="destructive"
          className="w-full"
          onClick={onLeave}
        >
          {isHost ? 'End Party' : 'Leave Party'}
        </Button>
      </div>
    </div>
  );
}
