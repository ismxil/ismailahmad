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
        { name: 'rotatingCovers', title: 'Rotating cover images', type: 'array', group: 'overview', of: [{ type: 'image' }], description: 'Choose images for the homepage card. Drag to change the rotation order. Leave empty to use Project card cover; a single image stays still.' },
        { name: 'coverVideo', title: 'Cover video', type: 'file', group: 'overview', options: { accept: 'video/mp4,video/webm,video/quicktime' }, description: 'Optional. Plays muted on a loop on the project card and replaces the rotating images. Project card cover stays as the still shown while it loads. Keep it short and under ~10 MB.' },
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
                        { title: 'Two images', value: 'pair' }, { title: 'Video', value: 'video' }, { title: 'Customer quotes', value: 'quotes' },
                        { title: 'Results / metrics', value: 'results' }, { title: 'Callout', value: 'callout' },
                        { title: 'Image with text', value: 'overlay' },
                    ] } },
                    { ...string('label', 'Section heading'), hidden: only('section', 'results', 'callout', 'overlay') },
                    { ...text('body', 'Body'), hidden: only('section', 'callout', 'overlay') },
                    { name: 'video', title: 'Video', type: 'file', hidden: only('video'), options: { accept: 'video/mp4,video/webm,video/quicktime' }, description: 'Plays muted on a loop while on screen. Keep it short and under ~20 MB.' },
                    { ...artwork('image', 'Image'), hidden: only('image', 'overlay', 'video'), description: 'For a video section: optional still shown while the video loads.' },
                    { ...string('alt', 'Image description'), hidden: only('image', 'overlay', 'video') },
                    { ...text('note', 'Note'), hidden: only('overlay') },
                    { name: 'images', title: 'Images', type: 'array', hidden: only('pair'), description: 'Two items, side by side. Each can be an image or a video.', of: [
                        { type: 'image', title: 'Image', options: { hotspot: true }, fields: [string('alt', 'Image description')] },
                        { name: 'casePairVideo', type: 'object', title: 'Video', fields: [
                            { name: 'video', title: 'Video', type: 'file', options: { accept: 'video/mp4,video/webm,video/quicktime' }, description: 'Plays muted on a loop while on screen.', validation: Rule => Rule.required() },
                            { ...artwork('poster', 'Image'), description: 'Optional still shown while the video loads.' },
                            string('alt', 'Video description'),
                        ], preview: { select: { title: 'alt', media: 'poster' }, prepare: ({ title, media }) => ({ title: title || 'Video', subtitle: 'Video', media }) } },
                    ], validation: Rule => Rule.max(2) },
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
