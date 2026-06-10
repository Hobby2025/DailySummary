-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reportDate" DATETIME NOT NULL,
    "rawCurrentWeek" TEXT NOT NULL,
    "rawNextWeek" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dailyReportId" TEXT NOT NULL,
    "workDate" DATETIME NOT NULL,
    "projectName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "workType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "planType" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkItem_dailyReportId_fkey" FOREIGN KEY ("dailyReportId") REFERENCES "DailyReport" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekStart" DATETIME NOT NULL,
    "weekEnd" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "DailyReport_userId_reportDate_idx" ON "DailyReport"("userId", "reportDate");

-- CreateIndex
CREATE INDEX "WorkItem_userId_workDate_idx" ON "WorkItem"("userId", "workDate");

-- CreateIndex
CREATE INDEX "WorkItem_projectName_idx" ON "WorkItem"("projectName");

-- CreateIndex
CREATE INDEX "WorkItem_planType_idx" ON "WorkItem"("planType");

-- CreateIndex
CREATE INDEX "WeeklyReport_weekStart_weekEnd_idx" ON "WeeklyReport"("weekStart", "weekEnd");
