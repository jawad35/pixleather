import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { img } from "@/lib/images";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Shop by Category — Handmade Collections" },
      { name: "description", content: "Explore our handmade collections: wooden, leather, cutlery, decor, resin, kitchen, gifts and sports." },
      { property: "og:title", content: "Shop by Category — Handmade Collections" },
    ],
    links: [{ rel: "canonical", href: "/categories" }],
  }),
  loader: async () => ({ categories: await api.getCategories() }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { categories } = Route.useLoaderData();
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-12 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Collections</span>
        <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Shop by Category</h1>
        <p className="mt-3 text-muted-foreground">Each collection is handmade in our workshop with premium materials and finished by hand.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c: any, i: number) => (
          <motion.div key={c.slug} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: (i % 3) * 0.06 }}>
            <Link to="/products" search={{ category: c.name }} className="group relative block aspect-[5/4] overflow-hidden rounded-3xl">
              <img src={img(c.image)} alt={c.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <h2 className="font-display text-2xl font-semibold">{c.name}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-white/85">{c.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.subcategories.slice(0, 3).map((s: string) => (
                    <span key={s} className="rounded-full bg-white/15 px-2.5 py-1 text-xs backdrop-blur-sm">{s}</span>
                  ))}
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">Shop now <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
