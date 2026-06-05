-- Custom SQL migration file, put your code below! --

-- Seed the reference stock universe. Idempotent: safe to re-run on any database
-- (incl. every Neon branch). This is reference data, so it lives in a migration
-- rather than a separate seed step — applying migrations is enough to make a
-- fresh database tradeable.
INSERT INTO "stocks" ("symbol", "name") VALUES
  ('AAPL', 'Apple Inc.'),
  ('TSLA', 'Tesla, Inc.'),
  ('AMZN', 'Amazon.com, Inc.'),
  ('GOOGL', 'Alphabet Inc.'),
  ('MSFT', 'Microsoft Corporation')
ON CONFLICT ("symbol") DO NOTHING;
