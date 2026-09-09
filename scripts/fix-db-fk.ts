import { Client } from 'pg';

// Using credentials found in .env.local comments
const connectionString = 'postgres://postgres:QRMr7.EJSb%2Kgg@db.kntjyauliyrhilargcpb.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString });
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected successfully.');

        // Fix SQL
        const sql = `
DO $$ 
BEGIN
  -- Try to drop the bad constraint if it exists
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'history_collections_user_id_fkey') THEN
      ALTER TABLE public.history_collections DROP CONSTRAINT history_collections_user_id_fkey;
  END IF;
  
  -- Add the correct constraint pointing to auth.users
  ALTER TABLE public.history_collections
    ADD CONSTRAINT history_collections_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
    
END $$;
    `;

        console.log('Executing Foreign Key Fix...');
        await client.query(sql);
        console.log('Fix applied successfully! The table now references auth.users.');

    } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Error applying fix:', err);
        console.error('Details:', errorMessage);
    } finally {
        await client.end();
    }
}

run();
