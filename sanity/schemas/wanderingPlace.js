import { defineArrayMember, defineField, defineType } from 'sanity';

export default defineType({
  name: 'wanderingPlace',
  title: 'Wandering place',
  type: 'document',
  fields: [
    defineField({
      name: 'place',
      title: 'Place',
      type: 'string',
      description: 'Shown on the wall after the last photo, and as the title when opened, e.g. Malta',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'photos',
      title: 'Photos',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Description',
              type: 'string',
              description: 'What is in the photo, for screen readers.',
            }),
          ],
        }),
      ],
      options: { layout: 'grid' },
      description: 'Drag to reorder. Every photo is cropped to 3:4, so portrait shots fit best; set the hotspot to choose what stays in frame.',
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'order',
      title: 'Sort order',
      type: 'number',
      description: 'Lower numbers come first on the wall.',
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
    select: { title: 'place', media: 'photos.0', photos: 'photos' },
    prepare: ({ title, media, photos }) => ({
      title,
      subtitle: `${photos?.length || 0} photos`,
      media,
    }),
  },
});
