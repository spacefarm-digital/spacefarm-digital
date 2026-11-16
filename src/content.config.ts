import { defineCollection, reference } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';
import { parse } from 'yaml';

export const projectColors = [
  'spacefarm',
  'proctest',
  'consentio',
  'dribbble',
  'medium',
  'kutia',
  'timeheroes',
  'bbteam',
  'react',
  'netlify',
  'improved',
  'hckrs',
  'limbix',
] as const;

export type ProjectColor = (typeof projectColors)[number];

// A YAML list, with each entry's position kept as `order` so pages can show it in file order.
const orderedYaml = (path: string) =>
  file(path, {
    parser: (text) =>
      (parse(text) as Record<string, unknown>[]).map((entry, order) => ({ ...entry, order })),
  });
const ordered = { order: z.number() };

const projects = defineCollection({
  loader: orderedYaml('src/content/projects.yml'),
  schema: z.object({
    ...ordered,
    period: reference('timeline'),
    title: z.string(),
    color: z.enum(projectColors),
    link: z.url().optional(),
    nda: z.boolean().default(false),
    description: z.string().optional(),
  }),
});

const timeline = defineCollection({
  loader: orderedYaml('src/content/timeline.yml'),
  schema: z.object({
    ...ordered,
    when: z.string(),
    title: z.string(),
  }),
});

const services = defineCollection({
  loader: orderedYaml('src/content/services.yml'),
  schema: z.object({
    ...ordered,
    title: z.string(),
    description: z.string(),
  }),
});

const team = defineCollection({
  loader: orderedYaml('src/content/team.yml'),
  schema: z.object({
    ...ordered,
    name: z.string(),
    title: z.string(),
    description: z.string(),
  }),
});

export const collections = { projects, timeline, services, team };
