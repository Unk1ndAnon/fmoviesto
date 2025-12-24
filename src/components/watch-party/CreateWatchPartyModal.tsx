import { useState } from 'react';
import { Globe, Lock, Users, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getDisplayName, setDisplayName } from '@/hooks/useWatchParty';

interface CreateWatchPartyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRoom: (isPublic: boolean, name?: string) => Promise<string | null>;
  isLoading: boolean;
  title: string;
}

export function CreateWatchPartyModal({
  open,
  onOpenChange,
  onCreateRoom,
  isLoading,
  title,
}: CreateWatchPartyModalProps) {
  const [step, setStep] = useState<'name' | 'type'>('name');
  const [displayName, setName] = useState(getDisplayName());
  const [roomType, setRoomType] = useState<'public' | 'private'>('public');

  const handleNameSubmit = () => {
    if (displayName.trim()) {
      setDisplayName(displayName.trim());
      setStep('type');
    }
  };

  const handleCreate = async () => {
    const roomId = await onCreateRoom(roomType === 'public', `${displayName}'s ${title} Party`);
    if (roomId) {
      onOpenChange(false);
      setStep('name');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Create Watch Party
          </DialogTitle>
          <DialogDescription>
            {step === 'name'
              ? 'Enter your display name for the party'
              : 'Choose who can join your party'}
          </DialogDescription>
        </DialogHeader>

        {step === 'name' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Your Name</Label>
              <Input
                id="displayName"
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
          <div className="space-y-4">
            {/* Room Type Selection */}
            <div className="grid gap-3">
              <button
                onClick={() => setRoomType('public')}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left",
                  roomType === 'public'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "p-2 rounded-full",
                  roomType === 'public' ? "bg-primary text-primary-foreground" : "bg-secondary"
                )}>
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Public Party</p>
                  <p className="text-sm text-muted-foreground">
                    Anyone watching this content can join
                  </p>
                </div>
              </button>

              <button
                onClick={() => setRoomType('private')}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left",
                  roomType === 'private'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "p-2 rounded-full",
                  roomType === 'private' ? "bg-primary text-primary-foreground" : "bg-secondary"
                )}>
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Private Party</p>
                  <p className="text-sm text-muted-foreground">
                    Only people with the room code can join
                  </p>
                </div>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('name')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Party'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
