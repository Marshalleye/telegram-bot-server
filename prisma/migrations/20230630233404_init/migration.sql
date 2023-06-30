-- CreateTable
CREATE TABLE "Reputation" (
    "id" SERIAL NOT NULL,
    "telegramId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "userAvatar" TEXT NOT NULL,

    CONSTRAINT "Reputation_pkey" PRIMARY KEY ("id")
);
