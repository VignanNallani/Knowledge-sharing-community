-- CreateIndex
CREATE INDEX "mentorships_mentorId_status_idx" ON "mentorships"("mentorId", "status");

-- CreateIndex
CREATE INDEX "mentorships_menteeId_status_idx" ON "mentorships"("menteeId", "status");
