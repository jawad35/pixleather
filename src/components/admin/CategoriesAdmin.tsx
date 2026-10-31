import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SingleImageInput } from "./ImageInput";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { deleteImages, signImages, clearImageCache } from "@/lib/storage";
import { clearApiImageCache } from "@/lib/api";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function CategoriesAdmin() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [image, setImage] = useState("");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editingImageValue, setEditingImageValue] = useState("");
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);

  const parents = data.filter((c: any) => !c.parent_id);
  const refresh = () => {
    clearImageCache();
    clearApiImageCache();
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
  };

  // Resolve all category images
  useEffect(() => {
    const resolveImages = async () => {
      const imagePaths = data
        .filter((c: any) => c.image_url && c.image_url.startsWith("category-images/"))
        .map((c: any) => c.image_url);
      
      if (imagePaths.length === 0) {
        // Still set URLs for non-storage images
        const urlMap: Record<string, string> = {};
        data.forEach((c: any) => {
          if (c.image_url && !c.image_url.startsWith("category-images/")) {
            urlMap[c.id] = c.image_url;
          }
        });
        setImageUrls(urlMap);
        return;
      }
      
      setIsLoadingImages(true);
      try {
        const resolved = await signImages(imagePaths);
        const urlMap: Record<string, string> = {};
        data.forEach((c: any) => {
          if (c.image_url) {
            if (c.image_url.startsWith("category-images/") && resolved[c.image_url]) {
              urlMap[c.id] = resolved[c.image_url];
            } else if (!c.image_url.startsWith("category-images/")) {
              urlMap[c.id] = c.image_url;
            }
          }
        });
        setImageUrls(urlMap);
      } catch (error) {
        console.error("Error resolving images:", error);
      } finally {
        setIsLoadingImages(false);
      }
    };
    
    if (data.length > 0) {
      resolveImages();
    }
  }, [data]);

  // Handle image change - mark old image for deletion
  const handleImageChange = (newImage: string) => {
    // If there was a previous image and it's from storage, mark it for deletion
    if (image && image.startsWith("category-images/") && image !== newImage) {
      setImagesToDelete(prev => {
        if (!prev.includes(image)) {
          return [...prev, image];
        }
        return prev;
      });
    }
    setImage(newImage);
  };

  // Handle image update for existing category
  const handleUpdateCategoryImage = async (categoryId: string, newImage: string) => {
    // Find the category to get the old image
    const category = data.find((c: any) => c.id === categoryId);
    
    // Track old image for deletion
    let oldImage = null;
    if (category?.image_url && category.image_url.startsWith("category-images/") && category.image_url !== newImage) {
      oldImage = category.image_url;
    }
    
    // Update category with new image
    const { error } = await supabase
      .from("categories")
      .update({ image_url: newImage || null })
      .eq("id", categoryId);
    
    if (error) {
      toast.error(error.message);
      return;
    }
    
    // Delete old image after successful update
    if (oldImage) {
      const { failed } = await deleteImages([oldImage]);
      if (failed.length > 0) {
        console.warn("Failed to delete old category image:", failed);
        toast.warning("Image updated but old image could not be deleted");
      } else {
        toast.success("Category image updated and old image removed");
      }
    } else {
      toast.success("Category image updated");
    }
    
    // Clear cache and refresh
    clearImageCache();
    clearApiImageCache();
    refresh();
    setEditingImageId(null);
    setEditingImageValue("");
  };

  const add = async () => {
    if (!name.trim()) return;
    const base = slugify(name);
    const slug = parent ? `${parents.find((p: any) => p.id === parent)?.slug}-${base}` : base;
    const { error } = await supabase.from("categories").insert({
      name, slug, parent_id: parent || null, sort_order: data.length, image_url: image || null,
    });
    if (error) return toast.error(error.message);
    setName(""); setImage(""); 
    toast.success("Category added");
    clearImageCache();
    clearApiImageCache();
    refresh();
  };

  const toggle = async (id: string, enabled: boolean) => {
    await supabase.from("categories").update({ enabled: !enabled }).eq("id", id);
    refresh();
  };

  const rename = async (id: string, current: string) => {
    const next = prompt("New category name", current);
    if (!next?.trim()) return;
    await supabase.from("categories").update({ name: next.trim() }).eq("id", id);
    refresh();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this category (and its subcategories)?")) return;
    
    setDeletingId(id);
    
    try {
      // First, fetch the category to get the image
      const { data: category, error: fetchError } = await supabase
        .from("categories")
        .select("image_url")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Delete image from storage if it exists
      let imageDeleted = false;
      if (category?.image_url && category.image_url.startsWith("category-images/")) {
        const { failed } = await deleteImages([category.image_url]);
        if (failed.length === 0) {
          imageDeleted = true;
        } else {
          console.warn("Failed to delete category image:", failed);
        }
      }
      
      // Delete the category from database
      const { error: deleteError } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);
      
      if (deleteError) throw deleteError;
      
      // Clear cache
      clearImageCache();
      clearApiImageCache();
      
      if (imageDeleted) {
        toast.success("Category and its image deleted successfully");
      } else if (category?.image_url) {
        toast.success("Category deleted but image could not be removed");
      } else {
        toast.success("Category deleted successfully");
      }
      refresh();
      
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast.error(error.message || "Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  };

  // Start editing category image
  const startImageEdit = (category: any) => {
    setEditingImageId(category.id);
    setEditingImageValue(category.image_url || "");
  };

  // Cancel image edit
  const cancelImageEdit = () => {
    setEditingImageId(null);
    setEditingImageValue("");
    // Clear any pending deletions
    setImagesToDelete([]);
  };

  // Clean up images marked for deletion when component unmounts
  useEffect(() => {
    return () => {
      // If there are images marked for deletion and form is not saved, clean up
      if (imagesToDelete.length > 0) {
        deleteImages(imagesToDelete).catch(console.error);
      }
    };
  }, [imagesToDelete]);

  const q = search.trim().toLowerCase();
  const match = (c: any) => !q || c.name.toLowerCase().includes(q);
  const visibleParents = parents.filter((p: any) => match(p) || data.some((c: any) => c.parent_id === p.id && match(c)));

  return (
    <div>
      <div className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category / subcategory name" className="w-56" />
          <select value={parent} onChange={(e) => setParent(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
            <option value="">Top level</option>
            {parents.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Button onClick={add} className="rounded-xl">Add</Button>
        </div>
        {!parent && (
          <div>
            <span className="mb-1 block text-sm font-medium">Category image (top-level only)</span>
            <SingleImageInput bucket="category-images" value={image} onChange={handleImageChange} />
          </div>
        )}
      </div>

      <Input placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-xs" />

      <div className="space-y-2">
        {visibleParents.map((p: any) => {
          const isDeleting = deletingId === p.id;
          const isEditingImage = editingImageId === p.id;
          const children = data.filter((c: any) => c.parent_id === p.id);
          const imageUrl = imageUrls[p.id];
          
          return (
            <div key={p.id} className="rounded-2xl border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Display category image with resolved URL */}
                  {isLoadingImages ? (
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center border border-border">
                      <Loader2 size={16} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={p.name} 
                      className="h-10 w-10 rounded-lg object-cover border border-border"
                      onError={(e) => {
                        console.error(`Failed to load image for ${p.name}:`, imageUrl);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : p.image_url ? (
                    <div className="h-10 w-10 rounded-lg bg-yellow-50 flex items-center justify-center border border-border text-[8px] text-muted-foreground break-all p-1">
                      {p.image_url.substring(0, 10)}...
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center border border-border">
                      <span className="text-xs text-muted-foreground">No img</span>
                    </div>
                  )}
                  <span className="font-medium">
                    {p.name} {!p.enabled && <em className="text-xs text-muted-foreground">(disabled)</em>}
                  </span>
                </div>
                <span className="space-x-3 text-sm flex items-center">
                  {/* Edit image button for root categories */}
                  <button 
                    onClick={() => startImageEdit(p)} 
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <Pencil size={14} /> Image
                  </button>
                  <button onClick={() => rename(p.id, p.name)} className="text-primary hover:underline">Rename</button>
                  <button onClick={() => toggle(p.id, p.enabled)} className="text-primary hover:underline">{p.enabled ? "Disable" : "Enable"}</button>
                  <button 
                    onClick={() => del(p.id)} 
                    disabled={isDeleting}
                    className="text-destructive hover:underline disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 size={14} className="inline animate-spin" />
                    ) : (
                      "Delete"
                    )}
                  </button>
                </span>
              </div>

              {/* Image edit modal/inline for root category */}
              {isEditingImage && (
                <div className="mt-3 rounded-xl border border-border bg-secondary/30 p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <SingleImageInput 
                        bucket="category-images" 
                        value={editingImageValue} 
                        onChange={setEditingImageValue} 
                      />
                    </div>
                    <div className="flex gap-2 pt-6">
                      <Button 
                        size="sm" 
                        onClick={() => handleUpdateCategoryImage(p.id, editingImageValue)}
                        className="rounded-xl"
                      >
                        Save Image
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={cancelImageEdit}
                        className="rounded-xl"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Subcategories */}
              <div className="ml-4 mt-2 space-y-1">
                {children.map((c: any) => {
                  const isChildDeleting = deletingId === c.id;
                  return (
                    <div key={c.id} className="flex items-center justify-between border-l border-border pl-3 text-sm">
                      <span>
                        ↳ {c.name} {!c.enabled && <em className="text-xs text-muted-foreground">(disabled)</em>}
                      </span>
                      <span className="space-x-3">
                        <button onClick={() => rename(c.id, c.name)} className="text-primary hover:underline">Rename</button>
                        <button onClick={() => toggle(c.id, c.enabled)} className="text-primary hover:underline">{c.enabled ? "Disable" : "Enable"}</button>
                        <button 
                          onClick={() => del(c.id)} 
                          disabled={isChildDeleting}
                          className="text-destructive hover:underline disabled:opacity-50"
                        >
                          {isChildDeleting ? (
                            <Loader2 size={14} className="inline animate-spin" />
                          ) : (
                            "Delete"
                          )}
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {!visibleParents.length && <p className="p-6 text-center text-muted-foreground">No categories found.</p>}
      </div>
    </div>
  );
}