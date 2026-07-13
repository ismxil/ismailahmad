import { defineArrayMember, defineField, defineType } from 'sanity';

const PROJECT_TYPES = [
  'Web App',
  'Mobile App',
  'Website',
  'Branding',
  'Product Design',
  'Concepts',
  'App Design',
];

export default defineType({
  name: 'feedItem',
  title: 'Feed Item',
  type: 'document',
  groups: [
    { name: 'header', title: 'Header', default: true },
    { name: 'preview', title: 'Preview' },
    { name: 'stats', title: 'Stats' },
    { name: 'problem', title: 'The Problem' },
    { name: 'market', title: 'The Market' },
    { name: 'cta', title: 'CTA' },
    { name: 'meta', title: 'Publishing' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'header',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'meta',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      group: 'header',
      options: { hotspot: true },
      description: 'Shown in the modal header. Falls back to accent color block if empty.',
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      group: 'header',
      description: 'Start year, e.g. 2021',
    }),
    defineField({
      name: 'yearEnd',
      title: 'End year',
      type: 'number',
      group: 'header',
      description: 'Optional end year for a range, e.g. 2024',
    }),
    defineField({
      name: 'projectType',
      title: 'Type',
      type: 'string',
      group: 'header',
      options: { list: PROJECT_TYPES },
      description: 'e.g. Web App, Mobile App, Branding',
    }),
    defineField({
      name: 'liveUrl',
      title: 'Live URL',
      type: 'url',
      group: 'header',
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline / description',
      type: 'text',
      rows: 3,
      group: 'header',
    }),
    defineField({
      name: 'accent',
      title: 'Accent color',
      type: 'string',
      group: 'header',
      description: 'Hex fallback when no logo is set, e.g. #393bfe',
      initialValue: '#393bfe',
    }),

    defineField({
      name: 'cover',
      title: 'Grid cover',
      type: 'image',
      group: 'preview',
      options: { hotspot: true },
      description: 'Thumbnail in the feed grid. Falls back to first preview image.',
    }),
    defineField({
      name: 'previewMedia',
      title: 'Preview screenshots',
      type: 'array',
      group: 'preview',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
        }),
      ],
      description: 'Screenshots or media for the modal. First image is the hero if no dedicated cover.',
    }),

    defineField({
      name: 'stats',
      title: 'Stats',
      type: 'array',
      group: 'stats',
      of: [defineArrayMember({ type: 'feedStat' })],
      description: 'Pill badges, e.g. value "2,000+" + label "Active users"',
    }),

    defineField({
      name: 'problemBody',
      title: 'Body text',
      type: 'text',
      rows: 10,
      group: 'problem',
      description: 'Supports Markdown (paragraphs, **bold**, lists).',
    }),

    defineField({
      name: 'marketBigStat',
      title: 'Big stat',
      type: 'string',
      group: 'market',
      description: 'e.g. $129B',
    }),
    defineField({
      name: 'marketDescription',
      title: 'Description',
      type: 'text',
      rows: 4,
      group: 'market',
    }),
    defineField({
      name: 'marketSource',
      title: 'Source citation',
      type: 'string',
      group: 'market',
      description: 'e.g. Source: Industry report 2024',
    }),

    defineField({
      name: 'ctaLabel',
      title: 'Button label',
      type: 'string',
      group: 'cta',
      initialValue: 'View project',
    }),
    defineField({
      name: 'ctaUrl',
      title: 'Button URL',
      type: 'url',
      group: 'cta',
      description: 'Falls back to Live URL if empty.',
    }),

    defineField({
      name: 'order',
      title: 'Sort order',
      type: 'number',
      group: 'meta',
      description: 'Lower numbers appear first in the feed.',
    }),
  ],
  orderings: [
    {
      title: 'Sort order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'projectType',
      media: 'cover',
    },
  },
});
