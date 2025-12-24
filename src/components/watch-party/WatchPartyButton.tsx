import { useState } from 'react';
import { Users, Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CreateWatchPartyModal } from './CreateWatchPartyModal';
import { JoinWatchPartyModal } from './JoinWatchPartyModal';
import { WatchPartyRoom } from '@/hooks/useWatchParty';

interface WatchPartyButtonProps {
  onCreateRoom: (isPublic: boolean, name?: string) => Promise<string | null>;
  onJoinRoom: (roomId: string) => Promise<boolean>;
  onJoinByCode: (code: string) => Promise<boolean>;
  onRefreshRooms: () => void;
  publicRooms: WatchPartyRoom[];
  isLoading: boolean;
  title: string;
}

export function WatchPartyButton({
  onCreateRoom,
  onJoinRoom,
  onJoinByCode,
  onRefreshRooms,
  publicRooms,
  isLoading,
  title,
}: WatchPartyButtonProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="w-4 h-4" />
            Watch Party
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Party
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowJoin(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Join Party
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWatchPartyModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreateRoom={onCreateRoom}
        isLoading={isLoading}
        title={title}
      />

      <JoinWatchPartyModal
        open={showJoin}
        onOpenChange={setShowJoin}
        publicRooms={publicRooms}
        onJoinRoom={onJoinRoom}
        onJoinByCode={onJoinByCode}
        onRefreshRooms={onRefreshRooms}
        isLoading={isLoading}
      />
    </>
  );
}
