-- The app has a single owner until it gets real accounts. Every habit belongs to user 1
-- (server/index.ts, OWNER_ID), so the row has to exist before the first habit is created.
INSERT INTO "User" ("id", "email", "name") VALUES (1, 'owner@habits.local', 'Owner');
