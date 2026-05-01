/**
 * Test Supabase Database Connection
 * Run this with: node test-supabase-connection.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

console.log('🔍 Testing Supabase Connection...\n');
console.log('📍 URL:', SUPABASE_URL);
console.log('🔑 Anon Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...\n');

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test 1: Check if we can connect
console.log('Test 1: Basic Connection Test');
try {
    const { data, error } = await supabase.from('contacts').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('❌ Connection failed:', error.message);
        console.error('   Details:', error);
    } else {
        console.log('✅ Connection successful!');
        console.log('   Contacts table is accessible\n');
    }
} catch (err) {
    console.error('❌ Unexpected error:', err.message);
}

// Test 2: Check clients table
console.log('Test 2: Clients Table Test');
try {
    const { data, error } = await supabase.from('clients').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('❌ Clients table access failed:', error.message);
    } else {
        console.log('✅ Clients table is accessible\n');
    }
} catch (err) {
    console.error('❌ Unexpected error:', err.message);
}

// Test 3: Check auth
console.log('Test 3: Auth Service Test');
try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('❌ Auth check failed:', error.message);
    } else {
        console.log('✅ Auth service is working');
        console.log('   Current session:', session ? 'Active' : 'None\n');
    }
} catch (err) {
    console.error('❌ Unexpected error:', err.message);
}

console.log('\n═══════════════════════════════════════');
console.log('Connection test completed!');
console.log('═══════════════════════════════════════\n');

process.exit(0);

