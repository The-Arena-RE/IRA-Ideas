import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts, postUrl } from '../lib/blog';

// RSS feed (WordPress served it at /feed/, which redirects here — see public/_redirects).
export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: 'IRA Ideas – Tim Berry',
    description: 'Self-directed IRA and 401(k) articles by attorney Tim Berry.',
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: postUrl(p),
      categories: p.data.tags.map((t) => t.name),
    })),
    customData: '<language>en-us</language>',
  });
}
