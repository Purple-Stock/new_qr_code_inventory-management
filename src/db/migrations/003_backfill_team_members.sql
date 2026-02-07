INSERT OR IGNORE INTO team_members (team_id, user_id, role, status)
SELECT id, user_id, 'admin', 'active'
FROM teams
WHERE user_id IS NOT NULL;

