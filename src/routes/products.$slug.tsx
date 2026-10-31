import { useRef, useState, useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Minus, Plus, Truck, ShieldCheck, Share2, Check, ShoppingBag, ChevronRight, Mail, Star } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Product, Review } from "@/lib/types";
import { StarRating } from "@/components/StarRating";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";

import { useCart, toCartItem } from "@/store/cart";
import { useUI } from "@/store/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { openEmail } from "@/lib/email";
import { singleProductMessage } from "@/lib/whatsapp";
import { toast } from "sonner";

// Simple optimized image component for this page
function ProductImage({ 
  src, 
  alt, 
  className = "", 
  priority = false,
  onLoad 
}: { 
  src: string; 
  alt: string; 
  className?: string; 
  priority?: boolean;
  onLoad?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    
    const loadImage = async () => {
      // If already a URL, use it
      if (src.startsWith('http')) {
        setImageUrl(src);
        return;
      }
      
      // For storage paths, we need to sign
      try {
        const { signOne } = await import('@/lib/storage');
        const signed = await signOne(src);
        if (isMounted && signed) {
          setImageUrl(signed);
        }
      } catch (error) {
        console.error('Error loading image:', error);
        if (isMounted) setImageUrl(src);
      }
    };
    
    if (priority) {
      loadImage();
    } else {
      // Use requestIdleCallback for non-priority images
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => loadImage());
      } else {
        setTimeout(loadImage, 100);
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, [src, priority]);

  // Preload priority images
  useEffect(() => {
    if (priority && imageUrl) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = imageUrl;
      document.head.appendChild(link);
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [priority, imageUrl]);

  return (
    <div className={`relative overflow-hidden bg-secondary/30 ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-secondary/50 via-secondary/30 to-secondary/50" />
      )}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={alt}
          className={`h-full w-full object-cover transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => {
            setLoaded(true);
            onLoad?.();
          }}
        />
      )}
    </div>
  );
}

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ params }) => {
    const product = await api.getProduct(params.slug);
    if (!product) throw notFound();
    return { product, related: await api.getRelated(product), reviews: await api.getReviews(product.id) };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    if (!p) return { meta: [{ title: "Product" }] };
    return {
      meta: [
        { title: `${p.name} — ${p.category}` },
        { name: "description", content: p.description },
        { property: "og:title", content: p.name },
        { property: "og:description", content: p.description },
        { property: "og:type", content: "product" },
        { property: "og:image", content: p.gallery[0] },
        { name: "twitter:image", content: p.gallery[0] },
      ],
      links: [{ rel: "canonical", href: `/products/${p.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            description: p.description,
            sku: p.sku,
            brand: { "@type": "Brand", name: p.brand },
            aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviews },
            offers: { "@type": "Offer", price: p.price, priceCurrency: "USD", availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold">Product not found</h1>
        <Button asChild className="mt-4 rounded-xl"><Link to="/products">Back to Shop</Link></Button>
      </div>
    </div>
  ),
  component: ProductDetail,
});

function ProductDetail() {
  const { product, related, reviews: initialReviews } = Route.useLoaderData() as { product: Product; related: Product[]; reviews: Review[] };
  const add = useCart((s) => s.add);
  const openWA = useUI((s) => s.openWhatsAppModal);
  const { user, profile } = useAuth();

  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [rvRating, setRvRating] = useState(5);
  const [rvComment, setRvComment] = useState("");
  const [rvBusy, setRvBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const reviewCount = reviews.length;
  const avgRating = reviewCount ? reviews.reduce((s, r) => s + r.rating, 0) / reviewCount : 0;

  const refetchReviews = async () => setReviews(await api.getReviews(product.id));

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setRvBusy(true);
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Customer";
    let error;
    if (editingId) {
      ({ error } = await supabase.from("reviews").update({ rating: rvRating, comment: rvComment }).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("reviews").insert({
        product_id: product.id, user_id: user.id, name, rating: rvRating, comment: rvComment,
      }));
    }
    setRvBusy(false);
    if (error) { toast.error(error.message); return; }
    await refetchReviews();
    setRvComment(""); setRvRating(5); setEditingId(null);
    toast.success(editingId ? "Review updated!" : "Thanks for your review!");
  };

  const startEdit = (r: Review) => {
    setEditingId(r.id ?? null);
    setRvRating(r.rating);
    setRvComment(r.comment);
    if (typeof window !== "undefined") window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };
  const deleteReview = async (id?: string) => {
    if (!id || !confirm("Delete your review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await refetchReviews();
    toast.success("Review deleted");
  };

  const [active, setActive] = useState(0);
  const [color, setColor] = useState(product.colors[0]);
  const [size, setSize] = useState(product.sizes[1] ?? product.sizes[0]);
  const [variant, setVariant] = useState(product.variants[0]);
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [lens, setLens] = useState({ x: 50, y: 50 });
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const [coverLoaded, setCoverLoaded] = useState(false);

  const cover = product.gallery[active];
  const opts = { color, size, variant };

  // Preload cover image
  useEffect(() => {
    const preloadCover = async () => {
      try {
        const { signOne } = await import('@/lib/storage');
        const signed = await signOne(cover);
        if (signed) {
          const img = new Image();
          img.src = signed;
          img.onload = () => setCoverLoaded(true);
        }
      } catch (error) {
        console.error('Error preloading cover:', error);
      }
    };
    preloadCover();
  }, [cover]);

  const emailOrder = () =>
    openEmail(
      `Order enquiry: ${product.name}`,
      singleProductMessage(
        { name: product.name, price: product.price, quantity: qty, ...opts, material: product.material },
        typeof window !== "undefined" ? window.location.href : "",
      ),
    );

  const onLensMove = (e: React.MouseEvent) => {
    const el = imgWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLens({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const specs: [string, string | undefined][] = [
    ["Material", product.material], ["Weight", product.weight], ["Dimensions", product.dimensions],
    ["Color", product.colors.join(", ")], ["Shape", product.shape], ["Pattern", product.pattern],
    ["Finish", product.finish], ["SKU", product.sku],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link><ChevronRight size={14} />
        <Link to="/products" className="hover:text-primary">Shop</Link><ChevronRight size={14} />
        <Link to="/products" search={{ category: product.category }} className="hover:text-primary">{product.category}</Link><ChevronRight size={14} />
        <span className="truncate text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div className="flex flex-col-reverse gap-4 sm:flex-row">
          {/* Thumbnails - load after cover */}
          <div className="flex gap-3 sm:flex-col">
            {product.gallery.map((g, i) => (
              <button 
                key={i} 
                onClick={() => setActive(i)} 
                className={`aspect-square w-16 overflow-hidden rounded-xl border-2 transition-colors sm:w-20 ${
                  active === i ? "border-primary" : "border-transparent hover:border-primary/50"
                }`}
              >
                <ProductImage
                  src={g}
                  alt={`${product.name} ${i + 1}`}
                  className="h-full w-full"
                  priority={i === 0} // First thumbnail has priority
                />
              </button>
            ))}
          </div>

          {/* Cover Image - loads instantly */}
          <div
            ref={imgWrapRef}
            className="relative flex-1 cursor-zoom-in overflow-hidden rounded-3xl bg-secondary"
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
            onMouseMove={onLensMove}
          >
            <ProductImage
              src={cover}
              alt={product.name}
              className="aspect-square w-full"
              priority={true}
              onLoad={() => setCoverLoaded(true)}
            />
            
            {/* Zoom lens */}
            {zoom && coverLoaded && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 hidden sm:block"
                style={{
                  backgroundImage: `url(${cover})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "220%",
                  backgroundPosition: `${lens.x}% ${lens.y}%`,
                }}
              />
            )}
            
            {/* Discount badge */}
            {!!product.discount && (
              <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground shadow-glow">
                -{product.discount}%
              </span>
            )}
          </div>
        </div>

        {/* Info - unchanged */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{product.category}</span>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{product.name}</h1>
          <div className="mt-3 flex items-center gap-4">
            <StarRating rating={avgRating} reviews={reviewCount} size={16} />
            <span className={`text-sm font-medium ${product.stock > 0 ? "text-green-600" : "text-destructive"}`}>
              {product.stock > 0 ? `In stock (${product.stock})` : "Out of stock"}
            </span>
          </div>

          <div className="mt-5 flex items-end gap-3">
            <span className="font-display text-3xl font-semibold">{formatPrice(product.price)}</span>
            {!!product.oldPrice && <span className="mb-1 text-lg text-muted-foreground line-through">{formatPrice(product.oldPrice)}</span>}
          </div>

          <p className="mt-5 text-muted-foreground">{product.description}</p>

          {/* <div className="mt-6 space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">Color: <span className="text-muted-foreground">{color}</span></p>
              <div className="flex gap-2">
                {product.colors.map((c) => (
                  <button 
                    key={c} 
                    onClick={() => setColor(c)} 
                    className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                      color === c 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Size</p>
              <div className="flex gap-2">
                {product.sizes.map((s) => (
                  <button 
                    key={s} 
                    onClick={() => setSize(s)} 
                    className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                      size === s 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Variant</p>
              <div className="flex gap-2">
                {product.variants.map((v) => (
                  <button 
                    key={v} 
                    onClick={() => setVariant(v)} 
                    className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                      variant === v 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div> */}

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-full border border-border px-2 py-1.5">
              <button 
                aria-label="Decrease" 
                onClick={() => setQty((q) => Math.max(1, q - 1))} 
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary transition-colors"
              >
                <Minus size={15} />
              </button>
              <span className="w-6 text-center font-medium">{qty}</span>
              <button 
                aria-label="Increase" 
                onClick={() => setQty((q) => q + 1)} 
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary transition-colors"
              >
                <Plus size={15} />
              </button>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Truck size={16} className="text-primary" /> Est. delivery 3–6 days
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              disabled={product.stock <= 0}
              onClick={() => { 
                add(toCartItem(product, cover, opts), qty); 
                toast.success(`${product.name} added to cart`); 
              }}
              className="flex-1 gap-2 rounded-xl"
            >
              <ShoppingBag size={18} /> Add to Cart
            </Button>
            <Button
              size="lg"
              disabled={product.stock <= 0}
              onClick={() => openWA({ product, line: { ...opts, quantity: qty }, link: typeof window !== "undefined" ? window.location.href : "" })}
              className="flex-1 gap-2 rounded-xl bg-[#25D366] text-white hover:bg-[#1eb858]"
            >
              <FaWhatsapp size={18} /> Buy on WhatsApp
            </Button>
          </div>

          <Button
            size="lg"
            variant="outline"
            disabled={product.stock <= 0}
            onClick={emailOrder}
            className="mt-3 w-full gap-2 rounded-xl"
          >
            <Mail size={18} /> Order via Email
          </Button>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-primary" /> Quality guaranteed
            </span>
            <button
              onClick={() => { 
                if (typeof navigator !== "undefined" && navigator.clipboard) { 
                  navigator.clipboard.writeText(window.location.href); 
                  toast.success("Link copied"); 
                } 
              }}
              className="flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <Share2 size={16} /> Share
            </button>
          </div>

          {/* Features */}
          <div className="mt-6 grid grid-cols-2 gap-2">
            {product.features.map((f) => (
              <span key={f} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm">
                <Check size={15} className="text-primary" /> {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Specifications */}
      {/* <div className="mt-16 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-semibold">Specifications</h2>
          <table className="mt-5 w-full text-sm">
            <tbody>
              {specs.filter(([, v]) => v).map(([k, v]) => (
                <tr key={k} className="border-b border-border">
                  <td className="py-3 font-medium text-muted-foreground">{k}</td>
                  <td className="py-3 text-right">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div> */}

      {/* Customer Reviews */}
      <section className="mt-16">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Customer Reviews</h2>
          <span className="text-sm text-muted-foreground">{reviewCount} review{reviewCount === 1 ? "" : "s"}</span>
        </div>
        {reviews.length === 0 ? (
          <p className="mt-5 text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {reviews.map((r, i) => (
              <div key={r.id ?? i} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{r.name}</p>
                  <StarRating rating={r.rating} size={14} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(r.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
                <p className="mt-3 text-sm text-foreground/90">{r.comment}</p>
                {user && r.userId === user.id && (
                  <div className="mt-3 flex gap-3 text-xs">
                    <button onClick={() => startEdit(r)} className="text-primary hover:underline">Edit</button>
                    <button onClick={() => deleteReview(r.id)} className="text-destructive hover:underline">Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Write a review */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="font-display text-lg font-semibold">{editingId ? "Edit Your Review" : "Write a Review"}</h3>
          {user ? (
            <form onSubmit={submitReview} className="mt-4 space-y-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRvRating(n)} aria-label={`${n} star`}>
                    <Star size={22} className={n <= rvRating ? "fill-primary text-primary" : "text-muted-foreground"} />
                  </button>
                ))}
              </div>
              <textarea
                value={rvComment}
                onChange={(e) => setRvComment(e.target.value)}
                placeholder="Share your thoughts about this product…"
                required
                className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={rvBusy} className="rounded-xl">
                  {rvBusy ? "Submitting…" : editingId ? "Update Review" : "Submit Review"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setEditingId(null); setRvComment(""); setRvRating(5); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Please{" "}
              <Link to="/auth" search={{ redirect: `/products/${product.slug}` }} className="font-medium text-primary hover:underline">
                sign in
              </Link>{" "}
              to write a review.
            </p>
          )}
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-8 font-display text-2xl font-semibold sm:text-3xl">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}

      {/* Sticky mobile buy bar */}
      <motion.div 
        initial={{ y: 80 }} 
        animate={{ y: 0 }} 
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md sm:hidden"
      >
        <div>
          <p className="font-display text-lg font-semibold">{formatPrice(product.price)}</p>
        </div>
        <Button
          onClick={() => openWA({ product, line: { ...opts, quantity: qty }, link: typeof window !== "undefined" ? window.location.href : "" })}
          className="flex-1 gap-2 rounded-xl bg-[#25D366] text-white hover:bg-[#1eb858]"
        >
          <FaWhatsapp size={18} /> Buy Now
        </Button>
      </motion.div>
    </div>
  );
}