import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { img } from "@/lib/images";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/stories/$slug")({
  loader: async ({ params }) => {
    const story = await api.getStory(params.slug);
    if (!story) throw notFound();
    return { story };
  },
  head: ({ loaderData }) => {
    const s = loaderData?.story;
    if (!s) return { meta: [{ title: "Story" }] };
    return {
      meta: [
        { title: `${s.title} — Our Stories` },
        { name: "description", content: s.description },
        { property: "og:title", content: s.title },
        { property: "og:description", content: s.description },
        { property: "og:type", content: "article" },
        { property: "og:image", content: img(s.thumbnail) },
      ],
      links: [{ rel: "canonical", href: `/stories/${s.slug}` }],
    };
  },
  notFoundComponent: () => (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold">Story not found</h1>
        <Button asChild className="mt-4 rounded-xl"><Link to="/stories">All Stories</Link></Button>
      </div>
    </div>
  ),
  component: StoryDetail,
});

function StoryDetail() {
  const { story } = Route.useLoaderData();
  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link><ChevronRight size={14} />
        <Link to="/stories" className="hover:text-primary">Stories</Link><ChevronRight size={14} />
        <span className="truncate text-foreground">{story.title}</span>
      </nav>

      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{story.category}</span>
      <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{story.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{new Date(story.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} • {story.author}</p>

      <div className="mt-8 overflow-hidden rounded-3xl">
        <img src={img(story?.thumbnail)} alt={story.title} className="aspect-[16/9] w-full object-cover" />
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-lg leading-relaxed text-foreground/90">{story.body}</p>

      {story?.sections && story.sections.length > 0 ? (
        <div className="mx-auto mt-14 max-w-3xl space-y-16">
          {story.sections.map((sec: any, i: number) => (
            <section key={i} className={`grid items-center gap-8 sm:grid-cols-2 ${i % 2 === 1 ? "sm:[&>figure]:order-2" : ""}`}>
              <figure className="overflow-hidden rounded-3xl">
                <img src={img(sec.image)} alt={sec.heading} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-500 hover:scale-105" />
              </figure>
              <div>
                <h2 className="font-display text-2xl font-semibold">{sec.heading}</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{sec.text}</p>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {story?.gallery.map((g: string, i: number) => (
            <div key={i} className="overflow-hidden rounded-2xl">
              <img src={img(g)} alt={`${story.title} ${i + 1}`} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-500 hover:scale-105" />
            </div>
          ))}
        </div>
      )}

      <div className="mt-14 text-center">
        <Button asChild size="lg" className="rounded-full px-8"><Link to="/products">Shop the Collection</Link></Button>
      </div>
    </article>
  );
}
