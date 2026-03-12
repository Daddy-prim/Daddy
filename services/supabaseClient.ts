// This file acts as a router between the mock backend and the real Supabase backend.
// By default, it uses the mock backend so the app runs without configuration.

// To use the real Supabase backend:
// 1. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file
// 2. Run the SQL schema in supabase-schema.sql in your Supabase project
// 3. Comment out the mock export below and uncomment the real export

// --- MOCK BACKEND (Default) ---
// export * from './supabaseClient.mock';

// --- REAL BACKEND ---
export * from './supabaseClient.real';

