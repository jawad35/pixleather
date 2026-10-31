import { Star } from "lucide-react";

export function StarRating({ rating, reviews, size = 14 }: { rating: number; reviews?: number; size?: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={size}
            className={i < Math.round(rating) ? "fill-primary text-primary" : "fill-muted text-muted"}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {rating.toFixed(1)}
        {reviews != null && ` (${reviews})`}
      </span>
    </div>
  );
}
