import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Blog posts imported from WordPress (src/content/blog/*.md). The file name is the URL slug:
// src/content/blog/what-is-an-ira.md → https://iraideas.com/what-is-an-ira/
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      image: image().optional(),
      imageAlt: z.string().optional(),
      categories: z.array(z.string()).default([]),
      tags: z.array(z.object({ slug: z.string(), name: z.string() })).default([]),
      draft: z.boolean().default(false),
      wpId: z.number().optional(),
    }),
});

export const collections = { blog };
