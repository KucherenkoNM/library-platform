-- Stage 1: tenant, RBAC, settings, circulation rules and audit foundation.

CREATE TABLE "Library" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Library_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "libraryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "libraryId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "libraryId" UUID,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserRole" (
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId", "roleId")
);

CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "LibrarySettings" (
    "libraryId" UUID NOT NULL,
    "timezone" TEXT NOT NULL,
    "defaultLocale" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LibrarySettings_pkey" PRIMARY KEY ("libraryId")
);

CREATE TABLE "CirculationRule" (
    "id" UUID NOT NULL,
    "libraryId" UUID NOT NULL,
    "branchId" UUID,
    "readerType" TEXT,
    "defaultLoanDays" INTEGER NOT NULL,
    "maxBooksPerReader" INTEGER NOT NULL,
    "maxRenewals" INTEGER NOT NULL,
    "reservationHoldDays" INTEGER NOT NULL,
    "blockOnOverdue" BOOLEAN NOT NULL,
    "allowReservations" BOOLEAN NOT NULL,
    "allowRenewals" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CirculationRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "libraryId" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Library_slug_key" ON "Library"("slug");

CREATE UNIQUE INDEX "Branch_libraryId_name_key" ON "Branch"("libraryId", "name");
CREATE UNIQUE INDEX "Branch_libraryId_id_key" ON "Branch"("libraryId", "id");
CREATE INDEX "Branch_libraryId_idx" ON "Branch"("libraryId");

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_libraryId_idx" ON "User"("libraryId");

CREATE UNIQUE INDEX "Role_libraryId_code_key" ON "Role"("libraryId", "code");
CREATE UNIQUE INDEX "Role_system_code_key" ON "Role"("code") WHERE "libraryId" IS NULL;
CREATE INDEX "Role_libraryId_idx" ON "Role"("libraryId");

CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

CREATE UNIQUE INDEX "CirculationRule_libraryId_branchId_key" ON "CirculationRule"("libraryId", "branchId");
CREATE UNIQUE INDEX "CirculationRule_library_default_key" ON "CirculationRule"("libraryId") WHERE "branchId" IS NULL;
CREATE INDEX "CirculationRule_libraryId_idx" ON "CirculationRule"("libraryId");
CREATE INDEX "CirculationRule_branchId_idx" ON "CirculationRule"("branchId");

CREATE INDEX "AuditLog_libraryId_createdAt_idx" ON "AuditLog"("libraryId", "createdAt" DESC);
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

ALTER TABLE "Branch"
    ADD CONSTRAINT "Branch_libraryId_fkey"
    FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User"
    ADD CONSTRAINT "User_libraryId_fkey"
    FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Role"
    ADD CONSTRAINT "Role_libraryId_fkey"
    FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserRole"
    ADD CONSTRAINT "UserRole_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRole"
    ADD CONSTRAINT "UserRole_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RolePermission"
    ADD CONSTRAINT "RolePermission_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RolePermission"
    ADD CONSTRAINT "RolePermission_permissionId_fkey"
    FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LibrarySettings"
    ADD CONSTRAINT "LibrarySettings_libraryId_fkey"
    FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CirculationRule"
    ADD CONSTRAINT "CirculationRule_libraryId_fkey"
    FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CirculationRule"
    ADD CONSTRAINT "CirculationRule_libraryId_branchId_fkey"
    FOREIGN KEY ("libraryId", "branchId") REFERENCES "Branch"("libraryId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_libraryId_fkey"
    FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
