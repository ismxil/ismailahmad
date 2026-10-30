export default {
    name: 'siteSettings', title: 'Availability', type: 'document',
    fields: [{ name: 'availability', title: 'Availability', type: 'string', initialValue: 'available',
        options: { list: [{ title: 'Available', value: 'available' }, { title: 'Limited', value: 'limited' }, { title: 'Busy', value: 'busy' }], layout: 'radio' },
        description: 'Available for work, limited space for new projects, or fully booked. Publish to update the website.',
        validation: Rule => Rule.required() }],
    preview: { select: { title: 'availability' }, prepare: ({ title }) => ({ title: 'Availability', subtitle: title }) },
};
