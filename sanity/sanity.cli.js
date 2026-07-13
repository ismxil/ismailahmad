import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'x7x0om5p',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
});
