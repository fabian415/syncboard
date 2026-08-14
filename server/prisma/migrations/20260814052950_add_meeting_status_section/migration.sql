-- CreateTable
CREATE TABLE "MeetingStatusSection" (
    "id" TEXT NOT NULL,
    "meetingDate" DATE NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "markdownPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingStatusSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingStatusSection_meetingDate_sectionKey_key" ON "MeetingStatusSection"("meetingDate", "sectionKey");
