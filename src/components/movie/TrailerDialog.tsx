import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TrailerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailerKey: string;
  title: string;
}

export function TrailerDialog({ open, onOpenChange, trailerKey, title }: TrailerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-border">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-lg">{title} - Trailer</DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full">
          <iframe
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
            title={`${title} Trailer`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
