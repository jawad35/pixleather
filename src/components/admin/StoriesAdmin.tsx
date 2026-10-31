import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { StoryForm } from "./StoryForm";
import { deleteImages } from "@/lib/storage";

const PAGE_SIZE = 15;

export function StoriesAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingStory, setLoadingStory] = useState<string | null>(null);

  const { data: allCats = [] } = useQuery({
    queryKey: ["admin-story-cats"],
    queryFn: async () => {
      const { data } = await supabase.from("stories").select("category");
      return [...new Set((data ?? []).map((s: any) => s.category).filter(Boolean))] as string[];
    },
  });

  const filters = { search, category, status, page };
  const { data, isFetching } = useQuery({
    queryKey: ["admin-stories", filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase.from("stories").select("id,title,category,enabled,story_date,slug,thumbnail,gallery", { count: "exact" });
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      if (category) q = q.eq("category", category);
      if (status === "active") q = q.eq("enabled", true);
      if (status === "disabled") q = q.eq("enabled", false);
      q = q.order("story_date", { ascending: false });
      const from = page * PAGE_SIZE;
      const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggle = async (id: string, enabled: boolean) => {
    await supabase.from("stories").update({ enabled: !enabled }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-stories"] });
  };

  // Fetch full story data including sections
  const fetchFullStory = async (id: string) => {
    setLoadingStory(id);
    try {
      const { data: story, error } = await supabase
        .from("stories")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      // Parse sections if it's a string
      let sections = story.sections;
      if (typeof sections === 'string') {
        try {
          sections = JSON.parse(sections);
        } catch (e) {
          sections = [];
        }
      }
      if (!Array.isArray(sections)) {
        sections = [];
      }
      
      // Set editing with parsed sections
      setEditing({
        ...story,
        sections: sections
      });
      
    } catch (error: any) {
      console.error("Error fetching story:", error);
      toast.error(error.message || "Failed to load story");
    } finally {
      setLoadingStory(null);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this story and all its images?")) return;
    
    setDeletingId(id);
    
    try {
      // First, fetch the full story data to get all image paths
      const { data: story, error: fetchError } = await supabase
        .from("stories")
        .select("thumbnail, gallery, sections")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Collect all image paths
      const imagePaths: string[] = [];
      
      // Add thumbnail
      if (story?.thumbnail) {
        imagePaths.push(story.thumbnail);
      }
      
      // Add gallery images
      if (story?.gallery && Array.isArray(story.gallery)) {
        story.gallery.forEach((img: string) => {
          if (img) imagePaths.push(img);
        });
      }
      
      // Add section images - parse if string
      let sections = story?.sections;
      if (typeof sections === 'string') {
        try {
          sections = JSON.parse(sections);
        } catch (e) {
          sections = [];
        }
      }
      if (Array.isArray(sections)) {
        sections.forEach((section: any) => {
          if (section.image) imagePaths.push(section.image);
        });
      }
      
      // Delete images from storage
      let storageError = false;
      if (imagePaths.length > 0) {
        const { failed } = await deleteImages(imagePaths);
        if (failed.length > 0) {
          storageError = true;
          console.warn("Some images failed to delete:", failed);
          toast.warning(`Story deleted but ${failed.length} image(s) could not be removed`);
        }
      }
      
      // Delete the story from database
      const { error: deleteError } = await supabase
        .from("stories")
        .delete()
        .eq("id", id);
      
      if (deleteError) throw deleteError;
      
      if (!storageError) {
        toast.success("Story and all images deleted successfully");
      }
      
      // Invalidate queries
      qc.invalidateQueries({ queryKey: ["admin-stories"] });
      qc.invalidateQueries({ queryKey: ["admin-count", "stories"] });
      qc.invalidateQueries({ queryKey: ["stories"] });
      
    } catch (error: any) {
      console.error("Error deleting story:", error);
      toast.error(error.message || "Failed to delete story");
    } finally {
      setDeletingId(null);
    }
  };

  if (creating || editing)
    return <StoryForm initial={editing ?? undefined} onClose={() => { setCreating(false); setEditing(null); }} />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Stories <span className="text-sm text-muted-foreground">({total})</span></h2>
        <Button onClick={() => setCreating(true)} className="rounded-xl"><Plus size={16} /> Add Story</Button>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Input placeholder="Search title…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
          <option value="">All categories</option>
          {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <div className="space-y-2">
        {rows.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border p-4">
            <div>
              <p className="font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.category || "—"} • {s.story_date}</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">{s.enabled ? "Active" : "Disabled"}</span>
              <button 
                onClick={() => fetchFullStory(s.id)} 
                disabled={loadingStory === s.id}
                className="text-primary hover:underline disabled:opacity-50"
              >
                {loadingStory === s.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Pencil size={15} />
                )}
              </button>
              <button onClick={() => toggle(s.id, s.enabled)} className="text-primary hover:underline">{s.enabled ? "Disable" : "Enable"}</button>
              <button 
                onClick={() => del(s.id)} 
                disabled={deletingId === s.id}
                className="text-destructive hover:underline disabled:opacity-50"
              >
                {deletingId === s.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
              </button>
            </div>
          </div>
        ))}
        {!rows.length && <p className="p-6 text-center text-muted-foreground">{isFetching ? "Loading…" : "No stories found."}</p>}
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