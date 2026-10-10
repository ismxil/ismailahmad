import { createRequire } from 'node:module';
const { getCliClient } = createRequire(import.meta.url)('sanity/cli');
import { migrate } from '../../scripts/import-substack.mjs';

await migrate(getCliClient({ apiVersion: '2024-01-01' }).withConfig({ useCdn: false }));
