import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export function MaintenanceBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative mx-4 max-w-lg rounded-xl border border-yellow-500/30 bg-background p-8 shadow-2xl">
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-yellow-500/20 p-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
          </div>
          
          <h2 className="mb-3 text-2xl font-bold text-foreground">
            Server Issues
          </h2>
          
          <p className="mb-6 text-muted-foreground leading-relaxed">
            We're currently experiencing some technical difficulties with our servers. 
            Our team is working hard to resolve this issue. 
            We'll be back shortly!
          </p>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
            Maintenance in progress
          </div>
        </div>
      </div>
    </div>
  );
}
