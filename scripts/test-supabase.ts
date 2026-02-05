import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("❌ Missing env vars:", { url: !!url, key: !!key });
    process.exit(1);
}

const supabase = createClient(url, key);

async function testConnection() {
    console.log("Testing Supabase connection...");
    console.log("URL:", url);
    // Don't log full key for security
    console.log("Key length:", key?.length);

    try {
        // Try to select from users table
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

        if (error) {
            console.error("❌ Supabase Error:", error);
            if (error.code === '42P01') {
                console.error("   -> Table 'users' does not exist. Please run the SQL script provided.");
            }
        } else {
            console.log("✅ Connection successful!");
            console.log("✅ 'users' table exists.");

            // Try to insert a dummy user to verify write permissions
            const testEmail = `test-${Date.now()}@example.com`;
            const { data: insertData, error: insertError } = await supabase
                .from('users')
                .insert({ email: testEmail, name: 'Test User', image: 'https://example.com/avatar.png' })
                .select()
                .single();

            if (insertError) {
                console.error("❌ Insert 'users' Failed:", insertError);
            } else {
                console.log("✅ Insert 'users' successful:", insertData);

                // Try inserting into accounts to check schema match
                const { error: accountError } = await supabase.from('accounts').insert({
                    userId: insertData.id,
                    type: "oauth",
                    provider: "google",
                    providerAccountId: `test-acc-${Date.now()}`,
                    access_token: "test-token",
                    token_type: "Bearer",
                    scope: "email profile"
                });

                if (accountError) {
                    console.error("❌ Insert 'accounts' Failed:", accountError);
                } else {
                    console.log("✅ Insert 'accounts' successful");
                }

                // Cleanup
                await supabase.from('users').delete().eq('email', testEmail);
                console.log("✅ Cleanup successful");
            }
        }
    } catch (e) {
        console.error("❌ Unexpected error:", e);
    }
}

testConnection();
