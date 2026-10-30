import caseStudy from './caseStudy';

export default {
    ...caseStudy,
    name: 'protectedCaseStudy',
    title: 'Protected case study',
    groups: [{ name: 'access', title: 'Access', default: true }, ...caseStudy.groups.map(group => ({ ...group, default: false }))],
    fields: [
        { name: 'sourceRevision', type: 'string', hidden: true, readOnly: true },
        { name: 'previewEndKey', type: 'string', hidden: true, readOnly: true },
        {
            name: 'accessCode', title: 'Access code', type: 'string', group: 'access',
            description: 'Six digits. Publish to update the code on the website. Changing it also locks previously unlocked sessions.',
            validation: Rule => Rule.required().regex(/^\d{6}$/, { name: 'six digits' }),
        },
        ...caseStudy.fields.filter(field => field.name !== 'requiresAccessCode'),
    ],
    validation: Rule => Rule.custom(document =>
        document?._id?.replace(/^drafts\./, '').startsWith('protected.')
            ? true : 'Protected cases must use a private protected.* document ID.'),
};
