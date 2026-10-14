import { defineField, defineType } from 'sanity';

const PROJECT_TYPES = [
  'Web App',
  'Mobile App',
  'Website',
  'Branding',
  'Product Design',
  'Concepts',
  'App Design',
  'Web Design',
  'Card',
  'Research',
];

export default defineType({
  name: 'feedItem',
  title: 'Archive item',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'projectType',
      title: 'Category',
      type: 'string',
      options: { list: PROJECT_TYPES },
    }),
    defineField({
      name: 'cover',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Shown in the Archive. With a video, this is the still shown while it loads.',
    }),
    defineField({
      name: 'video',
      title: 'Video',
      type: 'file',
      options: { accept: 'video/mp4,video/webm,video/quicktime' },
      description: 'Optional. Plays muted on a loop in place of the image. Keep it short and under ~10 MB.',
    }),
    // Kept from the original import, hidden: order holds those items in
    // their curated sequence, and the legacy feed matches on slug.
    defineField({ name: 'order', type: 'number', hidden: true }),
    defineField({ name: 'slug', type: 'slug', hidden: true }),
  ],
  validation: (Rule) =>
    Rule.custom((doc) => (doc?.cover?.asset || doc?.video?.asset ? true : 'Add an image or a video.')),
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
      subtitle: 'projectType',
      media: 'cover',
    },
  },
});
