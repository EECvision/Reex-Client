import { describe, it, expect } from 'vitest';
import { SAMPLE_COLLECTION_URL } from './collection';
import { SAMPLE_COLLECTION_URL as EXPORTED_SAMPLE_URL } from './index';
import { SAMPLE_COLLECTION_URL as CONFIG_SAMPLE_URL } from '@/config/constants';

describe('Collection Constants', () => {
    it('should define and export SAMPLE_COLLECTION_URL', () => {
        expect(SAMPLE_COLLECTION_URL).toBe('http://84.8.135.188/api-docs-json');
        expect(EXPORTED_SAMPLE_URL).toBe('http://84.8.135.188/api-docs-json');
        expect(CONFIG_SAMPLE_URL).toBe('http://84.8.135.188/api-docs-json');
    });
});
