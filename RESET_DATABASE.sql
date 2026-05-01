-- ================================================================
-- LUMOS DATABASE RESET - DELETE ALL DATA AND USERS
-- WARNING: This will permanently delete ALL data from the database
-- ================================================================

-- Step 1: Disable foreign key constraints temporarily
SET CONSTRAINTS ALL DEFERRED;

-- Step 2: Delete data from all tables (in correct order to respect FK constraints)

-- Delete from child tables first, then parent tables

DELETE FROM public.notifications_queue;
DELETE FROM public.notifications;
DELETE FROM public.profile_activity;
DELETE FROM public.profile_media;
DELETE FROM public.client_reviews;
DELETE FROM public.design_versions;
DELETE FROM public.client_assets;
DELETE FROM public.client_messages;
DELETE FROM public.client_updates;
DELETE FROM public.activity_log;
DELETE FROM public.auth_events;
DELETE FROM public.login_attempts;
DELETE FROM public.rate_limits;
DELETE FROM public.magic_links;
DELETE FROM public.phone_verifications;
DELETE FROM public.pricing_requests;
DELETE FROM public.orders;
DELETE FROM public.saved_designs;
DELETE FROM public.marketing_data;
DELETE FROM public.contacts;
DELETE FROM public.discount_codes;
DELETE FROM public.services_catalog;
DELETE FROM public.packages_catalog;
DELETE FROM public.avatar_presets;
DELETE FROM public.admin_settings;
DELETE FROM public.clients;

-- Step 3: Reset sequences (auto-increment counters)
ALTER SEQUENCE public.clients_id_seq RESTART WITH 1;
ALTER SEQUENCE public.contacts_id_seq RESTART WITH 1;
ALTER SEQUENCE public.orders_id_seq RESTART WITH 1;
ALTER SEQUENCE public.pricing_requests_id_seq RESTART WITH 1;
ALTER SEQUENCE public.saved_designs_id_seq RESTART WITH 1;
ALTER SEQUENCE public.client_messages_id_seq RESTART WITH 1;
ALTER SEQUENCE public.client_updates_id_seq RESTART WITH 1;
ALTER SEQUENCE public.client_assets_id_seq RESTART WITH 1;
ALTER SEQUENCE public.magic_links_id_seq RESTART WITH 1;
ALTER SEQUENCE public.phone_verifications_id_seq RESTART WITH 1;
ALTER SEQUENCE public.auth_events_id_seq RESTART WITH 1;
ALTER SEQUENCE public.login_attempts_id_seq RESTART WITH 1;
ALTER SEQUENCE public.rate_limits_id_seq RESTART WITH 1;
ALTER SEQUENCE public.activity_log_id_seq RESTART WITH 1;
ALTER SEQUENCE public.avatar_presets_id_seq RESTART WITH 1;
ALTER SEQUENCE public.profile_activity_id_seq RESTART WITH 1;
ALTER SEQUENCE public.profile_media_id_seq RESTART WITH 1;
ALTER SEQUENCE public.notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE public.notifications_queue_id_seq RESTART WITH 1;
ALTER SEQUENCE public.client_reviews_id_seq RESTART WITH 1;
ALTER SEQUENCE public.design_versions_id_seq RESTART WITH 1;
ALTER SEQUENCE public.discount_codes_id_seq RESTART WITH 1;
ALTER SEQUENCE public.services_catalog_id_seq RESTART WITH 1;
ALTER SEQUENCE public.packages_catalog_id_seq RESTART WITH 1;
ALTER SEQUENCE public.marketing_data_id_seq RESTART WITH 1;

-- Step 4: Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;

-- Step 5: Verify deletion
SELECT 'clients' as table_name, COUNT(*) as remaining FROM public.clients
UNION ALL
SELECT 'contacts', COUNT(*) FROM public.contacts
UNION ALL
SELECT 'orders', COUNT(*) FROM public.orders
UNION ALL
SELECT 'pricing_requests', COUNT(*) FROM public.pricing_requests
UNION ALL
SELECT 'saved_designs', COUNT(*) FROM public.saved_designs;

-- ================================================================
-- AUTH USERS DELETION
-- ================================================================
-- Note: To delete Supabase Auth users, you need to use the
-- Supabase Admin API or Dashboard. This SQL cannot directly
-- delete auth.users for security reasons.
--
-- To delete all auth users, run this in Supabase Dashboard SQL Editor:
-- 
-- DELETE FROM auth.users;
--
-- Or use the Supabase CLI:
-- supabase auth delete-user --user-id <user-id>
--
-- To delete ALL users programmatically, use this Edge Function
-- or run via Supabase Admin API:
-- ================================================================

-- Check if there are any remaining auth users (informational only)
-- This will show the count - actual deletion requires admin API
SELECT 
    'Auth Users Remaining' as info,
    (SELECT COUNT(*) FROM auth.users) as count;

-- ================================================================
-- CONFIRMATION MESSAGE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'DATABASE RESET COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'All data has been deleted from:';
    RAISE NOTICE '- All 26 tables have been cleared';
    RAISE NOTICE '- All sequences have been reset';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Delete auth users manually:';
    RAISE NOTICE '   - Go to Supabase Dashboard > Authentication > Users';
    RAISE NOTICE '   - Or run: DELETE FROM auth.users;';
    RAISE NOTICE '2. Re-seed data if needed:';
    RAISE NOTICE '   - services_catalog (30 services)';
    RAISE NOTICE '   - packages_catalog (3 packages)';
    RAISE NOTICE '   - avatar_presets (14 avatars)';
    RAISE NOTICE '   - admin_settings (10 settings)';
    RAISE NOTICE '============================================================';
END $$;

-- ================================================================
-- ALTERNATIVE: QUICK RESET ALL TABLES
-- ================================================================

-- Run this simpler version if you just want to truncate all tables
/*
TRUNCATE TABLE 
    public.notifications_queue,
    public.notifications,
    public.profile_activity,
    public.profile_media,
    public.client_reviews,
    public.design_versions,
    public.client_assets,
    public.client_messages,
    public.client_updates,
    public.activity_log,
    public.auth_events,
    public.login_attempts,
    public.rate_limits,
    public.magic_links,
    public.phone_verifications,
    public.pricing_requests,
    public.orders,
    public.saved_designs,
    public.marketing_data,
    public.contacts,
    public.discount_codes,
    public.services_catalog,
    public.packages_catalog,
    public.avatar_presets,
    public.admin_settings,
    public.clients
RESTART IDENTITY CASCADE;
*/
