import { MetadataRoute } from 'next';
import { STUDIO_URL } from '@/config/links';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${STUDIO_URL}/sitemap.xml`,
  };
}
