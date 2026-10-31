import { useEffect, useRef, useState } from "react";
import { Upload, X, Link2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadImage, signImages, deleteImages, type Bucket } from "@/lib/storage";
import { toast } from "sonner";

function useResolved(values: string[]) {
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    signImages(values).then((m) => alive && setMap(m));
    return () => {
      alive = false;
    };
  }, [values.join("|")]);
  return (v: string) => map[v] ?? v;
}

/** Single feature image uploader. */
export function SingleImageInput({
  bucket,
  value,
  onChange,
}: {
  bucket: Bucket;
  value: string;
  onChange: (v: string) => void;
}) {
  const resolve = useResolved(value ? [value] : []);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const path = await uploadImage(bucket, file);
      onChange(path);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    // If it's a storage path, delete it from storage
    if (value && value.startsWith(`${bucket}/`)) {
      try {
        const { failed } = await deleteImages([value]);
        if (failed.length === 0) {
          toast.success("Image removed from storage");
        } else {
          toast.warning("Image removed from form but could not be deleted from storage");
        }
      } catch (error) {
        console.error("Error deleting image:", error);
        toast.error("Failed to delete image from storage");
      }
    }
    onChange("");
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          <img src={resolve(value)} alt="" className="h-28 w-28 rounded-xl border border-border object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <div className="grid h-28 w-28 place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
          No image
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <Button type="button" size="sm" variant="outline" className="rounded-xl" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload size={14} /> {busy ? "Uploading…" : "Upload"}
        </Button>
        <div className="flex items-center gap-1">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="or paste image URL"
            className="w-48 rounded-xl border border-input bg-background px-3 py-1.5 text-sm"
          />
          <Button type="button" size="sm" variant="ghost" onClick={() => { if (url.trim()) { onChange(url.trim()); setUrl(""); } }}>
            <Link2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Multiple gallery images uploader. */
export function MultiImageInput({
  bucket,
  values,
  onChange,
}: {
  bucket: Bucket;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const resolve = useResolved(values);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList) => {
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const f of Array.from(files)) {
        const path = await uploadImage(bucket, f);
        uploaded.push(path);
      }
      onChange([...values, ...uploaded]);
      toast.success(`${uploaded.length} image(s) uploaded successfully`);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (i: number) => {
    const removed = values[i];
    
    // If it's a storage path, delete it from storage
    if (removed && removed.startsWith(`${bucket}/`)) {
      try {
        const { failed } = await deleteImages([removed]);
        if (failed.length === 0) {
          toast.success("Image removed from storage");
        } else {
          toast.warning("Image removed from gallery but could not be deleted from storage");
        }
      } catch (error) {
        console.error("Error deleting image:", error);
        toast.error("Failed to delete image from storage");
      }
    }
    
    onChange(values.filter((_, idx) => idx !== i));
  };

  const makeFirst = (i: number) => {
    const next = [...values];
    const [v] = next.splice(i, 1);
    onChange([v, ...next]);
    toast.success("Image set as cover");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {values.map((v, i) => (
          <div key={v + i} className="relative group">
            <img src={resolve(v)} alt={`Gallery ${i + 1}`} className="h-24 w-24 rounded-xl border border-border object-cover" />
            <button 
              type="button" 
              onClick={() => remove(i)} 
              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              <X size={13} />
            </button>
            {i !== 0 && (
              <button 
                type="button" 
                onClick={() => makeFirst(i)} 
                title="Make cover" 
                className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Star size={12} />
              </button>
            )}
            {i === 0 && (
              <div className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-green-500 text-white" title="Cover image">
                <Star size={12} fill="white" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
        <Button type="button" size="sm" variant="outline" className="rounded-xl" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload size={14} /> {busy ? "Uploading…" : "Upload images"}
        </Button>
        <div className="flex items-center gap-1">
          <input 
            value={url} 
            onChange={(e) => setUrl(e.target.value)} 
            placeholder="or paste image URL" 
            className="w-48 rounded-xl border border-input bg-background px-3 py-1.5 text-sm" 
          />
          <Button 
            type="button" 
            size="sm" 
            variant="ghost" 
            onClick={() => { 
              if (url.trim()) { 
                onChange([...values, url.trim()]); 
                setUrl(""); 
                toast.success("Image URL added"); 
              } 
            }}
          >
            <Link2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}