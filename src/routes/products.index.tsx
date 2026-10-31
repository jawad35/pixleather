import { useMemo, useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { SlidersHorizontal, LayoutGrid, List, X, Search as SearchIcon } from "lucide-react";
import { api } from "@/lib/api";
import { img } from "@/lib/images";
import { formatPrice } from "@/lib/format";
import type { Product, ProductFilters } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProductSearch {
  category?: string;
  q?: string;
  sort?: ProductFilters["sort"];
  page?: number;
}

const PER_PAGE = 50;

export const Route = createFileRoute("/products/")({
  validateSearch: (s: Record<string, unknown>): ProductSearch => ({
    category: typeof s.category === "string" ? s.category : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
    sort: ["newest", "price-asc", "price-desc", "popular", "discount"].includes(s.sort as string) ? (s.sort as ProductSearch["sort"]) : undefined,
    page: typeof s.page === "number" ? s.page : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop All Handmade Products" },
      { name: "description", content: "Browse our full collection of premium handmade products with filters for category, price, material and more." },
      { property: "og:title", content: "Shop All Handmade Products" },
    ],
    links: [{ rel: "canonical", href: "/products" }],
  }),
  loader: async () => ({
    products: await api.getProducts(),
    categories: await api.getCategories(),
    materials: await api.getMaterials(),
    colors: await api.getColors(),
  }),
  component: ProductsPage,
});

const SORTS: { value: NonNullable<ProductSearch["sort"]>; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "popular", label: "Most Popular" },
  { value: "discount", label: "Biggest Discount" },
];

function ProductsPage() {
  const { products, categories, materials, colors } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/products" });

  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [material, setMaterial] = useState<string | undefined>();
  const [color, setColor] = useState<string | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [query, setQuery] = useState(search.q ?? "");
  const [randomSeed] = useState(Date.now()); // Fixed seed for the session

  const filtered = useMemo(() => {
    let list = [...products] as Product[];
    
    // Apply filters
    if (search.category) list = list.filter((p) => p.category.toLowerCase() === search.category!.toLowerCase());
    if (search.q) {
      const t = search.q.toLowerCase();
      list = list.filter((p) => 
        p.name.toLowerCase().includes(t) || 
        p.material.toLowerCase().includes(t) || 
        p.category.toLowerCase().includes(t) || 
        (p.tags ?? []).some((tag) => tag.includes(t))
      );
    }
    if (material) list = list.filter((p) => p.material === material);
    if (color) list = list.filter((p) => p.colors.includes(color));
    if (maxPrice) list = list.filter((p) => p.price <= maxPrice);
    if (onlyDiscount) list = list.filter((p) => (p.discount ?? 0) > 0);
    if (inStock) list = list.filter((p) => p.stock > 0);
    
    // Apply sorting - DEFAULT IS RANDOM
    const sorted = [...list];
    
    // If no sort is selected, use RANDOM by default
    if (!search.sort) {
      // Fisher-Yates shuffle with seed for consistency
      const shuffled = [...sorted];
      let seed = randomSeed;
      for (let i = shuffled.length - 1; i > 0; i--) {
        seed = (seed * 9301 + 49297) % 233280;
        const j = Math.floor((seed / 233280) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    
    // Apply selected sort
    switch (search.sort) {
      case "price-asc": sorted.sort((a, b) => a.price - b.price); break;
      case "price-desc": sorted.sort((a, b) => b.price - a.price); break;
      case "popular": sorted.sort((a, b) => b.reviews - a.reviews); break;
      case "discount": sorted.sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0)); break;
      case "newest": 
      default: sorted.sort((a, b) => Number(b.newArrival) - Number(a.newArrival));
    }
    return sorted;
  }, [products, search, material, color, maxPrice, onlyDiscount, inStock, randomSeed]);

  const page = search.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const setSearch = (next: Partial<ProductSearch>) =>
    navigate({ search: (prev: ProductSearch) => ({ ...prev, ...next, page: next.page ?? 1 }) });

  const clearAll = () => {
    setMaterial(undefined); setColor(undefined); setMaxPrice(undefined); setOnlyDiscount(false); setInStock(false); setQuery("");
    navigate({ search: {} }); // This will trigger random sort by default
  };

  // Reset to first page when filters change
  useEffect(() => {
    if (page !== 1) {
      setSearch({ page: 1 });
    }
  }, [search.category, search.q, material, color, maxPrice, onlyDiscount, inStock, search.sort]);

  const FilterPanel = (
    <div className="space-y-7">
      <div>
        <h4 className="mb-3 font-display text-sm font-semibold">Category</h4>
        <div className="space-y-1.5">
          <button onClick={() => setSearch({ category: undefined })} className={`block text-sm ${!search.category ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>All Products</button>
          {categories.map((c: any) => (
            <button key={c.slug} onClick={() => setSearch({ category: c.name })} className={`block text-sm ${search.category === c.name ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>{c.name}</button>
          ))}
        </div>
      </div>
      <div>
        <h4 className="mb-3 font-display text-sm font-semibold">Max Price</h4>
        <input type="range" min={1000} max={13000} step={500} value={maxPrice ?? 13000} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-[#fc5703]" />
        <p className="mt-1 text-xs text-muted-foreground">Up to {formatPrice(maxPrice ?? 13000)}</p>
      </div>
      <div className="space-y-2.5">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyDiscount} onChange={(e) => setOnlyDiscount(e.target.checked)} className="accent-[#fc5703]" /> On Sale</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="accent-[#fc5703]" /> In Stock</label>
      </div>
      <Button variant="outline" onClick={clearAll} className="w-full rounded-xl">Clear All</Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link> <span className="mx-1.5">/</span>
        <span className="text-foreground">{search.category ?? "Shop"}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{search.category ?? "All Products"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} products</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setSearch({ q: query || undefined }); }} className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="w-44 rounded-full pl-9 sm:w-56" />
          </div>
        </form>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-y border-border py-3">
        <Button variant="outline" size="sm" onClick={() => setShowFilters(true)} className="gap-2 rounded-full lg:hidden">
          <SlidersHorizontal size={15} /> Filters
        </Button>
        <select
          value={search.sort ?? ""}
          onChange={(e) => setSearch({ sort: e.target.value as ProductSearch["sort"] || undefined })}
          className="rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Random (Default)</option>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="ml-auto flex gap-1">
          <button aria-label="Grid view" onClick={() => setView("grid")} className={`grid h-9 w-9 place-items-center rounded-lg ${view === "grid" ? "bg-secondary text-primary" : "text-muted-foreground"}`}><LayoutGrid size={17} /></button>
          <button aria-label="List view" onClick={() => setView("list")} className={`grid h-9 w-9 place-items-center rounded-lg ${view === "list" ? "bg-secondary text-primary" : "text-muted-foreground"}`}><List size={17} /></button>
        </div>
      </div>

      <div className="mt-8 flex gap-8">
        <aside className="hidden w-60 shrink-0 lg:block">{FilterPanel}</aside>

        <div className="min-w-0 flex-1">
          {paged.length === 0 ? (
            <div className="grid place-items-center rounded-3xl border border-dashed border-border py-24 text-center">
              <p className="font-display text-lg">No products match your filters.</p>
              <Button variant="outline" onClick={clearAll} className="mt-4 rounded-xl">Reset filters</Button>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {paged.map((p, i) => (
                <ProductCard 
                  key={`${p.id}-${randomSeed}`} 
                  product={p} 
                  index={i} 
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {paged.map((p) => (
                <motion.div 
                  key={`${p.id}-${randomSeed}`} 
                  initial={{ opacity: 0, y: 16 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }} 
                  className="flex gap-4 rounded-2xl border border-border bg-card p-3 shadow-soft sm:gap-6 sm:p-4"
                >
                  <Link to="/products/$slug" params={{ slug: p.slug }} className="aspect-square w-28 shrink-0 overflow-hidden rounded-xl bg-secondary sm:w-40">
                    <img src={img(p.gallery[0])} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.category}</span>
                    <Link to="/products/$slug" params={{ slug: p.slug }} className="font-display text-lg font-semibold hover:text-primary">{p.name}</Link>
                    <div className="mt-1"><StarRating rating={p.rating} reviews={p.reviews} /></div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                    <div className="mt-auto flex items-center gap-2 pt-3">
                      <span className="font-display text-lg font-semibold">{formatPrice(p.price)}</span>
                      {!!p.oldPrice && <span className="text-sm text-muted-foreground line-through">{formatPrice(p.oldPrice)}</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <button 
                onClick={() => setSearch({ page: page - 1 })} 
                disabled={page === 1}
                className={`px-4 py-2 rounded-full text-sm ${page === 1 ? 'text-muted-foreground cursor-not-allowed' : 'border border-border hover:border-primary'}`}
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button 
                    key={i} 
                    onClick={() => setSearch({ page: pageNum })} 
                    className={`grid h-10 w-10 place-items-center rounded-full text-sm ${page === pageNum ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary"}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button 
                onClick={() => setSearch({ page: page + 1 })} 
                disabled={page === totalPages}
                className={`px-4 py-2 rounded-full text-sm ${page === totalPages ? 'text-muted-foreground cursor-not-allowed' : 'border border-border hover:border-primary'}`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setShowFilters(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-background p-6 shadow-lift">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-lg font-semibold">Filters</span>
              <button aria-label="Close" onClick={() => setShowFilters(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"><X size={18} /></button>
            </div>
            {FilterPanel}
          </div>
        </div>
      )}
    </div>
  );
}