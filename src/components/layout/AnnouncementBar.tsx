import { useState } from "react";
import { X } from "lucide-react";
import { SITE } from "@/lib/config";

export function AnnouncementBar() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="relative z-50 bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2 text-center text-xs font-medium sm:text-sm">
        <p className="text-balance">{SITE.announcement}</p>
        <button
          aria-label="Dismiss announcement"
          onClick={() => setOpen(false)}
          className="absolute right-3 grid h-6 w-6 place-items-center rounded-full transition-colors hover:bg-white/20"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
