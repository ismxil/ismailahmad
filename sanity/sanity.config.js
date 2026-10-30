import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';

export default defineConfig({
  name: 'default',
  title: 'Ismail Ahmad — Content',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'x7x0om5p',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [structureTool({ structure: S => S.list().title('Content').items([
    S.listItem().title('Availability').child(S.document().schemaType('siteSettings').documentId('site-settings')),
    S.listItem().title('PDF portfolio access').child(S.document().schemaType('protectedPortfolio').documentId('protected.portfolio')),
    ...S.documentTypeListItems().filter(item => !['siteSettings', 'protectedPortfolio'].includes(item.getId())),
  ]) }), visionTool()],
  schema: {
    types: schemaTypes,
  },
});
