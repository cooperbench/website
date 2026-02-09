import { defineCollection, z } from "astro:content";

const blogCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.string(),
    authors: z.array(
      z.object({
        name: z.string(),
        image: z.string(),
      }),
    ),
    showPaperLinks: z.boolean().optional().default(true),
  }),
});

export const collections = {
  blog: blogCollection,
};
