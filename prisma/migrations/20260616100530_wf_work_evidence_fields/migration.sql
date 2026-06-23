/*
  Warnings:

  - You are about to drop the column `createdAt` on the `WorkEvidence` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrl` on the `WorkEvidence` table. All the data in the column will be lost.
  - Added the required column `changedByUserId` to the `AssignmentStatusLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileUrl` to the `WorkEvidence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teknisiId` to the `WorkEvidence` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `WorkEvidence_createdAt_idx` ON `WorkEvidence`;

-- AlterTable
ALTER TABLE `AssignmentStatusLog` ADD COLUMN `changedByUserId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `WorkEvidence` DROP COLUMN `createdAt`,
    DROP COLUMN `photoUrl`,
    ADD COLUMN `fileUrl` VARCHAR(191) NOT NULL,
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL,
    ADD COLUMN `teknisiId` INTEGER NOT NULL,
    ADD COLUMN `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE INDEX `AssignmentStatusLog_changedByUserId_idx` ON `AssignmentStatusLog`(`changedByUserId`);

-- CreateIndex
CREATE INDEX `WorkEvidence_teknisiId_idx` ON `WorkEvidence`(`teknisiId`);

-- CreateIndex
CREATE INDEX `WorkEvidence_uploadedAt_idx` ON `WorkEvidence`(`uploadedAt`);
