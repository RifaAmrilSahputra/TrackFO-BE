-- Migration: add phone, area_kerja, is_active to User
-- Adjust as needed, then run: npx prisma migrate deploy

-- Ensure table exists (idempotent for shadow DBs)
CREATE TABLE IF NOT EXISTS `User` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Add new columns if they don't already exist (MySQL 8+ supports ADD COLUMN IF NOT EXISTS)
ALTER TABLE `User`
  ADD COLUMN IF NOT EXISTS `phone` VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS `area_kerja` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `is_active` TINYINT(1) NOT NULL DEFAULT 1;

-- Create index if not exists (safe for repeatable runs)
SET @idx_exists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'User' AND index_name = 'idx_user_area_kerja'
);
SET @s := CONCAT('CREATE INDEX `idx_user_area_kerja` ON `User` (`area_kerja`)');
-- execute only if not exists
PREPARE stmt FROM @s;
IF @idx_exists = 0 THEN
  EXECUTE stmt;
END IF;
DEALLOCATE PREPARE stmt;
