import { MetadataRoute } from 'next';
import { INDEXING_ENABLED, PUBLIC_PATHS, siteUrl } from '@/config/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  // Only list canonical, indexable pages. Omit dates until an actual content
  // modification date is available; a build time is not a content update.
  return INDEXING_ENABLED ? PUBLIC_PATHS.map((path) => ({ url: siteUrl(path) })) : [];
}
