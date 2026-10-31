import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { ProductForm } from "./ProductForm";
import { deleteImages } from "@/lib/storage";

const PAGE_SIZE = 15;

export function ProductsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [sort, setSort] = useState("newest");

  const { data: cats = [] } = useQuery({
    queryKey: ["admin-all-cats"],
    queryFn: async () => (await supabase.from("categories").select("id,name,parent_id").order("name")).data ?? [],
  });

  const filters = { search, category, minPrice, maxPrice, stockFilter, sort, page };
  const { data, isFetching } = useQuery({
    queryKey: ["admin-products", filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase.from("products").select("id,name,price,stock,enabled,slug,feature_image,gallery,category_id", { count: "exact" });
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      if (category) q = q.eq("category_id", category);
      if (minPrice) q = q.gte("price", Number(minPrice));
      if (maxPrice) q = q.lte("price", Number(maxPrice));
      if (stockFilter === "in") q = q.gt("stock", 0);
      if (stockFilter === "out") q = q.eq("stock", 0);
      if (stockFilter === "low") q = q.gt("stock", 0).lte("stock", 5);
      if (sort === "newest") q = q.order("created_at", { ascending: false });
      if (sort === "price-asc") q = q.order("price", { ascending: true });
      if (sort === "price-desc") q = q.order("price", { ascending: false });
      if (sort === "stock-asc") q = q.order("stock", { ascending: true });
      if (sort === "name") q = q.order("name", { ascending: true });
      const from = page * PAGE_SIZE;
      q = q.range(from, from + PAGE_SIZE - 1);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const catName = (id: string | null) => cats.find((c: any) => c.id === id)?.name ?? "—";

  const toggle = async (id: string, enabled: boolean) => {
    await supabase.from("products").update({ enabled: !enabled }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  // Fetch full product data for editing
  const fetchFullProduct = async (id: string) => {
    setLoadingProductId(id);
    try {
      const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      // Parse specifications if it's a string
      let specifications = product.specifications;
      if (typeof specifications === 'string') {
        try {
          specifications = JSON.parse(specifications);
        } catch (e) {
          specifications = [];
        }
      }
      if (!Array.isArray(specifications)) {
        specifications = [];
      }
      
      // Parse gallery if it's a string
      let gallery = product.gallery;
      if (typeof gallery === 'string') {
        try {
          gallery = JSON.parse(gallery);
        } catch (e) {
          gallery = [];
        }
      }
      if (!Array.isArray(gallery)) {
        gallery = [];
      }
      
      // Parse colors if it's a string
      let colors = product.colors;
      if (typeof colors === 'string') {
        try {
          colors = JSON.parse(colors);
        } catch (e) {
          colors = [];
        }
      }
      if (!Array.isArray(colors)) {
        colors = [];
      }
      
      // Parse sizes if it's a string
      let sizes = product.sizes;
      if (typeof sizes === 'string') {
        try {
          sizes = JSON.parse(sizes);
        } catch (e) {
          sizes = [];
        }
      }
      if (!Array.isArray(sizes)) {
        sizes = [];
      }
      
      // Parse variants if it's a string
      let variants = product.variants;
      if (typeof variants === 'string') {
        try {
          variants = JSON.parse(variants);
        } catch (e) {
          variants = [];
        }
      }
      if (!Array.isArray(variants)) {
        variants = [];
      }
      
      // Parse tags if it's a string
      let tags = product.tags;
      if (typeof tags === 'string') {
        try {
          tags = JSON.parse(tags);
        } catch (e) {
          tags = [];
        }
      }
      if (!Array.isArray(tags)) {
        tags = [];
      }
      
      // Set editing with full product data
      setEditing({
        ...product,
        specifications: specifications,
        gallery: gallery,
        colors: colors,
        sizes: sizes,
        variants: variants,
        tags: tags,
      });
      
    } catch (error: any) {
      console.error("Error fetching product:", error);
      toast.error(error.message || "Failed to load product");
    } finally {
      setLoadingProductId(null);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this product and all its images?")) return;
    
    setDeletingId(id);
    
    try {
      // First, fetch the full product data to get all image paths
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("feature_image, gallery")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Collect all image paths
      const imagePaths: string[] = [];
      if (product?.feature_image) {
        imagePaths.push(product.feature_image);
      }
      if (product?.gallery && Array.isArray(product.gallery)) {
        product.gallery.forEach((img: string) => {
          if (img) imagePaths.push(img);
        });
      }
      
      // Delete images from storage
      let storageError = false;
      if (imagePaths.length > 0) {
        const { failed } = await deleteImages(imagePaths);
        if (failed.length > 0) {
          storageError = true;
          console.warn("Some images failed to delete:", failed);
          toast.warning(`Product deleted but ${failed.length} image(s) could not be removed`);
        }
      }
      
      // Delete the product from database
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", id);
      
      if (deleteError) throw deleteError;
      
      if (!storageError) {
        toast.success("Product and all images deleted successfully");
      }
      
      // Invalidate queries to refresh the list
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-count", "products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error(error.message || "Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  };

  const resetPage = () => setPage(0);

  if (creating || editing)
    return <ProductForm initial={editing ?? undefined} onClose={() => { setCreating(false); setEditing(null); }} />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Products <span className="text-sm text-muted-foreground">({total})</span></h2>
        <Button onClick={() => setCreating(true)} className="rounded-xl"><Plus size={16} /> Add Product</Button>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Input placeholder="Search name…" value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} />
        <select value={category} onChange={(e) => { setCategory(e.target.value); resetPage(); }} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
          <option value="">All categories</option>
          {cats.filter((c: any) => !c.parent_id).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Input type="number" placeholder="Min $" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); resetPage(); }} />
        <Input type="number" placeholder="Max $" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); resetPage(); }} />
        <select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); resetPage(); }} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
          <option value="">All stock</option>
          <option value="in">In stock</option>
          <option value="low">Low (≤5)</option>
          <option value="out">Out of stock</option>
        </select>
        <select value={sort} onChange={(e) => { setSort(e.target.value); resetPage(); }} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
          <option value="newest">Newest</option>
          <option value="name">Name A–Z</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
          <option value="stock-asc">Stock ↑</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left"><tr>
            <th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th>
          </tr></thead>
          <tbody>
            {rows.map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-muted-foreground">{catName(p.category_id)}</td>
                <td className="p-3">{formatPrice(Number(p.price))}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3">{p.enabled ? "Active" : "Disabled"}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => fetchFullProduct(p.id)} 
                      disabled={loadingProductId === p.id}
                      className="text-primary hover:underline disabled:opacity-50"
                    >
                      {loadingProductId === p.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Pencil size={15} />
                      )}
                    </button>
                    <button onClick={() => toggle(p.id, p.enabled)} className="text-primary hover:underline">{p.enabled ? "Disable" : "Enable"}</button>
                    <button 
                      onClick={() => del(p.id)} 
                      disabled={deletingId === p.id}
                      className="text-destructive hover:underline disabled:opacity-50"
                    >
                      {deletingId === p.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{isFetching ? "Loading…" : "No products found."}</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Page {page + 1} of {pages}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}