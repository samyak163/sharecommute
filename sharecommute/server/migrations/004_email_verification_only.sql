-- Preserve profiles and ride history while removing legacy test-code access.
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE verification <> 'email');
UPDATE login_challenges SET consumed = 1 WHERE verification <> 'email' AND consumed = 0;
