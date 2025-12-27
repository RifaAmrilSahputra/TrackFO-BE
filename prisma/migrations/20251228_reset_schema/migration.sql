-- Reset and create schema as requested
DROP TABLE IF EXISTS `DataTeknisi`;
DROP TABLE IF EXISTS `UserRole`;
DROP TABLE IF EXISTS `Role`;
DROP TABLE IF EXISTS `User`;

CREATE TABLE `Role` (
  `id_role` INT AUTO_INCREMENT PRIMARY KEY,
  `nama_role` VARCHAR(191) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE `User` (
  `id_user` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `UserRole` (
  `id_user` INT NOT NULL,
  `id_role` INT NOT NULL,
  PRIMARY KEY (`id_user`,`id_role`),
  CONSTRAINT `fk_userrole_user` FOREIGN KEY (`id_user`) REFERENCES `User`(`id_user`) ON DELETE CASCADE,
  CONSTRAINT `fk_userrole_role` FOREIGN KEY (`id_role`) REFERENCES `Role`(`id_role`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `DataTeknisi` (
  `id_teknisi` INT NOT NULL PRIMARY KEY,
  `no_hp` VARCHAR(50) NOT NULL,
  `area_kerja` VARCHAR(255) NOT NULL,
  `alamat` TEXT NULL,
  `koordinat` VARCHAR(255) NULL,
  CONSTRAINT `fk_datateknisi_user` FOREIGN KEY (`id_teknisi`) REFERENCES `User`(`id_user`) ON DELETE CASCADE
) ENGINE=InnoDB;
