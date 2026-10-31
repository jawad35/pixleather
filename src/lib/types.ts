export interface Spec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  heading?: string;
  category: string;
  categorySlug?: string;
  subcategory: string;
  subcategorySlug?: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  featured?: boolean;
  hotSelling?: boolean;
  newArrival?: boolean;
  rating: number;
  reviews: number;
  stock: number;
  sku: string;
  brand: string;
  material: string;
  type?: string;
  deliveryTime?: string;
  colors: string[];
  sizes: string[];
  variants: string[];
  shape?: string;
  pattern?: string;
  finish?: string;
  weight?: string;
  dimensions?: string;
  description: string;
  features: string[];
  specifications: Spec[];
  /** Resolved image URLs (already signed / passthrough). */
  gallery: string[];
  tags?: string[];
}

export interface Category {
  id?: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  color: string;
  order: number;
  enabled?: boolean;
  parentId?: string | null;
  subcategories: string[];
  children?: Category[];
}


export interface StorySection {
  heading: string;
  text: string;
  image: string;
}

export interface Story {
  id: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  category: string;
  date: string;
  author: string;
  thumbnail: string;
  gallery: string[];
  sections?: StorySection[];
}

export interface Banner {
  id: string;
  type: "hero" | "discount" | "promo";
  title: string;
  subtitle?: string;
  image?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
}

export interface Review {
  id?: string;
  userId?: string | null;
  name: string;
  rating: number;
  comment: string;
  date: string;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  material?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  onlyDiscount?: boolean;
  inStock?: boolean;
  sort?: "newest" | "price-asc" | "price-desc" | "popular" | "discount";
}
