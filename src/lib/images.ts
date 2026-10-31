// Central image registry. JSON data references images by key.
// To add a product image: drop the file in src/assets, import it here, add to the map.
// When a real backend exists, replace these keys with absolute URLs and delete this map.
import heroCarve from "@/assets/hero-1.jpg";
import heroFlatlay from "@/assets/hero-2.jpg";
import factoryStory from "@/assets/factory-story.jpg";
import catWooden from "@/assets/cat-wooden.jpg";
import catLeather from "@/assets/cat-leather.jpg";
import catCutlery from "@/assets/cat-cutlery.jpg";
import catDecor from "@/assets/cat-decor.jpg";
import catResin from "@/assets/cat-resin.jpg";
import catKitchen from "@/assets/cat-kitchen.jpg";
import catGifts from "@/assets/cat-gifts.jpg";
import catSports from "@/assets/cat-sports.jpg";

const MAP: Record<string, string> = {
  "hero-1": heroCarve,
  "hero-2": heroFlatlay,
  "factory-story": factoryStory,
  "cat-wooden": catWooden,
  "cat-leather": catLeather,
  "cat-cutlery": catCutlery,
  "cat-decor": catDecor,
  "cat-resin": catResin,
  "cat-kitchen": catKitchen,
  "cat-gifts": catGifts,
  "cat-sports": catSports,
};

const FALLBACK = heroFlatlay;

export function img(key: string): string {
  if (key.startsWith("http") || key.startsWith("/")) return key;
  return MAP[key] ?? FALLBACK;
}
