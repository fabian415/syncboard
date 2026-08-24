-- CreateEnum
CREATE TYPE "DeepDiveAssetType" AS ENUM ('HTML', 'IMAGE', 'PPTX');

-- CreateEnum
CREATE TYPE "DeepDiveAssetStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "DeepDiveAsset" (
    "id" TEXT NOT NULL,
    "meetingDate" DATE NOT NULL,
    "assetType" "DeepDiveAssetType" NOT NULL,
    "status" "DeepDiveAssetStatus" NOT NULL DEFAULT 'UPLOADING',
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "slideCount" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeepDiveAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeepDiveAsset_meetingDate_assetType_idx" ON "DeepDiveAsset"("meetingDate", "assetType");
