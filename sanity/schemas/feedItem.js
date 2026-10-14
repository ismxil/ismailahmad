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
      description: 'Items without an image are hidden from the Archive.',
    }),
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
      subtitle: 'projectType',
      media: 'cover',
    },
  },
});
