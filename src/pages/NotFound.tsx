import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Home, Film, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const [glitchText, setGlitchText] = useState("404");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Glitch effect on 404 text
  useEffect(() => {
    const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    let interval: NodeJS.Timeout;
    
    const startGlitch = () => {
      let iterations = 0;
      interval = setInterval(() => {
        setGlitchText(
          "404".split("").map((char, index) => {
            if (index < iterations) return "404"[index];
            return glitchChars[Math.floor(Math.random() * glitchChars.length)];
          }).join("")
        );
        iterations += 1/3;
        if (iterations >= 4) {
          clearInterval(interval);
          setGlitchText("404");
        }
      }, 50);
    };

    startGlitch();
    const repeatInterval = setInterval(startGlitch, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(repeatInterval);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            animation: 'grid-move 20s linear infinite',
          }}
        />
      </div>

      {/* Floating film reels decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-5"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${10 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          >
            <Film className="w-24 h-24 text-primary" />
          </div>
        ))}
      </div>

      {/* Gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-destructive/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* 404 Number with glitch effect */}
        <div className="relative mb-8">
          <h1 
            className="text-[12rem] md:text-[16rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/20 select-none"
            style={{
              textShadow: '0 0 80px hsl(var(--primary) / 0.5)',
            }}
          >
            {glitchText}
          </h1>
          
          {/* Glitch layers */}
          <span 
            className="absolute inset-0 text-[12rem] md:text-[16rem] font-black leading-none tracking-tighter text-primary/30 select-none"
            style={{
              clipPath: 'inset(20% 0 30% 0)',
              transform: 'translate(-4px, 2px)',
              animation: 'glitch-1 2s infinite linear alternate-reverse',
            }}
          >
            404
          </span>
          <span 
            className="absolute inset-0 text-[12rem] md:text-[16rem] font-black leading-none tracking-tighter text-destructive/30 select-none"
            style={{
              clipPath: 'inset(50% 0 20% 0)',
              transform: 'translate(4px, -2px)',
              animation: 'glitch-2 2s infinite linear alternate-reverse',
            }}
          >
            404
          </span>
        </div>

        {/* Message */}
        <div className="text-center mb-10 space-y-4">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
            Scene Not Found
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Looks like this scene was cut from the final edit. 
            Let's get you back to the main feature.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Button 
            asChild 
            size="lg" 
            className="gap-2 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:scale-105"
          >
            <Link to="/">
              <Home className="w-5 h-5" />
              Back to Home
            </Link>
          </Button>
          
          <Button 
            asChild 
            variant="outline" 
            size="lg" 
            className="gap-2 px-8 border-border/50 hover:bg-secondary/50 transition-all hover:scale-105"
          >
            <Link to="/movies">
              <Film className="w-5 h-5" />
              Browse Movies
            </Link>
          </Button>
          
          <Button 
            asChild 
            variant="ghost" 
            size="lg" 
            className="gap-2 px-8 hover:bg-secondary/50 transition-all hover:scale-105"
          >
            <Link to="/search">
              <Search className="w-5 h-5" />
              Search
            </Link>
          </Button>
        </div>

        {/* Go back link */}
        <button 
          onClick={() => window.history.back()}
          className="mt-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Go back to previous page</span>
        </button>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes glitch-1 {
          0% { transform: translate(-2px, 2px); }
          25% { transform: translate(2px, -2px); }
          50% { transform: translate(-1px, 1px); }
          75% { transform: translate(1px, -1px); }
          100% { transform: translate(-2px, 2px); }
        }
        
        @keyframes glitch-2 {
          0% { transform: translate(2px, -2px); }
          25% { transform: translate(-2px, 2px); }
          50% { transform: translate(1px, -1px); }
          75% { transform: translate(-1px, 1px); }
          100% { transform: translate(2px, -2px); }
        }
      `}</style>
    </div>
  );
};

export default NotFound;
