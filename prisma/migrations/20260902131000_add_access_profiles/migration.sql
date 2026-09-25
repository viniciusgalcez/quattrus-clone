CREATE TABLE "AccessProfile" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "permissions" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccessProfile_name_key" ON "AccessProfile"("name");
ALTER TABLE "User" ADD COLUMN "accessProfileId" TEXT;
CREATE INDEX "User_accessProfileId_idx" ON "User"("accessProfileId");
ALTER TABLE "User" ADD CONSTRAINT "User_accessProfileId_fkey" FOREIGN KEY ("accessProfileId") REFERENCES "AccessProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "AccessProfile" ("id", "name", "type", "permissions", "updatedAt") VALUES
  ('profile-admin', 'Administrador', 'ADMIN', '["dashboard","measurements","approvals","imports","agenda","tasks","users","departments","profiles"]', CURRENT_TIMESTAMP),
  ('profile-manager', 'Gestor', 'GESTOR', '["dashboard","measurements","approvals","imports","agenda","tasks","departments"]', CURRENT_TIMESTAMP),
  ('profile-collaborator', 'Colaborador', 'COLABORADOR', '["dashboard","measurements","agenda","tasks"]', CURRENT_TIMESTAMP);

UPDATE "User" SET "accessProfileId" = CASE "role"
  WHEN 'ADMIN' THEN 'profile-admin'
  WHEN 'GESTOR' THEN 'profile-manager'
  ELSE 'profile-collaborator'
END;
