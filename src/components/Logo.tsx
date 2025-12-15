import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 group", className)}>
      <div className="relative">
        {/* Outer glow */}
        <div className="absolute inset-0 bg-primary/50 rounded-xl blur-md group-hover:blur-lg transition-all" />
        
        {/* Main logo container */}
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all">
          {/* Inner play button */}
          <div className="w-6 h-6 bg-primary-foreground/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Play className="w-3 h-3 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
          
          {/* Decorative F */}
          <span className="absolute -top-1 -left-1 text-[10px] font-black text-primary-foreground/90 bg-primary rounded px-1">
            F
          </span>
        </div>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
            <span className="text-primary">F</span>mov
          </span>
          <span className="text-[9px] text-muted-foreground -mt-1 tracking-widest uppercase">
            Watch Free
          </span>
        </div>
      )}
    </Link>
  );
}
