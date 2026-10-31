import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SingleImageInput, MultiImageInput } from "./ImageInput";
import { toast } from "sonner";
import { X, Plus, Loader2 } from "lucide-react";
import { deleteImages } from "@/lib/storage";

type Spec = { label: string; value: string };

export interface ProductRow {
  id?: string;
  name: string;
  slug: string;
  heading: string;
  description: string;
  price: number;
  old_price: number | null;
  discount: number;
  stock: number;
  category_id: string | null;
  subcategory_id: string | null;
  brand: string;
  sku: string;
  material: string;
  type: string;
  weight: string;
  dimensions: string;
  delivery_time: string;
  colors: string[];
  sizes: string[];
  variants: string[];
  tags: string[];
  specifications: Spec[];
  feature_image: string;
  gallery: string[];
  featured: boolean;
  hot_selling: boolean;
  new_arrival: boolean;
  enabled: boolean;
}

const EMPTY: ProductRow = {
  name: "", slug: "", heading: "", description: "", price: 0, old_price: null, discount: 0, stock: 0,
  category_id: null, subcategory_id: null, brand: "", sku: "", material: "", type: "", weight: "",
  dimensions: "", delivery_time: "", colors: [], sizes: [], variants: [], tags: [], specifications: [],
  feature_image: "", gallery: [], featured: false, hot_selling: false, new_arrival: false, enabled: true,
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function CsvInput({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-input bg-background p-2">
        {values.map((v, i) => (
          <span key={v + i} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
            {v}
            <button type="button" onClick={() => onChange(values.filter((_, idx) => idx !== i))}><X size={11} /></button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === ",") && text.trim()) {
              e.preventDefault();
              onChange([...values, text.trim()]);
              setText("");
            }
          }}
          placeholder="Type & press Enter"
          className="min-w-24 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
    </Field>
  );
}

export function ProductForm({ initial, onClose }: { initial?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductRow>(() =>
    initial ? { ...EMPTY, ...initial, specifications: Array.isArray(initial.specifications) ? initial.specifications : [] } : EMPTY,
  );
  const [busy, setBusy] = useState(false);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  
  const set = <K extends keyof ProductRow>(k: K, v: ProductRow[K]) => setForm((f) => ({ ...f, [k]: v }));

  const { data: cats = [] } = useQuery({
    queryKey: ["admin-all-cats"],
    queryFn: async () => (await supabase.from("categories").select("id,name,parent_id").order("name")).data ?? [],
  });
  const parents = cats.filter((c: any) => !c.parent_id);
  const subs = cats.filter((c: any) => c.parent_id === form.category_id);

  // Handle feature image change - mark old for deletion
  const handleFeatureImageChange = (newImage: string) => {
    // If there was a previous image and it's from storage, mark it for deletion
    if (form.feature_image && form.feature_image.startsWith("product-images/") && form.feature_image !== newImage) {
      setImagesToDelete(prev => [...prev, form.feature_image]);
    }
    set("feature_image", newImage);
  };

  // Handle gallery change - mark removed images for deletion
  const handleGalleryChange = (newGallery: string[]) => {
    // Find which images were removed
    const removed = form.gallery.filter(img => 
      img.startsWith("product-images/") && !newGallery.includes(img)
    );
    if (removed.length > 0) {
      setImagesToDelete(prev => [...prev, ...removed]);
    }
    set("gallery", newGallery);
  };

  // Clean up when component unmounts (if user closes without saving)
  useEffect(() => {
    return () => {
      // If there are images marked for deletion and form is not saved, we should clean up
      // But we don't want to delete them if the user is just closing
      // The images will be deleted on save
    };
  }, []);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    setBusy(true);

    try {
      // 1. Delete images that were removed
      if (imagesToDelete.length > 0) {
        const { failed } = await deleteImages(imagesToDelete);
        if (failed.length > 0) {
          console.warn("Failed to delete some images:", failed);
          toast.warning(`Some images could not be deleted: ${failed.length} failed`);
        }
        // Clear the deletion list after attempting deletion
        setImagesToDelete([]);
      }

      // 2. Prepare payload
      const payload = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        heading: form.heading || null,
        description: form.description || null,
        price: Number(form.price) || 0,
        old_price: form.old_price ? Number(form.old_price) : null,
        discount: Number(form.discount) || 0,
        stock: Number(form.stock) || 0,
        category_id: form.category_id || null,
        subcategory_id: form.subcategory_id || null,
        brand: form.brand || null,
        sku: form.sku || null,
        material: form.material || null,
        type: form.type || null,
        weight: form.weight || null,
        dimensions: form.dimensions || null,
        delivery_time: form.delivery_time || null,
        colors: form.colors,
        sizes: form.sizes,
        variants: form.variants,
        tags: form.tags,
        specifications: form.specifications,
        feature_image: form.feature_image || null,
        gallery: form.gallery,
        featured: form.featured,
        hot_selling: form.hot_selling,
        new_arrival: form.new_arrival,
        enabled: form.enabled,
      };

      // 3. Save to database
      const { error } = initial?.id
        ? await supabase.from("products").update(payload).eq("id", initial.id)
        : await supabase.from("products").insert(payload);

      if (error) throw error;

      toast.success(initial?.id ? "Product updated" : "Product created");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
      
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.message || "Failed to save product");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">{initial?.id ? "Edit Product" : "New Product"}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Slug (auto if blank)"><Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder={slugify(form.name)} /></Field>
        <Field label="Heading"><Input value={form.heading} onChange={(e) => set("heading", e.target.value)} /></Field>
        <Field label="Brand"><Input value={form.brand} onChange={(e) => set("brand", e.target.value)} /></Field>
      </div>

      <Field label="Description">
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Price ($)"><Input type="number" value={form.price} onChange={(e) => set("price", Number(e.target.value))} /></Field>
        <Field label="Old Price ($)"><Input type="number" value={form.old_price ?? ""} onChange={(e) => set("old_price", e.target.value ? Number(e.target.value) : null)} /></Field>
        <Field label="Discount (%)"><Input type="number" value={form.discount} onChange={(e) => set("discount", Number(e.target.value))} /></Field>
        <Field label="Stock"><Input type="number" value={form.stock} onChange={(e) => set("stock", Number(e.target.value))} /></Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <select value={form.category_id ?? ""} onChange={(e) => { set("category_id", e.target.value || null); set("subcategory_id", null); }} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
            <option value="">— None —</option>
            {parents.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Subcategory">
          <select value={form.subcategory_id ?? ""} onChange={(e) => set("subcategory_id", e.target.value || null)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
            <option value="">— None —</option>
            {subs.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="SKU"><Input value={form.sku} onChange={(e) => set("sku", e.target.value)} /></Field>
        <Field label="Material"><Input value={form.material} onChange={(e) => set("material", e.target.value)} /></Field>
        <Field label="Type"><Input value={form.type} onChange={(e) => set("type", e.target.value)} /></Field>
        <Field label="Weight"><Input value={form.weight} onChange={(e) => set("weight", e.target.value)} /></Field>
        <Field label="Dimensions"><Input value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} /></Field>
        <Field label="Delivery Time"><Input value={form.delivery_time} onChange={(e) => set("delivery_time", e.target.value)} /></Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CsvInput label="Colors" values={form.colors} onChange={(v) => set("colors", v)} />
        <CsvInput label="Sizes" values={form.sizes} onChange={(v) => set("sizes", v)} />
        <CsvInput label="Variants" values={form.variants} onChange={(v) => set("variants", v)} />
        <CsvInput label="Tags" values={form.tags} onChange={(v) => set("tags", v)} />
      </div>

      {/* Specifications */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Specifications</span>
          <Button type="button" size="sm" variant="outline" onClick={() => set("specifications", [...form.specifications, { label: "", value: "" }])}><Plus size={14} /> Add</Button>
        </div>
        <div className="space-y-2">
          {form.specifications.map((s, i) => (
            <div key={i} className="flex gap-2">
              <Input value={s.label} placeholder="Label" onChange={(e) => { const n = [...form.specifications]; n[i] = { ...n[i], label: e.target.value }; set("specifications", n); }} />
              <Input value={s.value} placeholder="Value" onChange={(e) => { const n = [...form.specifications]; n[i] = { ...n[i], value: e.target.value }; set("specifications", n); }} />
              <Button type="button" variant="ghost" size="icon" onClick={() => set("specifications", form.specifications.filter((_, idx) => idx !== i))}><X size={15} /></Button>
            </div>
          ))}
        </div>
      </div>

      <Field label="Feature Image">
        <SingleImageInput 
          bucket="product-images" 
          value={form.feature_image} 
          onChange={handleFeatureImageChange} 
        />
      </Field>
      
      <Field label="Gallery / Additional Images">
        <MultiImageInput 
          bucket="product-images" 
          values={form.gallery} 
          onChange={handleGalleryChange} 
        />
      </Field>

      <div className="flex flex-wrap gap-4">
        {([["featured", "Featured"], ["hot_selling", "Hot Selling"], ["new_arrival", "New Arrival"], ["enabled", "Enabled"]] as const).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form[k] as boolean} onChange={(e) => set(k, e.target.checked as any)} /> {label}
          </label>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={busy} className="rounded-xl">
          {busy ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            "Save Product"
          )}
        </Button>
      </div>
    </div>
  );
}