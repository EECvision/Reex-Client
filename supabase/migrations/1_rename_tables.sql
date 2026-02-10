-- Rename tables
ALTER TABLE api_collections RENAME TO test_collections;
ALTER TABLE api_requests RENAME TO test_collection_requests;
ALTER TABLE history_collections RENAME TO recent_collections;

-- Rename foreign key constraints (optional but good practice)
-- Note: Supabase/Postgres might automatically update the constraint name or keep the old one.
-- It's safer to check if they exist before trying to rename, or just leave them if functionality isn't affected.
-- However, for clarity, we can try to rename them if we know the standard naming convention was used.
-- Assuming standard naming:
-- api_requests_collection_id_fkey -> test_collection_requests_collection_id_fkey

ALTER TABLE test_collection_requests
RENAME CONSTRAINT api_requests_collection_id_fkey TO test_collection_requests_collection_id_fkey;

-- If there are other constraints or indexes with the old names, they should also be renamed ideally,
-- but the core requirement is the table renaming.
