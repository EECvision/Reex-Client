
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mocks
const mocks = vi.hoisted(() => {
    const from = vi.fn();
    const select = vi.fn();
    const insert = vi.fn();
    const update = vi.fn();
    const deleteFn = vi.fn();
    const eq = vi.fn();
    const order = vi.fn();
    const single = vi.fn();

    // Make mockSupabase 'thenable' so it can be awaited at the end of a chain.
    const mockSupabase: any = {
        from,
        select,
        insert,
        update,
        delete: deleteFn,
        eq,
        order,
        single,
        // Default promise behavior: resolves to success
        then: (resolve: any) => resolve({ data: [], error: null })
    };

    // Setup chainable returns (builder pattern)
    from.mockReturnValue(mockSupabase);
    select.mockReturnValue(mockSupabase);
    insert.mockReturnValue(mockSupabase);
    update.mockReturnValue(mockSupabase);
    deleteFn.mockReturnValue(mockSupabase);
    eq.mockReturnValue(mockSupabase);
    order.mockReturnValue(mockSupabase);
    single.mockReturnValue(mockSupabase);

    return {
        from, select, insert, update, deleteFn, eq, order, single, mockSupabase
    };
});

// Mock Dependencies
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => mocks.mockSupabase
}));

vi.mock('@/auth', () => ({
    auth: vi.fn().mockResolvedValue({ user: { id: 'test-user-id' } })
}));

import {
    getStandaloneCollections,
    createStandaloneCollection,
    deleteStandaloneCollection
} from './standaloneActions';

describe('Standalone Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset default promise resolution if needed, but the object is constant.
        // We will override resolution in tests by overwriting the `then` method 
        // or effectively stubbing the return if needed. 
        // Actually, since `then` is a property, we can just assign it.
        mocks.mockSupabase.then = (resolve: any) => resolve({ data: [], error: null });
    });

    it('getStandaloneCollections should fetch collections for user', async () => {
        const mockData = [{ id: '1', name: 'Test', content: { id: '1', name: 'Test', modules: [] } }];

        // Mock the resolved value of the chain.
        // getStandaloneCollections awaits: from().select().eq().order()
        mocks.mockSupabase.then = (resolve: any) => resolve({ data: mockData, error: null });

        const result = await getStandaloneCollections();

        expect(mocks.from).toHaveBeenCalledWith('standalone_collections');
        expect(mocks.select).toHaveBeenCalledWith('*');
        expect(mocks.eq).toHaveBeenCalledWith('user_id', 'test-user-id');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
        expect(mocks.order).toHaveBeenCalled();
    });

    it('createStandaloneCollection should insert collection', async () => {
        const newCol = { id: 'new-1', name: 'New Col', modules: [] };
        // Chain: from().insert().select().single()
        // Resolution should simulate the result of single()
        mocks.mockSupabase.then = (resolve: any) => resolve({ data: { id: 'new-1' }, error: null });

        const result = await createStandaloneCollection(newCol);

        expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
            user_id: 'test-user-id',
            name: 'New Col'
        }));
        expect(result.success).toBe(true);
    });

    it('deleteStandaloneCollection should delete collection', async () => {
        // Chain: from().delete().eq().eq()
        // Resolution should success
        mocks.mockSupabase.then = (resolve: any) => resolve({ error: null });

        const result = await deleteStandaloneCollection('1');

        expect(mocks.deleteFn).toHaveBeenCalled();
        expect(result.success).toBe(true);
    });
});
