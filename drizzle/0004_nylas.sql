CREATE TABLE nylas_connections (owner_id text PRIMARY KEY NOT NULL, grant_id text NOT NULL UNIQUE, email text NOT NULL, provider text NOT NULL, scopes text NOT NULL, updated_at text NOT NULL, last_sync text);
CREATE TABLE nylas_oauth_states (hash text PRIMARY KEY NOT NULL, owner_id text NOT NULL, payload text NOT NULL, expires_at integer NOT NULL);
