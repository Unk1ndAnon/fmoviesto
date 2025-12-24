import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Generate or get session ID for anonymous users
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('watch_party_session_id');
  if (!sessionId) {
    sessionId = `anon_${crypto.randomUUID()}`;
    localStorage.setItem('watch_party_session_id', sessionId);
  }
  return sessionId;
};

// Random nickname generator
const ADJECTIVES = [
  'Happy', 'Sleepy', 'Brave', 'Swift', 'Clever', 'Mighty', 'Gentle', 'Wild', 
  'Cosmic', 'Golden', 'Silent', 'Lucky', 'Mystic', 'Funky', 'Chill', 'Epic',
  'Groovy', 'Zen', 'Neon', 'Turbo', 'Hyper', 'Ultra', 'Mega', 'Super'
];

const NOUNS = [
  'Panda', 'Tiger', 'Eagle', 'Dolphin', 'Phoenix', 'Dragon', 'Wolf', 'Fox',
  'Koala', 'Owl', 'Falcon', 'Otter', 'Bear', 'Lion', 'Raven', 'Shark',
  'Penguin', 'Unicorn', 'Wizard', 'Ninja', 'Pirate', 'Knight', 'Viking', 'Samurai'
];

const generateRandomNickname = (): string => {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = Math.floor(Math.random() * 99) + 1;
  return `${adjective}${noun}${number}`;
};

// Get or set display name
export const getDisplayName = (): string => {
  let name = localStorage.getItem('watch_party_display_name');
  if (!name) {
    name = generateRandomNickname();
    localStorage.setItem('watch_party_display_name', name);
  }
  return name;
};

export const setDisplayName = (name: string): void => {
  localStorage.setItem('watch_party_display_name', name);
};

export interface WatchPartyRoom {
  id: string;
  host_session_id: string;
  tmdb_id: number;
  media_type: string;
  season?: number;
  episode?: number;
  is_public: boolean;
  room_code?: string;
  room_name?: string;
  playback_time: number;
  is_playing: boolean;
  max_members: number;
  created_at: string;
  member_count?: number;
}

export interface WatchPartyMember {
  id: string;
  room_id: string;
  session_id: string;
  display_name: string;
  is_host: boolean;
  joined_at: string;
  last_ping: string;
}

export interface WatchPartyMessage {
  id: string;
  room_id: string;
  session_id: string;
  display_name: string;
  message: string;
  message_type: 'chat' | 'system' | 'reaction';
  created_at: string;
}

// Sync event types for real-time broadcast
export type SyncEventType = 'sync_start' | 'sync_countdown' | 'play' | 'pause' | 'seek' | 'heartbeat';

export interface SyncEvent {
  type: SyncEventType;
  timestamp: number; // Server timestamp when event was sent
  targetTime: number; // Target playback time in seconds
  isPlaying: boolean;
  countdownSeconds?: number; // For sync_countdown events
  hostSessionId: string;
}

export interface HeartbeatData {
  hostTime: number;
  hostPlaying: boolean;
  timestamp: number;
}

interface UseWatchPartyOptions {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  onPlaybackUpdate?: (time: number, isPlaying: boolean) => void;
  onSyncEvent?: (event: SyncEvent) => void;
}

const HEARTBEAT_INTERVAL = 3000; // 3 seconds for more responsive sync
const DRIFT_THRESHOLD = 5; // 5 seconds drift threshold (reduced for tighter sync)

export function useWatchParty(options: UseWatchPartyOptions) {
  const { tmdbId, mediaType, season, episode, onPlaybackUpdate, onSyncEvent } = options;
  const sessionId = getSessionId();
  
  const [room, setRoom] = useState<WatchPartyRoom | null>(null);
  const [members, setMembers] = useState<WatchPartyMember[]>([]);
  const [messages, setMessages] = useState<WatchPartyMessage[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [publicRooms, setPublicRooms] = useState<WatchPartyRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Sync state
  const [lastHostHeartbeat, setLastHostHeartbeat] = useState<HeartbeatData | null>(null);
  const [driftSeconds, setDriftSeconds] = useState(0);
  const [isOutOfSync, setIsOutOfSync] = useState(false);
  const [viewerTime, setViewerTime] = useState(0);
  
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const syncChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Generate room code
  const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Fetch public rooms for this content
  const fetchPublicRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from('watch_party_rooms')
      .select('*, watch_party_members(count)')
      .eq('tmdb_id', tmdbId)
      .eq('media_type', mediaType)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      const roomsWithCount = data.map(room => ({
        ...room,
        member_count: (room.watch_party_members as any)?.[0]?.count || 0
      }));
      setPublicRooms(roomsWithCount);
    }
  }, [tmdbId, mediaType]);

  // Send sync event to all viewers via Supabase Realtime broadcast
  const sendSyncEvent = useCallback((event: Omit<SyncEvent, 'hostSessionId' | 'timestamp'>) => {
    if (!room || !isHost || !syncChannelRef.current) return;
    
    const fullEvent: SyncEvent = {
      ...event,
      hostSessionId: sessionId,
      timestamp: Date.now(),
    };
    
    syncChannelRef.current.send({
      type: 'broadcast',
      event: 'sync_event',
      payload: fullEvent,
    });
    
    console.log('Sent sync event:', fullEvent);
  }, [room, isHost, sessionId]);

  // Send heartbeat (host only)
  const sendHeartbeat = useCallback((time: number, playing: boolean) => {
    if (!room || !isHost || !syncChannelRef.current) return;
    
    const heartbeat: HeartbeatData = {
      hostTime: time,
      hostPlaying: playing,
      timestamp: Date.now(),
    };
    
    syncChannelRef.current.send({
      type: 'broadcast',
      event: 'heartbeat',
      payload: heartbeat,
    });
  }, [room, isHost]);

  // Update viewer's current time (for drift detection)
  const updateViewerTime = useCallback((time: number) => {
    setViewerTime(time);
    
    if (lastHostHeartbeat && !isHost) {
      // Calculate drift based on time elapsed since heartbeat
      const elapsed = (Date.now() - lastHostHeartbeat.timestamp) / 1000;
      const expectedHostTime = lastHostHeartbeat.hostPlaying 
        ? lastHostHeartbeat.hostTime + elapsed 
        : lastHostHeartbeat.hostTime;
      const drift = Math.abs(time - expectedHostTime);
      setDriftSeconds(drift);
      setIsOutOfSync(drift > DRIFT_THRESHOLD);
    }
  }, [lastHostHeartbeat, isHost]);

  // Initiate countdown sync (host only)
  const initiateCountdownSync = useCallback((targetTime: number, countdownSeconds: number = 5) => {
    if (!isHost) return;
    
    // First, send countdown event
    sendSyncEvent({
      type: 'sync_countdown',
      targetTime,
      isPlaying: false,
      countdownSeconds,
    });
    
    // After countdown, send play event
    setTimeout(() => {
      sendSyncEvent({
        type: 'play',
        targetTime,
        isPlaying: true,
      });
    }, countdownSeconds * 1000);
  }, [isHost, sendSyncEvent]);

  // Send play/pause events
  const sendPlayEvent = useCallback((time: number) => {
    sendSyncEvent({
      type: 'play',
      targetTime: time,
      isPlaying: true,
    });
  }, [sendSyncEvent]);

  const sendPauseEvent = useCallback((time: number) => {
    sendSyncEvent({
      type: 'pause',
      targetTime: time,
      isPlaying: false,
    });
  }, [sendSyncEvent]);

  const sendSeekEvent = useCallback((time: number, isPlaying: boolean) => {
    sendSyncEvent({
      type: 'seek',
      targetTime: time,
      isPlaying,
    });
  }, [sendSyncEvent]);

  // Create a new room
  const createRoom = async (isPublic: boolean, roomName?: string): Promise<string | null> => {
    setIsLoading(true);
    const displayName = getDisplayName();
    const roomCode = isPublic ? undefined : generateRoomCode();

    try {
      // Create room
      const { data: roomData, error: roomError } = await supabase
        .from('watch_party_rooms')
        .insert({
          host_session_id: sessionId,
          tmdb_id: tmdbId,
          media_type: mediaType,
          season,
          episode,
          is_public: isPublic,
          room_code: roomCode,
          room_name: roomName || `${displayName}'s Party`,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add host as member
      const { error: memberError } = await supabase
        .from('watch_party_members')
        .insert({
          room_id: roomData.id,
          session_id: sessionId,
          display_name: displayName,
          is_host: true,
        });

      if (memberError) throw memberError;

      // Send system message
      await supabase.from('watch_party_messages').insert({
        room_id: roomData.id,
        session_id: sessionId,
        display_name: displayName,
        message: `${displayName} created the watch party`,
        message_type: 'system',
      });

      setRoom(roomData);
      setIsHost(true);
      return roomData.id;
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create watch party');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Join a room
  const joinRoom = async (roomId: string): Promise<boolean> => {
    setIsLoading(true);
    const displayName = getDisplayName();

    try {
      // Fetch room data
      const { data: roomData, error: roomError } = await supabase
        .from('watch_party_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;

      // Add as member
      const { error: memberError } = await supabase
        .from('watch_party_members')
        .upsert({
          room_id: roomId,
          session_id: sessionId,
          display_name: displayName,
          is_host: false,
        }, { onConflict: 'room_id,session_id' });

      if (memberError) throw memberError;

      // Send join message
      await supabase.from('watch_party_messages').insert({
        room_id: roomId,
        session_id: sessionId,
        display_name: displayName,
        message: `${displayName} joined the party`,
        message_type: 'system',
      });

      setRoom(roomData);
      setIsHost(roomData.host_session_id === sessionId);
      return true;
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join watch party');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Join by room code
  const joinByCode = async (code: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('watch_party_rooms')
      .select('id')
      .eq('room_code', code.toUpperCase())
      .single();

    if (error || !data) {
      toast.error('Invalid room code');
      return false;
    }

    return joinRoom(data.id);
  };

  // Leave room
  const leaveRoom = async () => {
    if (!room) return;

    const displayName = getDisplayName();

    // Send leave message
    await supabase.from('watch_party_messages').insert({
      room_id: room.id,
      session_id: sessionId,
      display_name: displayName,
      message: `${displayName} left the party`,
      message_type: 'system',
    });

    // Remove member
    await supabase
      .from('watch_party_members')
      .delete()
      .eq('room_id', room.id)
      .eq('session_id', sessionId);

    // If host, delete room
    if (isHost) {
      await supabase
        .from('watch_party_rooms')
        .delete()
        .eq('id', room.id);
    }

    setRoom(null);
    setMembers([]);
    setMessages([]);
    setIsHost(false);
    setIsConnected(false);
    setLastHostHeartbeat(null);
    setDriftSeconds(0);
    setIsOutOfSync(false);
  };

  // Send message
  const sendMessage = async (message: string, type: 'chat' | 'reaction' = 'chat') => {
    if (!room) return;

    const displayName = getDisplayName();

    await supabase.from('watch_party_messages').insert({
      room_id: room.id,
      session_id: sessionId,
      display_name: displayName,
      message,
      message_type: type,
    });
  };

  // Update playback (host only) - also sends sync event
  const updatePlayback = async (time: number, playing: boolean) => {
    if (!room || !isHost) return;

    await supabase
      .from('watch_party_rooms')
      .update({
        playback_time: time,
        is_playing: playing,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', room.id);
  };

  // Subscribe to room updates and sync channel
  useEffect(() => {
    if (!room) return;

    // Fetch initial members and messages
    const fetchInitialData = async () => {
      const [membersRes, messagesRes] = await Promise.all([
        supabase
          .from('watch_party_members')
          .select('*')
          .eq('room_id', room.id)
          .order('joined_at', { ascending: true }),
        supabase
          .from('watch_party_messages')
          .select('*')
          .eq('room_id', room.id)
          .order('created_at', { ascending: true })
          .limit(100),
      ]);

      if (membersRes.data) setMembers(membersRes.data);
      if (messagesRes.data) setMessages(messagesRes.data as WatchPartyMessage[]);
    };

    fetchInitialData();

    // Set up realtime subscription for database changes
    const channel = supabase
      .channel(`watch_party_${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'watch_party_rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as WatchPartyRoom;
            setRoom(updated);
            if (!isHost && onPlaybackUpdate) {
              onPlaybackUpdate(updated.playback_time, updated.is_playing);
            }
          } else if (payload.eventType === 'DELETE') {
            toast.info('Watch party has ended');
            setRoom(null);
            setIsConnected(false);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'watch_party_members', filter: `room_id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMembers(prev => [...prev, payload.new as WatchPartyMember]);
          } else if (payload.eventType === 'DELETE') {
            setMembers(prev => prev.filter(m => m.id !== (payload.old as any).id));
          } else if (payload.eventType === 'UPDATE') {
            setMembers(prev => prev.map(m => m.id === (payload.new as WatchPartyMember).id ? payload.new as WatchPartyMember : m));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'watch_party_messages', filter: `room_id=eq.${room.id}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as WatchPartyMessage]);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Set up sync broadcast channel for low-latency events
    const syncChannel = supabase.channel(`sync_${room.id}`, {
      config: {
        broadcast: { self: false },
      },
    });

    syncChannel
      .on('broadcast', { event: 'sync_event' }, ({ payload }) => {
        const event = payload as SyncEvent;
        console.log('Received sync event:', event);
        
        if (!isHost && onSyncEvent) {
          onSyncEvent(event);
        }
      })
      .on('broadcast', { event: 'heartbeat' }, ({ payload }) => {
        const heartbeat = payload as HeartbeatData;
        
        if (!isHost) {
          setLastHostHeartbeat(heartbeat);
        }
      })
      .subscribe();

    syncChannelRef.current = syncChannel;

    // Host sends heartbeats
    if (isHost) {
      heartbeatIntervalRef.current = setInterval(() => {
        if (room) {
          sendHeartbeat(room.playback_time, room.is_playing);
        }
      }, HEARTBEAT_INTERVAL);
    }

    // Ping to stay active
    pingIntervalRef.current = setInterval(async () => {
      await supabase
        .from('watch_party_members')
        .update({ last_ping: new Date().toISOString() })
        .eq('room_id', room.id)
        .eq('session_id', sessionId);
    }, 30000);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (syncChannelRef.current) {
        supabase.removeChannel(syncChannelRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [room?.id, isHost, sessionId, onPlaybackUpdate, onSyncEvent, sendHeartbeat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room) {
        leaveRoom();
      }
    };
  }, []);

  // Broadcast sync from player events (for Vidify integration)
  const broadcastPlayerEvent = useCallback((eventType: string, currentTime: number) => {
    if (!isHost || !syncChannelRef.current) return;

    // Map player events to sync events
    if (eventType === 'play') {
      sendPlayEvent(currentTime);
    } else if (eventType === 'pause') {
      sendPauseEvent(currentTime);
    } else if (eventType === 'seeking') {
      sendSeekEvent(currentTime, room?.is_playing || false);
    }

    // Always send heartbeat with current time
    sendHeartbeat(currentTime, eventType === 'play' || eventType === 'progress');
  }, [isHost, room, sendPlayEvent, sendPauseEvent, sendSeekEvent, sendHeartbeat]);

  return {
    room,
    members,
    messages,
    isHost,
    isConnected,
    isLoading,
    publicRooms,
    sessionId,
    // Sync state
    lastHostHeartbeat,
    driftSeconds,
    isOutOfSync,
    viewerTime,
    // Actions
    createRoom,
    joinRoom,
    joinByCode,
    leaveRoom,
    sendMessage,
    updatePlayback,
    fetchPublicRooms,
    // Sync actions
    sendSyncEvent,
    sendHeartbeat,
    sendPlayEvent,
    sendPauseEvent,
    sendSeekEvent,
    initiateCountdownSync,
    updateViewerTime,
    broadcastPlayerEvent,
  };
}
