// components/product/ProductCard.tsx

import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, Eye } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { StarRating } from "@/components/StarRating";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useCart, toCartItem } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const add = useCart((s) => s.add);
  const cover = product.gallery[0];
  const out = product.stock <= 0;
  
  // Priority for first 4 products (above the fold)
  const priority = index < 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: (index % 4) * 0.06 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover-lift"
    >
      <Link
        to="/products/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-square overflow-hidden bg-secondary"
      >
        <OptimizedImage
          src={cover}
          alt={product.name}
          sizes="thumbnail"
          priority={priority}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          // blurAmount="blur-sm"
        />
        
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {!!product.discount && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-glow">
              -{product.discount}%
            </span>
          )}
          {product.newArrival && (
            <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-white">New</span>
          )}
        </div>
        
        {out && (
          <div className="absolute inset-0 grid place-items-center bg-white/60 backdrop-blur-sm">
            <span className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white">Sold Out</span>
          </div>
        )}
        
        <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
          <button
            aria-label="Add to wishlist"
            onClick={(e) => { 
              e.preventDefault(); 
              e.stopPropagation();
              toast.success("Saved to wishlist"); 
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow-soft transition-colors hover:bg-primary hover:text-white"
          >
            <Heart size={16} />
          </button>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow-soft transition-colors hover:bg-primary hover:text-white">
            <Eye size={16} />
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{product.category}</span>
        <Link
          to="/products/$slug"
          params={{ slug: product.slug }}
          className="mt-1 line-clamp-1 font-display text-base font-semibold text-foreground transition-colors hover:text-primary"
        >
          {product.name}
        </Link>
        <div className="mt-1.5">
          <StarRating rating={product.rating} reviews={product.reviews} />
        </div>
        <div className="mt-3 flex items-end gap-2">
          <span className="font-display text-lg font-semibold text-foreground">{formatPrice(product.price)}</span>
          {!!product.oldPrice && (
            <span className="mb-0.5 text-sm text-muted-foreground line-through">{formatPrice(product.oldPrice)}</span>
          )}
        </div>
        <Button
          variant="outline"
          disabled={out}
          onClick={() => {
            add(toCartItem(product, cover, { 
              color: product.colors[0], 
              size: product.sizes[1] || product.sizes[0], 
              variant: product.variants[0] 
            }));
            toast.success(`${product.name} added to cart`);
          }}
          className="mt-4 w-full gap-2 rounded-xl border-ink/15 hover:border-primary hover:bg-primary hover:text-primary-foreground"
        >
          <ShoppingBag size={16} /> Add to Cart
        </Button>
      </div>
    </motion.div>
  );
}