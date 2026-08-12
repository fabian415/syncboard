-- AlterTable
ALTER TABLE "User" DROP COLUMN "passwordHash";

-- AlterTable
ALTER TABLE "CombinedReport" ALTER COLUMN "generatedBy" DROP NOT NULL;
