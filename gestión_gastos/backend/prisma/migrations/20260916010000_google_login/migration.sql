ALTER TABLE "usuarios" ADD COLUMN "googleId" TEXT;
CREATE UNIQUE INDEX "usuarios_googleId_key" ON "usuarios"("googleId");
