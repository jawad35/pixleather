import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Hammer, Globe2, Truck, Sparkles, BadgeDollarSign, Quote } from "lucide-react";
import { FaInstagram } from "react-icons/fa";
import { api } from "@/lib/api";
import { img } from "@/lib/images";
import { SITE } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/ProductCard";
import { StarRating } from "@/components/StarRating";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${SITE.name} — Handcrafted Products Made With Passion` },
      { name: "description", content: "Shop premium handmade wooden, leather, resin and cutlery products. 100% handmade, premium materials, worldwide quality." },
      { property: "og:title", content: `${SITE.name} — Handcrafted Products Made With Passion` },
      { property: "og:description", content: "Premium handmade products crafted with passion." },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  loader: async () => ({
    categories: await api.getCategories(),
    hot: await api.getHotSelling(),
    featured: await api.getFeatured(),
    testimonials: await api.getTestimonials(),
  }),
  component: Home,
});

const HERO_SLIDES = [
  { image: "hero-1", kicker: "100% Handmade • Premium Materials" },
  { image: "factory-story", kicker: "Crafted in our workshop" },
  { image: "hero-2", kicker: "Built to last a lifetime" },
];

const TRUST = [
  { icon: ShieldCheck, title: "Premium Quality", text: "Only the finest materials, inspected by hand." },
  { icon: Hammer, title: "Truly Handmade", text: "Shaped and finished by skilled artisans." },
  { icon: Globe2, title: "Export Quality", text: "Trusted by customers around the world." },
  { icon: Truck, title: "Fast Delivery", text: "Carefully packed and shipped quickly." },
  { icon: Sparkles, title: "Custom Orders", text: "Free engraving and bespoke requests." },
  { icon: BadgeDollarSign, title: "Fair Pricing", text: "Luxury craftsmanship, honest prices." },
];

function Hero() {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    const id = setInterval(() => embla.scrollNext(), 5000);
    return () => { clearInterval(id); embla.off("select", onSelect); };
  }, [embla]);

  return (
    <section className="relative overflow-hidden">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {HERO_SLIDES.map((s, i) => (
            <div key={i} className="relative min-w-0 flex-[0_0_100%]">
              <div className="relative h-[78vh] min-h-[520px] w-full">
                <img src={img(s.image)} alt="Handcrafted products" className="h-full w-full object-cover" {...(i === 0 ? { fetchPriority: "high" as const } : { loading: "lazy" as const })} />
                <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/40 to-transparent" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-xl text-white"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium backdrop-blur-md">
              {HERO_SLIDES[selected].kicker}
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] text-balance sm:text-6xl">
              Handcrafted Products Made With Passion
            </h1>
            <p className="mt-5 max-w-md text-base text-white/85 sm:text-lg">
              100% Handmade • Premium Materials • Worldwide Quality. Discover heirloom pieces built to last a lifetime.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-7 shadow-glow">
                <Link to="/products">Shop Now <ArrowRight size={18} /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-white/40 bg-white/10 px-7 text-white backdrop-blur-md hover:bg-white hover:text-ink">
                <Link to="/categories">Explore Categories</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {HERO_SLIDES.map((_, i) => (
          <button key={i} aria-label={`Slide ${i + 1}`} onClick={() => embla?.scrollTo(i)} className={`h-1.5 rounded-full transition-all ${i === selected ? "w-8 bg-white" : "w-2.5 bg-white/50"}`} />
        ))}
      </div>
    </section>
  );
}

function SectionHead({ kicker, title, link, linkLabel }: { kicker: string; title: string; link?: string; linkLabel?: string }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{kicker}</span>
        <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{title}</h2>
      </div>
      {link && (
        <Link to={link} className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary">
          {linkLabel} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

function Home() {
  const { categories, hot, featured, testimonials } = Route.useLoaderData();
  const [emblaRef, embla] = useEmblaCarousel({ align: "start", loop: false });

  return (
    <>
      <Hero />

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHead kicker="Browse" title="Shop by Category" link="/categories" linkLabel="All categories" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((c: any, i: number) => (
            <motion.div key={c.slug} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: (i % 4) * 0.05 }}>
              <Link to="/products" search={{ category: c.name }} className="group relative block aspect-[4/5] overflow-hidden rounded-3xl">
                <img src={img(c.image)} alt={c.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="font-display text-xl font-semibold text-white">{c.name}</h3>
                  <span className="mt-1 inline-flex items-center gap-1 text-sm text-white/85 opacity-0 transition-opacity group-hover:opacity-100">
                    Explore <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Hot selling */}
      <section className="bg-cream py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead kicker="Trending now" title="Hot Selling Products" link="/products" linkLabel="View all" />
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {hot.map((p: any, i: number) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
          <div className="mt-10 text-center">
            <Button asChild variant="outline" size="lg" className="rounded-full px-8">
              <Link to="/products">Load More Products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured collection slider */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Curated</span>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Featured Collection</h2>
          </div>
          <div className="flex gap-2">
            <button aria-label="Previous" onClick={() => embla?.scrollPrev()} className="grid h-11 w-11 place-items-center rounded-full border border-border hover:border-primary hover:text-primary"><ChevronLeft size={18} /></button>
            <button aria-label="Next" onClick={() => embla?.scrollNext()} className="grid h-11 w-11 place-items-center rounded-full border border-border hover:border-primary hover:text-primary"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6">
            {featured.map((p: any, i: number) => (
              <div key={p.id} className="min-w-0 flex-[0_0_80%] sm:flex-[0_0_45%] lg:flex-[0_0_30%]">
                <ProductCard product={p} index={i} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Factory story banner */}
      <section className="relative overflow-hidden">
        <div className="relative h-[60vh] min-h-[440px]">
          <img src={img("factory-story")} alt="Artisans working in our workshop" loading="lazy" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-ink/60" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="max-w-xl text-white">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/90">Our Story</span>
                <h2 className="mt-3 font-display text-3xl font-semibold sm:text-5xl">Handcrafted in our workshop</h2>
                <p className="mt-4 text-white/85">
                  With years of craftsmanship and relentless attention to detail, every piece that leaves our workshop carries the mark of a human hand.
                </p>
                <Button asChild size="lg" className="mt-7 rounded-full px-7">
                  <Link to="/about">Read Our Story <ArrowRight size={18} /></Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Why choose us</span>
          <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Crafted to a higher standard</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {TRUST.map((t, i) => (
            <motion.div key={t.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: (i % 3) * 0.06 }} className="rounded-3xl border border-border bg-card p-6 hover-lift">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground"><t.icon size={22} /></div>
              <h3 className="mt-4 font-display text-lg font-semibold">{t.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-cream py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Loved worldwide</span>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">What our customers say</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.slice(0, 6).map((t: any, i: number) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: (i % 3) * 0.06 }} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
                <Quote className="text-primary" size={26} />
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">“{t.text}”</p>
                <div className="mt-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.location}</p>
                  </div>
                  <StarRating rating={t.rating} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram gallery */}
      {/* <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">@{SITE.name.toLowerCase().replace(/\s/g, "")}</span>
          <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Follow our craft</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {["cat-wooden", "cat-leather", "cat-cutlery", "cat-decor", "cat-resin", "cat-kitchen"].map((k, i) => (
            <a key={i} href={SITE.social.instagram} target="_blank" rel="noopener" className="group relative aspect-square overflow-hidden rounded-2xl">
              <img src={img(k)} alt="Instagram post" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 grid place-items-center bg-ink/0 text-white opacity-0 transition-all group-hover:bg-ink/40 group-hover:opacity-100">
                <FaInstagram size={24} />
              </div>
            </a>
          ))}
        </div>
      </section> */}
    </>
  );
}
