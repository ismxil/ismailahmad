const string = (name, title = name) => ({ name, title, type: 'string' });
const text = (name, title = name) => ({ name, title, type: 'text', rows: 5 });
const artwork = (name, title) => ({ name, title, type: 'image', options: { hotspot: true } });
const list = (name, title) => ({ name, title, type: 'array', of: [{ type: 'string' }] });
const only = (...types) => ({ parent }) => !types.includes(parent?.type);
const action = { name: 'caseAction', type: 'object', fields: [string('label', 'Link text'), { name: 'href', title: 'URL', type: 'url', validation: Rule => Rule.uri({ scheme: ['https', 'http'] }) }] };

export default {
    name: 'caseStudy', title: 'Case study', type: 'document',
    groups: [{ name: 'overview', title: 'Overview', default: true }, { name: 'details', title: 'Details' }, { name: 'content', title: 'Content' }],
    fields: [
        { ...string('name', 'Project name'), group: 'overview', validation: Rule => Rule.required() },
        { name: 'slug', title: 'URL slug', type: 'slug', group: 'overview', options: { source: 'name', maxLength: 120 }, description: 'Keep this unchanged for existing projects so their /work/ links keep working.', validation: Rule => Rule.required() },
        { ...text('headline', 'Headline'), group: 'overview', validation: Rule => Rule.required() },
        { name: 'lede', title: 'Introduction paragraphs', type: 'array', of: [{ type: 'text' }], group: 'overview' },
        { ...artwork('cover', 'Project card cover'), group: 'overview', validation: Rule => Rule.required() },
        { ...artwork('hero', 'Hero image'), group: 'overview', validation: Rule => Rule.required() },
        { name: 'order', title: 'Sort order', type: 'number', group: 'overview', description: 'Lower numbers appear first on Home, Work, and next-project links.' },
        ...[string('role', 'Role'), string('years', 'Years'), string('type', 'Project type'), list('scope', 'Scope'), list('industry', 'Industry'), { name: 'url', title: 'Project website', type: 'url' }].map(field => ({ ...field, group: 'details' })),
        {
            name: 'blocks', title: 'Case study sections', type: 'array', group: 'content',
            description: 'Drag sections to reorder them. Paragraphs within text fields are separated by a blank line.',
            of: [{
                name: 'caseContentBlock', type: 'object', title: 'Section',
                fields: [
                    { name: 'type', title: 'Section type', type: 'string', initialValue: 'section', validation: Rule => Rule.required(), options: { list: [
                        { title: 'Text section', value: 'section' }, { title: 'Image', value: 'image' },
                        { title: 'Two images', value: 'pair' }, { title: 'Customer quotes', value: 'quotes' },
                        { title: 'Results / metrics', value: 'results' }, { title: 'Callout', value: 'callout' },
                        { title: 'Image with text', value: 'overlay' },
                    ] } },
                    { ...string('label', 'Section heading'), hidden: only('section', 'results', 'callout', 'overlay') },
                    { ...text('body', 'Body'), hidden: only('section', 'callout', 'overlay') },
                    { ...artwork('image', 'Image'), hidden: only('image', 'overlay') },
                    { ...string('alt', 'Image description'), hidden: only('image', 'overlay') },
                    { ...text('note', 'Note'), hidden: only('overlay') },
                    { name: 'images', title: 'Images', type: 'array', hidden: only('pair'), of: [{ type: 'image', options: { hotspot: true }, fields: [string('alt', 'Image description')] }], validation: Rule => Rule.max(2) },
                    { name: 'items', title: 'Quotes', type: 'array', hidden: only('quotes'), of: [{ name: 'caseQuote', type: 'object', fields: [text('quote', 'Quote'), string('name', 'Name'), string('role', 'Role'), artwork('avatar', 'Portrait')], preview: { select: { title: 'name', subtitle: 'quote', media: 'avatar' } } }] },
                    { ...text('summary', 'Results summary'), hidden: only('results') },
                    { name: 'metrics', title: 'Metrics', type: 'array', hidden: only('results'), of: [{ name: 'caseMetric', type: 'object', fields: [string('value', 'Value'), string('title', 'Title'), text('text', 'Description'), artwork('icon', 'Icon'), string('accent', 'Accent colour')], preview: { select: { title: 'value', subtitle: 'text' } } }] },
                    { name: 'actions', title: 'Links', type: 'array', hidden: only('section', 'overlay'), of: [action] },
                ],
                preview: { select: { label: 'label', type: 'type', body: 'body', media: 'image' }, prepare: ({ label, type, body, media }) => ({ title: label || type || 'Section', subtitle: body || type, media }) },
            }],
        },
    ],
    orderings: [{ title: 'Sort order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
    preview: { select: { title: 'name', subtitle: 'headline', media: 'cover' } },
};
