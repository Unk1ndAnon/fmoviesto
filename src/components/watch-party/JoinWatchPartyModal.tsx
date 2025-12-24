import { useState, useEffect } from 'react';
import { Users, Globe, Lock, Loader2, Crown, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { WatchPartyRoom, getDisplayName, setDisplayName } from '@/hooks/useWatchParty';

interface JoinWatchPartyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicRooms: WatchPartyRoom[];
  onJoinRoom: (roomId: string) => Promise<boolean>;
  onJoinByCode: (code: string) => Promise<boolean>;
  onRefreshRooms: () => void;
  isLoading: boolean;
}

export function JoinWatchPartyModal({
  open,
  onOpenChange,
  publicRooms,
  onJoinRoom,
  onJoinByCode,
  onRefreshRooms,
  isLoading,
}: JoinWatchPartyModalProps) {
  const [step, setStep] = useState<'name' | 'join'>('name');
  const [displayName, setName] = useState(getDisplayName());
  const [roomCode, setRoomCode] = useState('');
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      onRefreshRooms();
    }
  }, [open, onRefreshRooms]);

  const handleNameSubmit = () => {
    if (displayName.trim()) {
      setDisplayName(displayName.trim());
      setStep('join');
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    setJoiningRoomId(roomId);
    const success = await onJoinRoom(roomId);
    if (success) {
      onOpenChange(false);
      setStep('name');
    }
    setJoiningRoomId(null);
  };

  const handleJoinByCode = async () => {
    if (!roomCode.trim()) return;
    setJoiningRoomId('code');
    const success = await onJoinByCode(roomCode.trim());
    if (success) {
      onOpenChange(false);
      setStep('name');
      setRoomCode('');
    }
    setJoiningRoomId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Join Watch Party
          </DialogTitle>
          <DialogDescription>
            {step === 'name'
              ? 'Enter your display name'
              : 'Join a public party or enter a room code'}
          </DialogDescription>
        </DialogHeader>

        {step === 'name' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="joinDisplayName">Your Name</Label>
              <Input
                id="joinDisplayName"
                value={displayName}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                autoFocus
              />
            </div>
            <Button
              onClick={handleNameSubmit}
              className="w-full"
              disabled={!displayName.trim()}
            >
              Continue
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="public" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="public" className="gap-2">
                <Globe className="w-4 h-4" />
                Public
              </TabsTrigger>
              <TabsTrigger value="code" className="gap-2">
                <Lock className="w-4 h-4" />
                Room Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="public" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {publicRooms.length} active {publicRooms.length === 1 ? 'party' : 'parties'}
                </p>
                <Button variant="ghost" size="sm" onClick={onRefreshRooms}>
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </Button>
              </div>

              {publicRooms.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {publicRooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => handleJoinRoom(room.id)}
                        disabled={joiningRoomId !== null}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg border border-border",
                          "hover:bg-secondary transition-colors text-left",
                          joiningRoomId === room.id && "opacity-50"
                        )}
                      >
                        <div>
                          <p className="font-medium text-foreground flex items-center gap-2">
                            {room.room_name || 'Watch Party'}
                            <Crown className="w-3 h-3 text-yellow-400" />
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>{room.member_count || 1} watching</span>
                          </div>
                        </div>
                        {joiningRoomId === room.id ? (
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        ) : (
                          <Button size="sm" variant="secondary">
                            Join
                          </Button>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No public parties available</p>
                  <p className="text-sm">Be the first to create one!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="code" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomCode">Room Code</Label>
                <Input
                  id="roomCode"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="font-mono text-center text-lg tracking-widest"
                />
              </div>
              <Button
                onClick={handleJoinByCode}
                disabled={roomCode.length !== 6 || joiningRoomId !== null}
                className="w-full"
              >
                {joiningRoomId === 'code' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Private Party'
                )}
              </Button>
            </TabsContent>

            <div className="pt-4">
              <Button
                variant="outline"
                onClick={() => setStep('name')}
                className="w-full"
              >
                Back
              </Button>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
