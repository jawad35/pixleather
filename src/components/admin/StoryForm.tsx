import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SingleImageInput } from "./ImageInput";
import { toast } from "sonner";
import { X, Plus, GripVertical, Loader2 } from "lucide-react";
import { deleteImages, clearImageCache } from "@/lib/storage";
import { clearApiImageCache } from "@/lib/api";

type Section = { heading: string; text: string; image: string };

interface StoryRow {
  id?: string;
  title: string;
  slug: string;
  description: string;
  body: string;
  category: string;
  author: string;
  story_date: string;
  thumbnail: string;
  sections: Section[];
  enabled: boolean;
}

const EMPTY: StoryRow = {
  title: "", slug: "", description: "", body: "", category: "", author: "",
  story_date: new Date().toISOString().slice(0, 10), thumbnail: "", sections: [], enabled: true,
};

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium">{label}</span>{children}</label>;
}

export function StoryForm({ initial, onClose }: { initial?: any; onClose: () => void }) {
  const qc = useQueryClient();
  
  // Initialize form with proper sections parsing
  const [form, setForm] = useState<StoryRow>(() => {
    if (initial) {
      // Parse sections if they come as JSON string
      let sections = initial.sections || [];
      if (typeof sections === 'string') {
        try {
          sections = JSON.parse(sections);
        } catch (e) {
          sections = [];
        }
      }
      // Ensure sections is an array
      if (!Array.isArray(sections)) {
        sections = [];
      }
      
      return {
        ...EMPTY,
        ...initial,
        story_date: (initial.story_date ?? "").slice(0, 10),
        sections: sections,
      };
    }
    return EMPTY;
  });
  
  const [busy, setBusy] = useState(false);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);

  const set = <K extends keyof StoryRow>(k: K, v: StoryRow[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Track original thumbnail to detect changes
  const [originalThumbnail, setOriginalThumbnail] = useState<string>(initial?.thumbnail || "");
  const [originalSections, setOriginalSections] = useState<Section[]>(
    initial?.sections ? (Array.isArray(initial.sections) ? JSON.parse(JSON.stringify(initial.sections)) : []) : []
  );

  // Handle thumbnail change - mark old for deletion
  const handleThumbnailChange = (newThumbnail: string) => {
    if (originalThumbnail && originalThumbnail.startsWith("story-images/") && originalThumbnail !== newThumbnail) {
      setImagesToDelete(prev => {
        if (!prev.includes(originalThumbnail)) {
          return [...prev, originalThumbnail];
        }
        return prev;
      });
    }
    set("thumbnail", newThumbnail);
  };

  const setSection = (i: number, patch: Partial<Section>) => {
    const n = [...form.sections];
    if (patch.image !== undefined) {
      const oldImage = n[i]?.image;
      const newImage = patch.image;
      
      if (oldImage && oldImage.startsWith("story-images/") && oldImage !== newImage) {
        const isOriginal = originalSections.some(s => s.image === oldImage);
        if (isOriginal || !newImage) {
          setImagesToDelete(prev => {
            if (!prev.includes(oldImage)) {
              return [...prev, oldImage];
            }
            return prev;
          });
        }
      }
    }
    n[i] = { ...n[i], ...patch };
    set("sections", n);
  };

  const moveSection = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= form.sections.length) return;
    const n = [...form.sections];
    [n[i], n[j]] = [n[j], n[i]];
    set("sections", n);
  };

  const removeSection = (index: number) => {
    const sections = [...form.sections];
    if (sections[index]?.image && sections[index].image.startsWith("story-images/")) {
      setImagesToDelete(prev => {
        if (!prev.includes(sections[index].image)) {
          return [...prev, sections[index].image];
        }
        return prev;
      });
    }
    sections.splice(index, 1);
    set("sections", sections);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.thumbnail) return toast.error("Thumbnail is required");
    
    setBusy(true);

    try {
      // 1. Delete images that were removed
      if (imagesToDelete.length > 0) {
        const { failed } = await deleteImages(imagesToDelete);
        if (failed.length > 0) {
          console.warn("Failed to delete some images:", failed);
          toast.warning(`Some images could not be deleted: ${failed.length} failed`);
        } else {
          toast.success(`${imagesToDelete.length} old image(s) removed from storage`);
        }
        setImagesToDelete([]);
      }

      // 2. Prepare payload
      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        description: form.description || null,
        body: form.body || null,
        category: form.category || null,
        author: form.author || null,
        story_date: form.story_date,
        thumbnail: form.thumbnail || null,
        gallery: [], // Empty gallery since we don't use it
        sections: form.sections || [],
        enabled: form.enabled,
      };

      console.log("Saving sections:", payload.sections);

      // 3. Save to database
      let error;
      if (initial?.id) {
        const { error: updateError } = await supabase
          .from("stories")
          .update(payload)
          .eq("id", initial.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("stories")
          .insert(payload);
        error = insertError;
      }

      if (error) {
        console.error("Save error:", error);
        throw error;
      }

      // 4. Clear image cache
      clearImageCache();
      clearApiImageCache();

      toast.success(initial?.id ? "Story updated successfully" : "Story created successfully");
      qc.invalidateQueries({ queryKey: ["admin-stories"] });
      qc.invalidateQueries({ queryKey: ["stories"] });
      onClose();

    } catch (error: any) {
      console.error("Error saving story:", error);
      toast.error(error.message || "Failed to save story");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">{initial?.id ? "Edit Story" : "New Story"}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Slug (auto if blank)">
          <Input 
            value={form.slug} 
            onChange={(e) => set("slug", e.target.value)} 
            placeholder={slugify(form.title)} 
          />
        </Field>
        <Field label="Category">
          <Input value={form.category} onChange={(e) => set("category", e.target.value)} />
        </Field>
        <Field label="Author">
          <Input value={form.author} onChange={(e) => set("author", e.target.value)} />
        </Field>
        <Field label="Date">
          <Input type="date" value={form.story_date} onChange={(e) => set("story_date", e.target.value)} />
        </Field>
      </div>

      <Field label="Short Description">
        <textarea 
          value={form.description} 
          onChange={(e) => set("description", e.target.value)} 
          className="min-h-20 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" 
          placeholder="Brief description for the story card"
        />
      </Field>
      <Field label="Intro Body (optional)">
        <textarea 
          value={form.body} 
          onChange={(e) => set("body", e.target.value)} 
          className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" 
          placeholder="Full story content..."
        />
      </Field>

      <Field label="Thumbnail / Cover Image">
        <SingleImageInput 
          bucket="story-images" 
          value={form.thumbnail} 
          onChange={handleThumbnailChange} 
        />
      </Field>

      {/* Sections */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Story Sections</span>
          <Button 
            type="button" 
            size="sm" 
            variant="outline" 
            onClick={() => {
              const newSections = [...form.sections, { heading: "", text: "", image: "" }];
              set("sections", newSections);
            }}
          >
            <Plus size={14} /> Add Section
          </Button>
        </div>
        <div className="space-y-4">
          {form.sections && form.sections.length > 0 ? (
            form.sections.map((s, i) => (
              <div key={i} className="rounded-2xl border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <GripVertical size={13} /> Section {i + 1}
                  </span>
                  <div className="flex gap-2 text-xs">
                    <button type="button" onClick={() => moveSection(i, -1)} className="hover:text-primary">↑</button>
                    <button type="button" onClick={() => moveSection(i, 1)} className="hover:text-primary">↓</button>
                    <button type="button" onClick={() => removeSection(i)} className="text-destructive hover:text-destructive/80">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Input 
                    value={s.heading || ""} 
                    placeholder="Section heading" 
                    onChange={(e) => setSection(i, { heading: e.target.value })} 
                  />
                  <textarea 
                    value={s.text || ""} 
                    placeholder="Section text…" 
                    onChange={(e) => setSection(i, { text: e.target.value })} 
                    className="min-h-20 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" 
                  />
                  <SingleImageInput 
                    bucket="story-images" 
                    value={s.image || ""} 
                    onChange={(v) => setSection(i, { image: v })} 
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No sections yet. Add as many as you like.</p>
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input 
          type="checkbox" 
          checked={form.enabled} 
          onChange={(e) => set("enabled", e.target.checked)} 
        /> 
        Enabled (visible on site)
      </label>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={busy} className="rounded-xl">
          {busy ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            "Save Story"
          )}
        </Button>
      </div>
    </div>
  );
}