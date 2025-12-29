import { useEffect, useRef, useMemo, useCallback } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
import artplayerPluginHlsControl from "artplayer-plugin-hls-control";
import './ArtPlayer.css';

// Debounce utility function
const debounce = <T extends (...args: unknown[]) => void>(func: T, delay: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

interface FileSource {
  file: string;
  type: string;
  headers?: Record<string, string>;
  default?: boolean;
}

interface SubtitleTrack {
  url: string;
  lang: string;
  default?: boolean;
}

interface ArtPlayerProps {
  files: FileSource[];
  subtitles?: SubtitleTrack[];
  id: string | number;
  title?: string;
  poster?: string;
  backdrop?: string;
  season?: number;
  episode?: number;
  theme?: string;
  autoplay?: boolean;
  subtitleColor?: string;
  subtitleFontSize?: number;
  showPoster?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  onSourceChange?: (newIndex: number) => void; // Notify parent when source changes
  className?: string;
}

const getMimeType = (fileType: string): string => {
  switch (fileType) {
    case "hls": return "m3u8";
    case "mp4": return "mp4";
    case "webm": return "webm";
    case "ogg": return "ogg";
    case "embed": return "mp4";
    default: return "m3u8";
  }
};

export default function ArtPlayerComponent({ 
  files, 
  subtitles = [],
  id,
  title,
  poster,
  backdrop,
  season,
  episode,
  theme,
  autoplay = false,
  subtitleColor = "#ffffff",
  subtitleFontSize = 20,
  showPoster = false,
  onLoad,
  onError,
  onSourceChange,
  className,
}: ArtPlayerProps) {
  const artRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<Artplayer | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  // Use only the first file - source switching is handled by parent component

  const currentContentId = id;
  const currentContentType = season && episode ? "series" : "movie";
  const currentSeasonNumber = season;
  const currentEpisodeNumber = episode;
  const currentTitle = title;
  const currentPoster = poster;
  const currentBackdrop = backdrop;

  const sortedSubtitles = useMemo(() => {
    return subtitles.filter(Boolean);
  }, [subtitles]);

  const LOCAL_STORAGE_KEY = "vidify_playback_progress";

  const saveProgressToLocalStorage = useCallback(() => {
    const player = playerInstanceRef.current;
    if (!currentContentId || !player || player.duration === 0 || player.duration === Infinity) {
      return;
    }

    const watched = player.currentTime;
    const duration = player.duration;

    if (watched < 5 || watched >= duration - 5) {
      return;
    }

    try {
      const storedProgress = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
      const progressData: Record<string, unknown> = {
        id: currentContentId,
        type: currentContentType,
        title: currentTitle || "Unknown Title",
        poster_path: currentPoster || "",
        backdrop_path: currentBackdrop || "",
        progress: {
          watched: watched,
          duration: duration,
        },
        last_updated: Date.now(),
      };

      if (currentContentType === 'series') {
        const episodeKey = `s${currentSeasonNumber}e${currentEpisodeNumber}`;
        const existingShowProgress = (storedProgress[currentContentId as string]?.show_progress as Record<string, unknown>) || {};
        progressData.last_season_watched = String(currentSeasonNumber);
        progressData.last_episode_watched = String(currentEpisodeNumber);
        progressData.show_progress = {
          ...existingShowProgress,
          [episodeKey]: {
            season: String(currentSeasonNumber),
            episode: String(currentEpisodeNumber),
            progress: {
              watched: watched,
              duration: duration,
            },
          },
        };
      }

      const updatedProgress = {
        ...storedProgress,
        [currentContentId]: progressData,
      };

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedProgress));
    } catch (error) {
      console.error("Error saving playback progress:", error);
    }
  }, [currentContentId, currentContentType, currentSeasonNumber, currentEpisodeNumber, currentTitle, currentPoster, currentBackdrop]);

  const debouncedSaveProgress = useMemo(() => debounce(saveProgressToLocalStorage, 5000), [saveProgressToLocalStorage]);

  // Remove automatic source switching - let the user manually switch via the server dropdown
  // This prevents fullscreen exit and unexpected behavior
  // IMPORTANT: Only log errors, don't call onError() as it can trigger re-renders and navigation
  const handleHlsError = useCallback(() => {
    console.error("HLS playback error occurred - user should manually switch server");
    // Show notice in player instead of triggering parent error handler
    // This prevents component unmount/remount cycles that exit fullscreen
    if (playerInstanceRef.current) {
      playerInstanceRef.current.notice.show = "Playback error - try switching servers";
    }
  }, []);

  useEffect(() => {
    if (!artRef.current) {
      return;
    }

    const playerRef = playerInstanceRef.current;
    // Check if content changed - only compare id, season, episode now (no internal file index)
    const isNewContent = playerRef && (
      (playerRef.option as unknown as { id?: string | number }).id !== currentContentId ||
      (playerRef.option as unknown as { season?: number }).season !== currentSeasonNumber ||
      (playerRef.option as unknown as { episode?: number }).episode !== currentEpisodeNumber ||
      (playerRef.option as unknown as { fileUrl?: string }).fileUrl !== files[0]?.file
    );

    if (playerRef && !isNewContent) {
      return;
    }

    if (playerRef && isNewContent) {
      playerRef.destroy(false);
      playerInstanceRef.current = null;
    }

    if (!files || files.length === 0 || !currentContentId) {
      if (artRef.current) {
        artRef.current.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100%; color: white;">No media files available.</div>';
      }
      return;
    }

    // Always use the first file - parent controls which source is active
    const defaultFile = files[0];
    if (!defaultFile) {
      if (artRef.current) {
        artRef.current.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100%; color: white;">No playable source found.</div>';
      }
      return;
    }

    const getSubtitleSettings = (): unknown[] => {
      if (!sortedSubtitles || sortedSubtitles.length === 0) return [];
      
      const subtitleSelectors: unknown[] = sortedSubtitles.map(sub => ({
        html: sub.lang.toUpperCase(),
        url: sub.url,
        default: sub.default || false,
      }));

      subtitleSelectors.unshift({
        html: 'Display',
        tooltip: 'Show',
        switch: true,
        onSwitch: function (item: { tooltip: string; switch: boolean }) {
          item.tooltip = item.switch ? 'Hide' : 'Show';
          if (playerInstanceRef.current) {
            playerInstanceRef.current.subtitle.show = !item.switch;
          }
          return !item.switch;
        },
      });

      return [
        {
          width: 250,
          html: 'Subtitle',
          tooltip: 'Off',
          icon: '<svg width="22px" height="22px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.25 16C5.25 15.5858 5.58579 15.25 6 15.25H10C10.4142 15.25 10.75 15.5858 10.75 16C10.75 16.4142 10.4142 16.75 10 16.75H6C5.58579 16.75 5.25 16.4142 5.25 16Z" fill="#ffffff"></path><path d="M18 12.25C18.4142 12.25 18.75 12.5858 18.75 13C18.75 13.4142 18.4142 13.75 18 13.75H14C13.5858 13.75 13.25 13.4142 13.25 13C13.25 12.5858 13.5858 12.25 14 12.25H18Z" fill="#ffffff"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M9.94358 3.25H14.0564C15.8942 3.24998 17.3498 3.24997 18.489 3.40314C19.6614 3.56076 20.6104 3.89288 21.3588 4.64124C22.1071 5.38961 22.4392 6.33856 22.5969 7.51098C22.75 8.65018 22.75 10.1058 22.75 11.9435V12.0564C22.75 13.8942 22.75 15.3498 22.5969 16.489C22.4392 17.6614 22.1071 18.6104 21.3588 19.3588C20.6104 20.1071 19.6614 20.4392 18.489 20.5969C17.3498 20.75 15.8942 20.75 14.0565 20.75H9.94359C8.10585 20.75 6.65018 20.75 5.51098 20.5969C4.33856 20.4392 3.38961 20.1071 2.64124 19.3588C1.89288 18.6104 1.56076 17.6614 1.40314 16.489C1.24997 15.3498 1.24998 13.8942 1.25 12.0564V11.9436C1.24998 10.1058 1.24997 8.65019 1.40314 7.51098C1.56076 6.33856 1.89288 5.38961 2.64124 4.64124C3.38961 3.89288 4.33856 3.56076 5.51098 3.40314C6.65019 3.24997 8.10583 3.24998 9.94358 3.25Z" fill="#ffffff"></path></svg>',
          selector: subtitleSelectors,
          onSelect: function (item: unknown) {
            const typedItem = item as { url?: string; html: string };
            if (playerInstanceRef.current && typedItem.url) {
              playerInstanceRef.current.subtitle.switch(typedItem.url, {
                name: typedItem.html,
              });
            }
            return typedItem.html;
          },
        },
      ];
    };

    // Remove internal source switching settings - parent controls sources via ServerDropdown
    const getSourcesSettings = (): unknown[] => {
      return [];
    };

    const art = new Artplayer({
      container: artRef.current,
      url: defaultFile.file,
      type: getMimeType(defaultFile.type),
      volume: 0.7,
      autoplay: autoplay,
      pip: true,
      setting: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      subtitleOffset: true,
      fullscreenWeb: false,
      miniProgressBar: true,
      playsInline: true,
      theme: theme ? `#${theme}` : '#ff4d6d',
      poster: currentPoster || '',
      subtitle: {
        url: sortedSubtitles.length > 0 ? sortedSubtitles[0].url : '',
        type: 'srt',
        style: {
          color: subtitleColor,
          fontSize: `${subtitleFontSize}px`,
        },
        encoding: 'utf-8',
      },
      plugins: [
        artplayerPluginHlsControl({
          quality: {
            control: true,
            setting: true,
            getName: (level: { height?: number }) => level.height ? `${level.height}P` : 'Auto',
            title: "Quality",
            auto: "Auto",
          },
          audio: {
            control: true,
            setting: true,
            getName: (track: { name?: string }) => track.name || "Track",
            title: "Audio",
            auto: "Auto",
          },
        }),
      ],
      controls: [
        {
          position: 'left',
          html: `
            <div style="display: flex; align-items: center; gap: 5px; margin-right: 6px; background-color: rgba(255, 255, 255, 0.082); padding: 10px 15px; border-radius: 20px;">
               <p style="text-transform: capitalize; margin: 0; font-size: 14.2px">${currentTitle || ''}</p>
               ${(currentSeasonNumber && currentEpisodeNumber) ? `
               <p style="text-transform: capitalize; margin: 0; font-size: 14.2px">S${currentSeasonNumber}</p>
               <svg width="14px" height="14px" viewBox="0 0 24 24" fill="none"><path d="M12 9.5C13.3807 9.5 14.5 10.6193 14.5 12C14.5 13.3807 13.3807 14.5 12 14.5C10.6193 14.5 9.5 13.3807 9.5 12C9.5 10.6193 10.6193 9.5 12 9.5Z" fill="#ffffff"></path></svg>
               <p style="text-transform: capitalize; margin: 0; font-size: 14.2px">E${currentEpisodeNumber}</p>
               ` : ''}
            </div>
          `,
          index: 1,
        },
      ],
      customType: {
        m3u8: (video: HTMLVideoElement, url: string, artInstance: Artplayer) => {
          if (Hls.isSupported()) {
            if (hlsRef.current) {
              hlsRef.current.destroy();
              hlsRef.current = null;
            }

            const hls = new Hls({
              xhrSetup: function (xhr: XMLHttpRequest) {
                const source = files.find(f => f.file === url);
                if (source?.headers) {
                  Object.entries(source.headers).forEach(([k, v]) =>
                    xhr.setRequestHeader(k, v)
                  );
                }
              },
            });

            hls.on(Hls.Events.ERROR, (_event, data) => {
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.error("HLS Network Error:", data);
                    if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR) {
                      handleHlsError();
                    }
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.error("HLS Media Error:", data);
                    hls.recoverMediaError();
                    setTimeout(() => {
                      if (video.paused) {
                        handleHlsError();
                      }
                    }, 2000);
                    break;
                  default:
                    console.error("HLS Fatal Error:", data);
                    handleHlsError();
                    break;
                }
              }
            });

            hls.loadSource(url);
            hls.attachMedia(video);
            hlsRef.current = hls;
            (artInstance as unknown as { hls: Hls }).hls = hls;

            artInstance.on("destroy", () => {
              if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
              }
            });
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
          } else {
            artInstance.notice.show = "Unsupported format: m3u8";
            handleHlsError();
          }
        },
      },
      settings: [
        ...getSourcesSettings(),
        ...getSubtitleSettings(),
      ] as Artplayer['option']['settings'],
    });

    // Store custom properties for change detection
    (art.option as unknown as { id: string | number }).id = currentContentId;
    (art.option as unknown as { season?: number }).season = currentSeasonNumber;
    (art.option as unknown as { episode?: number }).episode = currentEpisodeNumber;
    (art.option as unknown as { fileUrl?: string }).fileUrl = files[0]?.file;

    playerInstanceRef.current = art;

    art.on("ready", () => {
      onLoad?.();
      try {
        const storedProgress = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const contentProgress = storedProgress[currentContentId];

        if (contentProgress) {
          let watchedTime = 0;
          if (currentContentType === 'movie') {
            watchedTime = contentProgress.progress?.watched || 0;
          } else if (currentContentType === 'series') {
            const episodeKey = `s${currentSeasonNumber}e${currentEpisodeNumber}`;
            watchedTime = contentProgress.show_progress?.[episodeKey]?.progress?.watched || 0;
          }

          if (watchedTime > 0) {
            art.currentTime = watchedTime;
          }
        }
      } catch (error) {
        console.error("Error loading playback progress:", error);
      }
    });

    art.on('error', () => {
      // Don't call onError - just show notice to prevent re-renders/navigation
      console.error("ArtPlayer error occurred");
      art.notice.show = "Playback error - try switching servers";
    });

    art.on("timeupdate", () => {
      debouncedSaveProgress();
    });

    art.on("destroy", () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      saveProgressToLocalStorage();
    });

    return () => {
      if (playerInstanceRef.current && !(playerInstanceRef.current as unknown as { destroyed?: boolean }).destroyed) {
        playerInstanceRef.current.destroy(false);
        playerInstanceRef.current = null;
      }
    };
  }, [
    files,
    sortedSubtitles,
    currentContentId,
    currentContentType,
    currentSeasonNumber,
    currentEpisodeNumber,
    currentTitle,
    currentPoster,
    currentBackdrop,
    debouncedSaveProgress,
    handleHlsError,
    autoplay,
    theme,
    subtitleColor,
    subtitleFontSize,
    showPoster,
    onLoad,
    saveProgressToLocalStorage,
  ]);

  return (
    <div
      ref={artRef}
      className={`artplayercontainer ${className || ''}`}
      style={{ aspectRatio: "16/9" }}
    />
  );
}

// Helper to check if URL is a Fmov stream
export function isArtPlayerStream(url: string): boolean {
  return url.includes('.m3u8') || url.includes('m3u8-proxy');
}
