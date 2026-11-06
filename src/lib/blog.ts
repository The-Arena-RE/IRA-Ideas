import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

export const POSTS_PER_PAGE = 12;

export const CATEGORY_NAMES: Record<string, string> = {
  professional: 'Professional',
  retail: 'Retail',
};

/** Published posts, newest first. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export const postUrl = (post: Post) => `/${post.id}/`;

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

/** Rough reading time from the raw Markdown (collapsed "full text" sections are not counted). */
export function readingTime(post: Post): number {
  const words = (post.body ?? '')
    .replace(/<details[\s\S]*?<\/details>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

/** All tags used by posts, with their posts. */
export function tagIndex(posts: Post[]) {
  const map = new Map<string, { slug: string; name: string; posts: Post[] }>();
  for (const p of posts)
    for (const t of p.data.tags) {
      if (!map.has(t.slug)) map.set(t.slug, { ...t, posts: [] });
      map.get(t.slug)!.posts.push(p);
    }
  return map;
}

/** Related posts: most shared tags first, then most recent. */
export function relatedPosts(post: Post, posts: Post[], count = 3): Post[] {
  const mine = new Set(post.data.tags.map((t) => t.slug));
  return posts
    .filter((p) => p.id !== post.id)
    .map((p) => ({ p, score: p.data.tags.filter((t) => mine.has(t.slug)).length }))
    .sort((a, b) => b.score - a.score || b.p.data.pubDate.valueOf() - a.p.data.pubDate.valueOf())
    .slice(0, count)
    .map((x) => x.p);
}
