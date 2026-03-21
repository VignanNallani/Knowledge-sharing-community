-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('SESSION_START', 'SESSION_END', 'FEEDBACK_REQUEST');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "mentorship_sessions" (
    "id" TEXT NOT NULL,
    "mentorshipId" INTEGER NOT NULL,
    "mentorId" INTEGER NOT NULL,
    "menteeId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "meetUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentorship_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_feedback" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "mentorId" INTEGER NOT NULL,
    "menteeId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_availability" (
    "id" TEXT NOT NULL,
    "mentorId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "recurring" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_reminders" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "mentorId" INTEGER NOT NULL,
    "menteeId" INTEGER NOT NULL,
    "reminderType" "ReminderType" NOT NULL DEFAULT 'SESSION_START',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mentorship_sessions_mentorshipId_idx" ON "mentorship_sessions"("mentorshipId");

CREATE INDEX "mentorship_sessions_mentorId_idx" ON "mentorship_sessions"("mentorId");

CREATE INDEX "mentorship_sessions_menteeId_idx" ON "mentorship_sessions"("menteeId");

CREATE INDEX "mentorship_sessions_status_idx" ON "mentorship_sessions"("status");

CREATE INDEX "mentorship_sessions_scheduledAt_idx" ON "mentorship_sessions"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "session_feedback_sessionId_key" ON "session_feedback"("sessionId");

CREATE INDEX "session_feedback_mentorId_idx" ON "session_feedback"("mentorId");

CREATE INDEX "session_feedback_menteeId_idx" ON "session_feedback"("menteeId");

CREATE INDEX "session_feedback_rating_idx" ON "session_feedback"("rating");

-- CreateIndex
CREATE INDEX "mentor_availability_mentorId_idx" ON "mentor_availability"("mentorId");

CREATE INDEX "mentor_availability_dayOfWeek_idx" ON "mentor_availability"("dayOfWeek");

CREATE INDEX "mentor_availability_isActive_idx" ON "mentor_availability"("isActive");

-- CreateIndex
CREATE INDEX "session_reminders_sessionId_idx" ON "session_reminders"("sessionId");

CREATE INDEX "session_reminders_mentorId_idx" ON "session_reminders"("mentorId");

CREATE INDEX "session_reminders_menteeId_idx" ON "session_reminders"("menteeId");

CREATE INDEX "session_reminders_scheduledAt_idx" ON "session_reminders"("scheduledAt");

CREATE INDEX "session_reminders_status_idx" ON "session_reminders"("status");

-- AddForeignKey
ALTER TABLE "mentorship_sessions" ADD CONSTRAINT "mentorship_sessions_mentorshipId_fkey" FOREIGN KEY ("mentorshipId") REFERENCES "mentorships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mentorship_sessions" ADD CONSTRAINT "mentorship_sessions_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mentorship_sessions" ADD CONSTRAINT "mentorship_sessions_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_feedback" ADD CONSTRAINT "session_feedback_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "mentorship_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_feedback" ADD CONSTRAINT "session_feedback_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_feedback" ADD CONSTRAINT "session_feedback_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_availability" ADD CONSTRAINT "mentor_availability_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_reminders" ADD CONSTRAINT "session_reminders_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "mentorship_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
