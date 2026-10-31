// Supabase-backed data layer. Maps DB rows to the app's UI types and resolves
// private-bucket image paths into signed URLs. The UI keeps using these functions.
import { supabase } from "@/integrations/supabase/client";
import testimonialsData from "@/data/testimonials.json";
import { deleteImages, signImages, clearImageCache } from "@/lib/storage";
import { IMAGE_SIZES } from "@/lib/imageOptimizer";
import type { Product, Category, Story, Testimonial, Review, Spec, ProductFilters } from "./types";

const testimonials = testimonialsData as Testimonial[];

const DEFAULT_FEATURES = ["Handmade", "Premium Materials", "Long Lasting", "Ethically Sourced"];

const PRODUCT_SELECT =
  "*, category:categories!products_category_id_fkey(name,slug), subcategory:categories!products_subcategory_id_fkey(name,slug)";

// Image cache for faster subsequent loads
const imageCache = new Map<string, string>();

function specValue(specs: Spec[], label: string): string | undefined {
  return specs.find((s) => s.label?.toLowerCase() === label.toLowerCase())?.value || undefined;
}

async function mapProducts(rows: any[], options?: { thumbnail?: boolean }): Promise<Product[]> {
  const all: string[] = [];
  for (const r of rows) {
    if (r.feature_image) all.push(r.feature_image);
    (r.gallery ?? []).forEach((g: string) => all.push(g));
  }
  
  // Only sign images not in cache
  const toSign = all.filter(path => !imageCache.has(path));
  
  // Use optimized sizes based on context
  const sizeConfig = options?.thumbnail ? IMAGE_SIZES.thumbnail : IMAGE_SIZES.product;
  
  const signed = await signImages(toSign, {
    width: sizeConfig.width,
    height: sizeConfig.height,
    quality: sizeConfig.quality
  });
  
  // Update cache
  Object.entries(signed).forEach(([key, value]) => {
    imageCache.set(key, value);
  });
  
  const resolve = (v: string) => imageCache.get(v) ?? v;

  return rows.map((r) => {
    const specs: Spec[] = Array.isArray(r.specifications) ? r.specifications : [];
    const gallery = [
      ...(r.feature_image ? [resolve(r.feature_image)] : []),
      ...((r.gallery ?? []).map(resolve) as string[]),
    ];
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      heading: r.heading ?? r.name,
      category: r.category?.name ?? "",
      categorySlug: r.category?.slug,
      subcategory: r.subcategory?.name ?? "",
      subcategorySlug: r.subcategory?.slug,
      price: Number(r.price),
      oldPrice: r.old_price != null ? Number(r.old_price) : undefined,
      discount: r.discount ?? 0,
      featured: r.featured,
      hotSelling: r.hot_selling,
      newArrival: r.new_arrival,
      rating: Number(r.rating ?? 0),
      reviews: r.reviews_count ?? 0,
      stock: r.stock ?? 0,
      sku: r.sku ?? "",
      brand: r.brand ?? "",
      material: r.material ?? "",
      type: r.type ?? undefined,
      deliveryTime: r.delivery_time ?? undefined,
      colors: r.colors ?? [],
      sizes: r.sizes ?? [],
      variants: r.variants ?? [],
      shape: specValue(specs, "Shape"),
      pattern: specValue(specs, "Pattern"),
      finish: specValue(specs, "Finish"),
      weight: r.weight ?? undefined,
      dimensions: r.dimensions ?? undefined,
      description: r.description ?? "",
      features: DEFAULT_FEATURES,
      specifications: specs,
      gallery: gallery.length ? gallery : ["cat-wooden"],
      tags: r.tags ?? [],
    } satisfies Product;
  });
}

async function mapCategoryTree(rows: any[]): Promise<Category[]> {
  const imgVals = rows.map((r) => r.image_url).filter(Boolean);
  
  // Only sign images not in cache
  const toSign = imgVals.filter(path => !imageCache.has(path));
  
  // Use category size optimization
  const signed = await signImages(toSign, {
    width: IMAGE_SIZES.category.width,
    height: IMAGE_SIZES.category.height,
    quality: IMAGE_SIZES.category.quality
  });
  
  // Update cache
  Object.entries(signed).forEach(([key, value]) => {
    imageCache.set(key, value);
  });
  
  const resolve = (v: string) => imageCache.get(v) ?? v;
  
  const byId: Record<string, any> = {};
  rows.forEach((r) => (byId[r.id] = r));
  const parents = rows.filter((r) => !r.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  
  return parents.map((p) => {
    const children = rows
      .filter((r) => r.parent_id === p.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description ?? "",
      image: p.image_url ? resolve(p.image_url) : `cat-${p.slug}`,
      color: p.color ?? "#8B5A2B",
      order: p.sort_order,
      enabled: p.enabled,
      parentId: null,
      subcategories: children.map((c) => c.name),
      children: children.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description ?? "",
        image: "",
        color: c.color ?? "#8B5A2B",
        order: c.sort_order,
        enabled: c.enabled,
        parentId: p.id,
        subcategories: [],
      })),
    } satisfies Category;
  });
}

// In api.ts - Update the mapStories function

async function mapStories(rows: any[]): Promise<Story[]> {
  const vals: string[] = [];
  rows.forEach((r) => {
    if (r.thumbnail) vals.push(r.thumbnail);
    (r.gallery ?? []).forEach((g: string) => vals.push(g));
    // Parse sections if it's a string
    let sections = r.sections;
    if (typeof sections === 'string') {
      try {
        sections = JSON.parse(sections);
      } catch (e) {
        sections = [];
      }
    }
    if (Array.isArray(sections)) {
      sections.forEach((s: any) => s.image && vals.push(s.image));
    }
  });
  
  // Only sign images not in cache
  const toSign = vals.filter(path => !imageCache.has(path));
  
  // Use story size optimization
  const signed = await signImages(toSign, {
    width: IMAGE_SIZES.story.width,
    height: IMAGE_SIZES.story.height,
    quality: IMAGE_SIZES.story.quality
  });
  
  // Update cache
  Object.entries(signed).forEach(([key, value]) => {
    imageCache.set(key, value);
  });
  
  const resolve = (v: string) => imageCache.get(v) ?? v;
  
  return rows.map((r) => {
    // Parse sections if it's a string
    let sections = r.sections;
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
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description ?? "",
      body: r.body ?? "",
      category: r.category ?? "",
      date: r.story_date,
      author: r.author ?? "",
      thumbnail: r.thumbnail ? resolve(r.thumbnail) : "factory-story",
      gallery: (r.gallery ?? []).map(resolve),
      sections: sections.map((s: any) => ({ 
        ...s, 
        image: s.image ? resolve(s.image) : "" 
      })),
    };
  });
}

export const api = {
  getCategories: async (): Promise<Category[]> => {
    const { data } = await supabase.from("categories").select("*").eq("enabled", true);
    return mapCategoryTree(data ?? []);
  },
  getCategory: async (slug: string): Promise<Category | null> => {
    const cats = await api.getCategories();
    return cats.find((c) => c.slug === slug) ?? null;
  },

  getProducts: async (_filters: ProductFilters = {}): Promise<Product[]> => {
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("enabled", true)
      .order("created_at", { ascending: false });
    return mapProducts(data ?? [], { thumbnail: true });
  },

  getProduct: async (slug: string): Promise<Product | null> => {
    const { data } = await supabase.from("products").select(PRODUCT_SELECT).eq("slug", slug).maybeSingle();
    if (!data) return null;
    return (await mapProducts([data]))[0];
  },
  getRelated: async (product: Product, limit = 4): Promise<Product[]> => {
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("enabled", true)
      .eq("category_id", (await supabase.from("products").select("category_id").eq("id", product.id).maybeSingle()).data?.category_id ?? "")
      .neq("id", product.id)
      .limit(limit);
    return mapProducts(data ?? [], { thumbnail: true });
  },

  getFeatured: async (): Promise<Product[]> => {
    const { data } = await supabase.from("products").select(PRODUCT_SELECT).eq("enabled", true).eq("featured", true).limit(8);
    return mapProducts(data ?? [], { thumbnail: true });
  },
  getHotSelling: async (): Promise<Product[]> => {
    const { data } = await supabase.from("products").select(PRODUCT_SELECT).eq("enabled", true).eq("hot_selling", true).limit(8);
    return mapProducts(data ?? [], { thumbnail: true });
  },

  getStories: async (): Promise<Story[]> => {
    const { data } = await supabase.from("stories").select("*").eq("enabled", true).order("story_date", { ascending: false });
    return mapStories(data ?? []);
  },
  getStory: async (slug: string): Promise<Story | null> => {
    const { data } = await supabase.from("stories").select("*").eq("slug", slug).maybeSingle();
    if (!data) return null;
    return (await mapStories([data]))[0];
  },

  getTestimonials: () => Promise.resolve(testimonials),

  getReviews: async (productId: string): Promise<Review[]> => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .eq("approved", true)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      rating: r.rating,
      comment: r.comment,
      date: r.created_at,
    }));
  },

  getMaterials: async (): Promise<string[]> => {
    const { data } = await supabase.from("products").select("material").eq("enabled", true);
    return [...new Set((data ?? []).map((r) => r.material).filter(Boolean) as string[])];
  },
  getColors: async (): Promise<string[]> => {
    const { data } = await supabase.from("products").select("colors").eq("enabled", true);
    return [...new Set((data ?? []).flatMap((r) => r.colors ?? []))] as string[];
  },
};

/** Delete a product and all its associated images from storage */
export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First, fetch the product to get all image paths
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("feature_image, gallery")
      .eq("id", productId)
      .single();
    
    if (fetchError) throw fetchError;
    if (!product) return { success: false, error: "Product not found" };
    
    // Collect all image paths
    const imagePaths: string[] = [];
    if (product.feature_image) imagePaths.push(product.feature_image);
    if (product.gallery && Array.isArray(product.gallery)) {
      imagePaths.push(...product.gallery.filter(Boolean));
    }
    
    // Delete images from storage
    let storageErrors: string[] = [];
    if (imagePaths.length > 0) {
      const { failed } = await deleteImages(imagePaths);
      if (failed.length > 0) {
        storageErrors = failed;
        console.warn("Some images failed to delete:", failed);
      }
    }
    
    // Delete the product from database
    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);
    
    if (deleteError) throw deleteError;
    
    // Clear image cache
    clearImageCache();
    imageCache.clear();
    
    return {
      success: true,
      error: storageErrors.length > 0 
        ? `Product deleted but ${storageErrors.length} image(s) could not be removed: ${storageErrors.join(", ")}` 
        : undefined
    };
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return { success: false, error: error.message };
  }
}

/** Delete a story and all its associated images from storage */
export async function deleteStory(storyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First, fetch the story to get all image paths
    const { data: story, error: fetchError } = await supabase
      .from("stories")
      .select("thumbnail, gallery, sections")
      .eq("id", storyId)
      .single();
    
    if (fetchError) throw fetchError;
    if (!story) return { success: false, error: "Story not found" };
    
    // Collect all image paths
    const imagePaths: string[] = [];
    if (story.thumbnail) imagePaths.push(story.thumbnail);
    if (story.gallery && Array.isArray(story.gallery)) {
      imagePaths.push(...story.gallery.filter(Boolean));
    }
    if (story.sections && Array.isArray(story.sections)) {
      story.sections.forEach((section: any) => {
        if (section.image) imagePaths.push(section.image);
      });
    }
    
    // Delete images from storage
    let storageErrors: string[] = [];
    if (imagePaths.length > 0) {
      const { failed } = await deleteImages(imagePaths);
      if (failed.length > 0) {
        storageErrors = failed;
        console.warn("Some images failed to delete:", failed);
      }
    }
    
    // Delete the story from database
    const { error: deleteError } = await supabase
      .from("stories")
      .delete()
      .eq("id", storyId);
    
    if (deleteError) throw deleteError;
    
    // Clear image cache
    clearImageCache();
    imageCache.clear();
    
    return {
      success: true,
      error: storageErrors.length > 0 
        ? `Story deleted but ${storageErrors.length} image(s) could not be removed: ${storageErrors.join(", ")}` 
        : undefined
    };
  } catch (error: any) {
    console.error("Error deleting story:", error);
    return { success: false, error: error.message };
  }
}

/** Delete a category and all its associated images from storage */
export async function deleteCategory(categoryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First, fetch the category to get the image
    const { data: category, error: fetchError } = await supabase
      .from("categories")
      .select("image_url")
      .eq("id", categoryId)
      .single();
    
    if (fetchError) throw fetchError;
    if (!category) return { success: false, error: "Category not found" };
    
    // Delete image from storage if it exists
    let storageErrors: string[] = [];
    if (category.image_url) {
      const { failed } = await deleteImages([category.image_url]);
      if (failed.length > 0) {
        storageErrors = failed;
        console.warn("Failed to delete category image:", failed);
      }
    }
    
    // Delete the category from database
    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);
    
    if (deleteError) throw deleteError;
    
    // Clear image cache
    clearImageCache();
    imageCache.clear();
    
    return {
      success: true,
      error: storageErrors.length > 0 
        ? `Category deleted but image could not be removed: ${storageErrors.join(", ")}` 
        : undefined
    };
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return { success: false, error: error.message };
  }
}

// Helper to clear image cache when needed (e.g., after uploads)
export function clearApiImageCache() {
  clearImageCache();
  imageCache.clear();
}