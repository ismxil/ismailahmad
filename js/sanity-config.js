/**
 * Sanity project settings for the feed CMS.
 *
 * 1. Create a project at https://www.sanity.io/manage
 * 2. Copy your project ID below
 * 3. Run `npm install` and `npm run dev` inside /sanity to open Studio
 */
export const sanityConfig = {
  projectId: 'x7x0om5p',
  dataset: 'production',
  apiVersion: '2024-01-01',
};

export function isSanityConfigured() {
  return Boolean(sanityConfig.projectId && sanityConfig.projectId !== 'your-project-id');
}
