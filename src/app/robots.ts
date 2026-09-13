import { MetadataRoute } from 'next';
import { INDEXING_ENABLED, siteUrl } from '@/config/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    // Keep noindex pages crawlable so their meta robots rules can be read.
    ...(INDEXING_ENABLED ? { sitemap: siteUrl('/sitemap.xml') } : {}),
  };
}
