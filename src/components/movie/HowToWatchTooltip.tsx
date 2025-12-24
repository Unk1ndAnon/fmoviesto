import { useState, useEffect } from "react";
import { Server, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "fmovies_how_to_watch_dismissed";

export function HowToWatchTooltip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="relative flex justify-center mt-4">
      {/* Arrow pointing up */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[12px] border-b-slate-700" />
      
      {/* Tooltip content */}
      <div className="bg-slate-700 rounded-xl px-6 py-5 shadow-2xl max-w-md w-full">
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-gradient-to-b from-slate-400 to-slate-600 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5 text-white" />
            </div>
            <p className="text-white font-medium">
              <span className="text-slate-300">1.</span> Select a server
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-green-400 to-green-600 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
            </div>
            <p className="text-white font-medium">
              <span className="text-slate-300">2.</span> Press Play to begin
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 flex items-center justify-between gap-4">
              <p className="text-white font-medium">
                <span className="text-slate-300">3.</span> If a server doesn't work, select another
              </p>
              <Button
                onClick={handleDismiss}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 h-9 rounded-md shrink-0"
              >
                Got it!
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
