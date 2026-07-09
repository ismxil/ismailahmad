/**
 * Feed card metadata — mapped to assets/feeds/covers/image_{n}.jpg
 */

const PROJECTS = [
  {
    client: 'Lemfi',
    headline:
      'Building a community that let\u2019s people bond and stay connected within the app, to build conscious money habit',
    category: 'Concepts',
    years: '(2021 - 2024)',
    description:
      'Researched target audiences and user needs. Shaped the product and brand touchpoints. Designed the website and connected digital experience',
    accent: '#393bfe',
  },
  {
    client: 'Motel One',
    headline: 'Your digital key to every Motel One in the world',
    category: 'App Design',
    years: '(2022 - 2024)',
    description:
      'Designed the guest companion app spanning booking support, digital check-in, and mobile key access across 92 hotels.',
    accent: '#393bfe',
  },
  {
    client: 'Gomoney',
    headline: 'Reducing registration drop-off with a simpler digital bank onboarding',
    category: 'App Design',
    years: '(2020 - 2022)',
    description:
      'Improved the onboarding process, introduced new feature directions, and refreshed the brand expression inside the product.',
    accent: '#393bfe',
  },
  {
    client: 'Cadana',
    headline: 'A global payments identity built for talent marketplaces and HR teams',
    category: 'Branding',
    years: '(2023 - 2024)',
    description:
      'Designed the brand identity and created a visual system for product and marketing across 100+ countries.',
    accent: '#ff4300',
  },
  {
    client: 'Mezovest',
    headline: 'Small-business loan tools that connect vendors, customers, and investors',
    category: 'Product Design',
    years: '(2024 - 2026)',
    description:
      'Mapped key business workflows and designed vendor, customer, and dashboard experiences for lending operations.',
    accent: '#393bfe',
  },
  {
    client: 'Commerz Bank',
    headline: 'Mobile banking flows shaped by research, audit, and redesign',
    category: 'App Design',
    years: '(2023 - 2024)',
    description:
      'Audited the existing product experience, researched competitor patterns, and designed app improvements for banking tasks.',
    accent: '#393bfe',
  },
  {
    client: 'Etihad Credit Bureau',
    headline: 'A unified digital platform for national credit data services',
    category: 'Web Design',
    years: '(2021 - 2023)',
    description:
      'Redesigned the public website and unified interaction patterns across portal and app touchpoints.',
    accent: '#393bfe',
  },
  {
    client: 'Brass',
    headline: 'Business banking tools designed for African entrepreneurs',
    category: 'Product Design',
    years: '(2020 - 2021)',
    description:
      'Shaped product flows for accounts, payments, and team management across web and mobile banking.',
    accent: '#393bfe',
  },
  {
    client: 'Salarify',
    headline: 'Payroll and benefits experiences for growing teams',
    category: 'Product Design',
    years: '(2021 - 2022)',
    description:
      'Designed payroll workflows and employee-facing touchpoints for salary access and benefits management.',
    accent: '#393bfe',
  },
  {
    client: 'Spatch',
    headline: 'Delivery logistics interfaces for riders and operations teams',
    category: 'App Design',
    years: '(2022 - 2023)',
    description:
      'Mapped dispatch workflows and designed rider, merchant, and operations dashboards for last-mile delivery.',
    accent: '#66cb29',
  },
];

export const FEED_ITEMS = Array.from({ length: 30 }, (_, index) => {
  const project = PROJECTS[index % PROJECTS.length];
  return {
    id: index,
    cover: `assets/feeds/covers/image_${index}.jpg`,
    ...project,
  };
});

export function getFeedItem(index) {
  return FEED_ITEMS[index % FEED_ITEMS.length] || FEED_ITEMS[0];
}
