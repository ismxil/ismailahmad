import { defineField, defineType } from 'sanity';

// What was designed: the output, not the discipline.
const CATEGORIES = [
  'Mobile App',
  'Web App',
  'Website',
  'Dashboard',
  'Identity',
  'Digital Product',
  'Interaction',
  'Other',
];

// The intent or maturity of the work.
const TYPES = ['Concept', 'Exploration', 'Redesign', 'Prototype', 'Shipped'];

const hasMedia = (doc) => Boolean(doc?.cover?.asset || doc?.video?.asset);

export default defineType({
  name: 'feedItem',
  title: 'Archive item',
  type: 'document',
  fieldsets: [{ name: 'media', title: 'Media', description: 'An image, a video, or both.' }],
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'cover',
      title: 'Image',
      type: 'image',
      fieldset: 'media',
      options: { hotspot: true },
      description: 'With a video, this is the still shown while it loads.',
      validation: (Rule) =>
        Rule.custom((_, { document }) => (hasMedia(document) ? true : 'Add an image or a video.')),
    }),
    defineField({
      name: 'video',
      title: 'Video',
      type: 'file',
      fieldset: 'media',
      options: { accept: 'video/mp4,video/webm,video/quicktime' },
      description: 'Optional. Plays muted on a loop in place of the image. Keep it short and under ~10 MB.',
    }),
    defineField({
      name: 'workType',
      title: 'Type',
      type: 'string',
      options: { list: TYPES, layout: 'radio', direction: 'horizontal' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'projectType',
      title: 'Category',
      type: 'string',
      options: { list: CATEGORIES },
      description: 'Optional. What was designed.',
    }),
    // Kept from the original import, hidden: order holds those items in
    // their curated sequence, and the legacy feed matches on slug.
    defineField({ name: 'order', type: 'number', hidden: true }),
    defineField({ name: 'slug', type: 'slug', hidden: true }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'createdDesc',
      by: [{ field: '_createdAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'name',
      category: 'projectType',
      type: 'workType',
      media: 'cover',
    },
    prepare: ({ title, category, type, media }) => ({
      title,
      subtitle: [category, type].filter(Boolean).join(' / '),
      media,
    }),
  },
});
