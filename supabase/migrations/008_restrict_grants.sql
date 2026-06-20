-- 007: Restrict table/sequence privileges to the authenticated role only.
--
-- Background: earlier troubleshooting granted ALL privileges to the `anon`
-- role as well. RLS still gates row access, but giving `anon` table-level
-- privileges removes a layer of defence: any missing or misconfigured RLS
-- policy would expose data to unauthenticated requests. The app never reads
-- application tables before login (auth goes through GoTrue, profiles are read
-- after sign-in), so `anon` needs no privileges on the public schema.

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Ensure the authenticated role keeps full DML access (RLS still applies).
GRANT ALL ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Future objects created by the migration owner inherit the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
