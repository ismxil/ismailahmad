export default {
    name: 'post', title: 'Blog post', type: 'document',
    fields: [
        { name: 'title', type: 'string', validation: Rule => Rule.required() },
        { name: 'slug', type: 'slug', options: { source: 'title', maxLength: 120 }, validation: Rule => Rule.required() },
        { name: 'excerpt', type: 'text', rows: 3 },
        { name: 'publishedAt', title: 'Publication date', type: 'datetime', validation: Rule => Rule.required() },
        { name: 'author', type: 'string', initialValue: 'Ismail Ahmad' },
        { name: 'coverImage', type: 'image', options: { hotspot: true }, fields: [
            { name: 'alt', type: 'string', title: 'Alternative text' },
        ] },
        { name: 'body', type: 'array', title: 'Article', validation: Rule => Rule.required(), of: [
            { type: 'block', styles: [
                { title: 'Normal', value: 'normal' }, { title: 'Heading 2', value: 'h2' },
                { title: 'Heading 3', value: 'h3' }, { title: 'Quote', value: 'blockquote' },
            ], marks: { decorators: [
                { title: 'Bold', value: 'strong' }, { title: 'Italic', value: 'em' },
                { title: 'Underline', value: 'underline' }, { title: 'Code', value: 'code' },
            ], annotations: [{ name: 'link', type: 'object', fields: [
                { name: 'href', type: 'url', validation: Rule => Rule.uri({ scheme: ['https', 'http', 'mailto'] }) },
            ] }] } },
            { type: 'image', options: { hotspot: true }, fields: [
                { name: 'alt', type: 'string', title: 'Alternative text' },
                { name: 'caption', type: 'string' },
                { name: 'sourceUrl', type: 'url', hidden: true, readOnly: true },
            ] },
            { name: 'divider', type: 'object', fields: [{ name: 'label', type: 'string', hidden: true, initialValue: 'Divider' }], preview: { prepare: () => ({ title: 'Divider' }) } },
        ] },
        { name: 'sourceUrl', title: 'Original Substack article', type: 'url', readOnly: true },
    ],
    orderings: [{ title: 'Newest first', name: 'dateDesc', by: [{ field: 'publishedAt', direction: 'desc' }] }],
    preview: { select: { title: 'title', subtitle: 'publishedAt', media: 'coverImage' } },
};
