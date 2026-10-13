-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Habit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '✨',
    "color" TEXT NOT NULL DEFAULT 'violet',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Existing habits start at their first entry (or now). Written as ISO 8601 like the Prisma adapter
-- writes dates, not CURRENT_TIMESTAMP's "YYYY-MM-DD HH:MM:SS", which reads back as local time.
INSERT INTO "new_Habit" ("description", "id", "title", "userId", "createdAt")
SELECT "description", "id", "title", "userId",
       COALESCE(
         (SELECT MIN("date") FROM "Track" WHERE "Track"."habitId" = "Habit"."id"),
         strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
       )
FROM "Habit";
DROP TABLE "Habit";
ALTER TABLE "new_Habit" RENAME TO "Habit";
CREATE TABLE "new_Track" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "habitId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Track_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Track" ("date", "habitId", "id") SELECT "date", "habitId", "id" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
CREATE INDEX "Track_habitId_date_idx" ON "Track"("habitId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
