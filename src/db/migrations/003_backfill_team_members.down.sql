DELETE FROM team_members
WHERE role = 'admin'
  AND status = 'active'
  AND (team_id, user_id) IN (
    SELECT id, user_id
    FROM teams
    WHERE user_id IS NOT NULL
  );
