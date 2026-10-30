import { createRequire } from 'node:module';
const { getCliClient } = createRequire(import.meta.url)('sanity/cli');
const client = getCliClient({ apiVersion: '2024-01-01' }).withConfig({ useCdn: false, perspective: 'raw' });
const existing = await client.getDocument('protected.etihad');
if (!/^\d{6}$/.test(existing?.accessCode || '')) throw new Error('Existing code unavailable');
await client.createIfNotExists({ _id: 'site-settings', _type: 'siteSettings', availability: 'available' });
await client.createIfNotExists({ _id: 'protected.portfolio', _type: 'protectedPortfolio', accessCode: existing.accessCode });
console.log('Availability and private PDF access settings initialized.');
