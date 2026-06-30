/*
  Warnings:

  - Added the required column `area` to the `Gangguan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Gangguan` ADD COLUMN `area` VARCHAR(191) NOT NULL;
