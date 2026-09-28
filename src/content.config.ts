import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const authors = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/authors" }),
  schema: ({image}) => z.object({
    name: z.string(),
    avatar: image().optional(),
    occupation: z.string().optional(),
    shortBio: z.string(),
    company: z.string().optional(),
    email: z.string().email(),
    twitter: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    github: z.string().url().optional(),
    layout: z.string().url().optional(),
  }),
});

const tags = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/tags" }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    // TODO: Add support for images and layout
    // image: z.string().optional(),
    // layout: z.string().optional(),
  }),
});

export const collections = { authors, tags };
