import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Target, Eye, Award, Globe2 } from "lucide-react";
import { img } from "@/lib/images";
import { SITE } from "@/lib/config";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: `About ${SITE.name} — Our Workshop & Craft` },
      { name: "description", content: "Learn about our handmade manufacturing workshop, our mission, vision and years of export-quality craftsmanship." },
      { property: "og:title", content: `About ${SITE.name}` },
      { property: "og:image", content: img("factory-story") },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

const TIMELINE = [
  { year: "2008", title: "Humble beginnings", text: "Started as a small family workshop crafting wooden kitchenware by hand." },
  { year: "2014", title: "Going global", text: "Began exporting export-quality pieces to customers across Europe and the Gulf." },
  { year: "2019", title: "New craft lines", text: "Expanded into leather, resin and forged cutlery with master artisans." },
  { year: "2024", title: "1000+ products", text: "Today we offer over a thousand handmade products, shipped worldwide." },
];

const VALUES = [
  { icon: Target, title: "Our Mission", text: "To bring affordable, export-quality handmade products to homes around the world." },
  { icon: Eye, title: "Our Vision", text: "A world that values craftsmanship over mass production, one heirloom at a time." },
  { icon: Award, title: "Quality", text: "Every piece is inspected twice by hand before it ever leaves our workshop." },
  { icon: Globe2, title: "Export Experience", text: "Over 15 years shipping to customers across 30+ countries." },
];

function AboutPage() {
  return (
    <div>
      <section className="relative">
        <div className="relative h-[55vh] min-h-[400px]">
          <img src={img("factory-story")} alt="Our workshop" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-ink/60" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-xl text-white">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/90">Our Story</span>
                <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">Craftsmanship is in our hands</h1>
                <p className="mt-4 text-white/85">For over fifteen years we've turned raw materials into objects worth keeping — built by people who care about every detail.</p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => (
            <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: (i % 4) * 0.06 }} className="rounded-3xl border border-border bg-card p-6 hover-lift">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground"><v.icon size={22} /></div>
              <h3 className="mt-4 font-display text-lg font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{v.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-cream py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Our journey</span>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">A timeline of craft</h2>
          </div>
          <div className="relative space-y-10 before:absolute before:left-[7px] before:top-2 before:h-full before:w-px before:bg-border sm:before:left-1/2">
            {TIMELINE.map((t, i) => (
              <motion.div key={t.year} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`relative pl-8 sm:w-1/2 sm:pl-0 ${i % 2 ? "sm:ml-auto sm:pl-12" : "sm:pr-12 sm:text-right"}`}>
                <span className={`absolute top-1.5 h-3.5 w-3.5 rounded-full bg-primary left-0 ${i % 2 ? "sm:-left-[7px]" : "sm:left-auto sm:-right-[7px]"}`} />
                <span className="font-display text-2xl font-bold text-primary">{t.year}</span>
                <h3 className="mt-1 font-display text-lg font-semibold">{t.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">Ready to own a piece of our craft?</h2>
        <p className="mt-3 text-muted-foreground">Explore over a thousand handmade products, each made to last.</p>
        <Button asChild size="lg" className="mt-6 rounded-full px-8"><Link to="/products">Shop the Collection</Link></Button>
      </section>
    </div>
  );
}
