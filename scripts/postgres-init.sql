-- Run once on first database initialisation
-- UUID generation support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Efficient query statistics (available in pg_stat_statements view)
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- French text search dictionary used by the GIN FTS index
-- (built-in, no extra install needed — just confirming it's available)
