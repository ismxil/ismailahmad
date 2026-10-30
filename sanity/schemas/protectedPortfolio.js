export default {
    name: 'protectedPortfolio', title: 'PDF portfolio access', type: 'document',
    fields: [{ name: 'accessCode', title: 'Access code', type: 'string',
        description: 'Six digits. Publish to change the PDF portfolio code and expire existing sessions.',
        validation: Rule => Rule.required().regex(/^\d{6}$/, { name: 'six digits' }) }],
    validation: Rule => Rule.custom(doc => doc?._id?.replace(/^drafts\./, '') === 'protected.portfolio' ? true : 'Use the private protected.portfolio document.'),
    preview: { prepare: () => ({ title: 'PDF portfolio access' }) },
};
