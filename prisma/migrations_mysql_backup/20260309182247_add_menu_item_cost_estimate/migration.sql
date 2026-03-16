-- CreateTable
CREATE TABLE `MenuItemCostEstimate` (
    `id` VARCHAR(191) NOT NULL,
    `menuItemId` VARCHAR(191) NOT NULL,
    `dishName` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `asOfDate` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'EGP',
    `dataSource` TEXT NULL,
    `ingredients` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MenuItemCostEstimate_menuItemId_key`(`menuItemId`),
    INDEX `MenuItemCostEstimate_menuItemId_idx`(`menuItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MenuItemCostEstimate` ADD CONSTRAINT `MenuItemCostEstimate_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
