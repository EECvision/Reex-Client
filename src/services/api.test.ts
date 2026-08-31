
import { describe, it, expect } from 'vitest';
import { api } from './api';

describe('API Service Facade', () => {
    it('should export CloudService methods', () => {
        expect(api.generateTemplate).toBeDefined();
        expect(api.analyzeCollection).toBeDefined();
    });

    it('should export BridgeService methods', () => {
        expect(api.readFile).toBeDefined();
        expect(api.fetchBridgeStatus).toBeDefined();
    });

    it('should have getBridgeUrl helper', () => {
        expect(api.getBridgeUrl).toBeDefined();
    });
});
