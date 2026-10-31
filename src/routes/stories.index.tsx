import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { img } from "@/lib/images";

export const Route = createFileRoute("/stories/")({
  head: () => ({
    meta: [
      { title: "Our Stories — Behind the Craft" },
      { name: "description", content: "Go behind the scenes of our handmade manufacturing process, from raw materials to finished heirlooms." },
      { property: "og:title", content: "Our Stories — Behind the Craft" },
    ],
    links: [{ rel: "canonical", href: "/stories" }],
  }),
  loader: async () => ({ stories: await api.getStories() }),
  component: StoriesPage,
});

function StoriesPage() {
  const { stories } = Route.useLoaderData();
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-12 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Behind the craft</span>
        <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Our Stories</h1>
        <p className="mt-3 text-muted-foreground">Transparency builds trust. Step inside our workshop and see exactly how each product is made.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {stories.map((s: any, i: number) => (
          <motion.article key={s.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: (i % 2) * 0.08 }} className="group overflow-hidden rounded-3xl border border-border bg-card shadow-soft hover-lift">
            <Link to="/stories/$slug" params={{ slug: s.slug }}>
              <div className="relative aspect-[16/10] overflow-hidden">
                <img src={img(s.thumbnail)} alt={s.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">{s.category}</span>
              </div>
              <div className="p-6">
                <p className="text-xs text-muted-foreground">{new Date(s.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} • {s.author}</p>
                <h2 className="mt-2 font-display text-xl font-semibold transition-colors group-hover:text-primary">{s.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">Read More <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></span>
              </div>
            </Link>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
