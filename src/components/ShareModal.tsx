import { useState, useEffect } from "react";
import { X, Send, Link2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "./Logo";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
const STORAGE_KEY = "share_modal_dismissed";
const COOLDOWN_DAYS = 7;

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal = ({ isOpen, onClose }: ShareModalProps) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch total shares from database
  useEffect(() => {
    const fetchTotalShares = async () => {
      try {
        const { data, error } = await supabase
          .from('share_stats')
          .select('total_shares')
          .eq('id', 'global')
          .single();
        
        if (error) throw error;
        setShareCount(data?.total_shares || 0);
      } catch (error) {
        console.error('Error fetching share stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchTotalShares();
    }
  }, [isOpen]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#1877F2', '#25D366', '#10B981', '#ffffff', '#ffd700'],
    });
  };

  const incrementShareCount = async () => {
    triggerConfetti();
    try {
      const { data, error } = await supabase.rpc('increment_share_count');
      if (error) throw error;
      setShareCount(data || shareCount + 1);
    } catch (error) {
      console.error('Error incrementing share count:', error);
      // Optimistically update UI even if DB fails
      setShareCount(prev => prev + 1);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const shareOptions = [
    {
      name: "Facebook",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      color: "text-[#1877F2]",
      onClick: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, "_blank");
        incrementShareCount();
      },
    },
    {
      name: "Twitter",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      color: "text-white",
      onClick: () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent("Check out this awesome streaming site!")}`, "_blank");
        incrementShareCount();
      },
    },
    {
      name: "WhatsApp",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      color: "text-[#25D366]",
      onClick: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent("Check out this awesome streaming site! " + currentUrl)}`, "_blank");
        incrementShareCount();
      },
    },
    {
      name: "Copy Link",
      icon: <Link2 className="w-6 h-6" />,
      color: "text-[#10B981]",
      onClick: () => {
        navigator.clipboard.writeText(currentUrl);
        toast({
          title: "Link copied!",
          description: "The link has been copied to your clipboard.",
        });
        incrementShareCount();
      },
    },
  ];

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-200 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-md bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl transition-all duration-200 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-zinc-800/80 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Logo />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Help us grow! 🚀
        </h2>

        {/* Subtitle */}
        <p className="text-zinc-400 text-center italic mb-6">
          Kindly share this site with your friends and family. Your support means a lot to us!
        </p>

        {/* Share Buttons Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {shareOptions.map((option) => (
            <button
              key={option.name}
              onClick={option.onClick}
              className="flex items-center justify-center gap-3 py-4 px-4 bg-zinc-800/50 hover:bg-zinc-700/60 border border-white/10 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className={option.color}>{option.icon}</span>
              <span className="text-white font-medium">{option.name}</span>
            </button>
          ))}
        </div>

        {/* Don't show again checkbox */}
        <label className="flex items-center justify-center gap-3 py-3 px-4 bg-zinc-800/30 border border-white/10 rounded-2xl cursor-pointer mb-4 hover:bg-zinc-800/50 transition-colors">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-5 h-5 rounded border-white/20 bg-zinc-700 text-primary focus:ring-primary/50"
          />
          <span className="text-zinc-400 uppercase text-sm tracking-wide font-medium">
            Don't show this again
          </span>
        </label>

        {/* Share Counter */}
        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-zinc-800/30 border border-white/10 rounded-2xl">
          <Send className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-400 uppercase text-sm tracking-wide font-medium">
            Total Share : {isLoading ? "..." : shareCount.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

// Hook to manage share modal visibility
export const useShareModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const canShowModal = () => {
    // Don't show for logged-in users
    if (user) return false;

    // Check cooldown
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < cooldownMs) {
        return false;
      }
    }

    return true;
  };

  const openModal = () => {
    if (canShowModal()) {
      setIsOpen(true);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return { isOpen, openModal, closeModal, canShowModal };
};

export default ShareModal;
