import { Eye } from 'lucide-react';
import { useWatchingNow } from '@/hooks/useWatchStats';
import { cn } from '@/lib/utils';

interface WatchingNowBadgeProps {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  className?: string;
  showIcon?: boolean;
}

export function WatchingNowBadge({ 
  tmdbId, 
  mediaType, 
  className,
  showIcon = true 
}: WatchingNowBadgeProps) {
  const { count, isLoading } = useWatchingNow(tmdbId, mediaType);

  if (isLoading || count === 0) return null;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
      "bg-primary/90 text-primary-foreground text-xs font-medium",
      "animate-pulse",
      className
    )}>
      {showIcon && <Eye className="w-3 h-3" />}
      <span>{count} watching</span>
    </div>
  );
}
