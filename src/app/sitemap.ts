import { MetadataRoute } from 'next';
import { STUDIO_URL } from '@/config/links';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: STUDIO_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
