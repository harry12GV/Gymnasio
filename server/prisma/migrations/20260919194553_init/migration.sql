-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'RECEPTION', 'MEMBER');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('TIME', 'DAY_PASS', 'TRIAL_DAY');

-- CreateEnum
CREATE TYPE "DayPassMode" AS ENUM ('NATURAL_DAY', 'HOURS_24');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD', 'DIGITAL_WALLET');

-- CreateEnum
CREATE TYPE "PaymentCategory" AS ENUM ('MEMBERSHIP', 'DAY_PASS', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "photoUrl" TEXT,
    "birthDate" TIMESTAMP(3),
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "qrToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PlanType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "durationDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "receiptCode" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "membershipId" TEXT,
    "category" "PaymentCategory" NOT NULL DEFAULT 'MEMBERSHIP',
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "registeredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "entryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitAt" TIMESTAMP(3),
    "result" TEXT NOT NULL DEFAULT 'ALLOWED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_settings" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL DEFAULT 'NEW START GYM',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "openingHours" JSONB,
    "dayPassMode" "DayPassMode" NOT NULL DEFAULT 'NATURAL_DAY',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "members_documentId_key" ON "members"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "members_qrToken_key" ON "members"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "members_userId_key" ON "members"("userId");

-- CreateIndex
CREATE INDEX "members_lastName_firstName_idx" ON "members"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "memberships_memberId_status_idx" ON "memberships"("memberId", "status");

-- CreateIndex
CREATE INDEX "memberships_endDate_idx" ON "memberships"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receiptCode_key" ON "payments"("receiptCode");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "payments_memberId_idx" ON "payments"("memberId");

-- CreateIndex
CREATE INDEX "check_ins_memberId_entryAt_idx" ON "check_ins"("memberId", "entryAt");

-- CreateIndex
CREATE INDEX "check_ins_entryAt_idx" ON "check_ins"("entryAt");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
