DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS company_members;
DROP TABLE IF EXISTS companies;
DROP INDEX IF EXISTS index_teams_on_company_id;
ALTER TABLE teams DROP COLUMN company_id;
