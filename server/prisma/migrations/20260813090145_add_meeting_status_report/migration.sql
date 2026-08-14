-- CreateTable
CREATE TABLE "MeetingStatusReport" (
    "id" TEXT NOT NULL,
    "meetingDate" DATE NOT NULL,
    "markdownPath" TEXT NOT NULL,
    "htmlPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingStatusReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingStatusReport_meetingDate_key" ON "MeetingStatusReport"("meetingDate");
