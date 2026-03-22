-- This migration was applied via prisma db push and is recorded here for tracking.
-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserRecipe" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "labels" TEXT[],
    "cuisine" TEXT,
    "prepTimeISO" TEXT NOT NULL,
    "caloriesPerPerson" INTEGER NOT NULL,
    "recipeYield" INTEGER NOT NULL,
    "instructions" TEXT[],
    "ingredients" JSONB NOT NULL,
    "sourceUrl" TEXT,
    "youtubeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserRecipe_pkey" PRIMARY KEY ("id")
);
