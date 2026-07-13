import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'feedStat',
  title: 'Stat',
  type: 'object',
  fields: [
    defineField({
      name: 'value',
      title: 'Value',
      type: 'string',
      description: 'e.g. 2,000+',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'e.g. Active users',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { value: 'value', label: 'label' },
    prepare({ value, label }) {
      return { title: [value, label].filter(Boolean).join(' ') };
    },
  },
});
