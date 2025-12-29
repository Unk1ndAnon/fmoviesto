import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, ListPlus, LogIn, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AuthPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "favorites" | "watchlist" | "follow";
}

export function AuthPromptDialog({ open, onOpenChange, action }: AuthPromptDialogProps) {
  const navigate = useNavigate();

  const actionText = {
    favorites: "save to favorites",
    watchlist: "add to your watchlist",
    follow: "follow TV shows",
  };

  const ActionIcon = action === "favorites" ? Heart : action === "watchlist" ? ListPlus : Heart;

  const handleLogin = () => {
    onOpenChange(false);
    navigate("/auth?mode=login");
  };

  const handleRegister = () => {
    onOpenChange(false);
    navigate("/auth?mode=register");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ActionIcon className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Sign in required</DialogTitle>
          <DialogDescription className="text-center">
            Create a free account or sign in to {actionText[action]} and sync across all your devices.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleLogin} className="gap-2">
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
          <Button variant="outline" onClick={handleRegister} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Create Account
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">
          It's free and takes less than 30 seconds
        </p>
      </DialogContent>
    </Dialog>
  );
}
