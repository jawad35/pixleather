import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import products from "@/data/products.json";
import type { Product } from "@/lib/types";
import { img } from "@/lib/images";
import { formatPrice } from "@/lib/format";
import { useUI } from "@/store/ui";

const all = products as Product[];

export function SearchDialog() {
  const open = useUI((s) => s.searchOpen);
  const close = useUI((s) => s.closeSearch);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return all
      .filter(
        (p) =>
          p.name.toLowerCase().includes(t) ||
          p.category.toLowerCase().includes(t) ||
          p.material.toLowerCase().includes(t) ||
          p.description.toLowerCase().includes(t) ||
          (p.tags ?? []).some((tag) => tag.includes(t)),
      )
      .slice(0, 8);
  }, [q]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="top-24 translate-y-0 rounded-3xl p-0 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Search products</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Search size={20} className="text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, categories, materials..."
            className="border-0 p-0 text-base shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {q && results.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No products found for “{q}”.</p>
          )}
          {results.map((p) => (
            <Link
              key={p.id}
              to="/products/$slug"
              params={{ slug: p.slug }}
              onClick={() => { close(); setQ(""); }}
              className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-secondary"
            >
              <img src={img(p.gallery[0])} alt={p.name} className="h-12 w-12 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.category}</p>
              </div>
              <span className="text-sm font-semibold">{formatPrice(p.price)}</span>
            </Link>
          ))}
          {!q && <p className="px-4 py-8 text-center text-sm text-muted-foreground">Start typing to search the catalog.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
