import { Link } from "react-router-dom";
import { Twitter, Mail, Send } from "lucide-react";
import { Logo } from "@/components/Logo";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="mb-4">
              <Logo />
            </div>
            <p className="text-muted-foreground text-sm max-w-md">
              Fmovies is your ultimate destination for streaming movies and TV shows.
              Enjoy thousands of titles in HD quality, completely free.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Browse</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/movies" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Movies
                </Link>
              </li>
              <li>
                <Link to="/tv" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  TV Shows
                </Link>
              </li>
              <li>
                <Link to="/movies?category=trending" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Trending
                </Link>
              </li>
              <li>
                <Link to="/movies?category=top-rated" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Top Rated
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/dmca" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  DMCA
                </Link>
              </li>
              <li>
                <Link to="/sitemap" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © {currentYear} Fmov.online All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="https://twitter.com/Zabranjeniforum" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Twitter">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="https://t.me/+RZrnNXoMFkwzMWM0" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Telegram">
              <Send className="w-5 h-5" />
            </a>
            <a href="mailto:fmov.online@proton.me" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Email">
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/60 text-center mt-6">
          Disclaimer: This site does not store any files on its server. All contents are provided by non-affiliated third parties.
        </p>
      </div>
    </footer>
  );
}
