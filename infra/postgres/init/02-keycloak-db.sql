-- Keycloak persistence (Phase 35 / K EC 1.2). Uses the same Postgres role as the app.
SELECT 'CREATE DATABASE keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec
