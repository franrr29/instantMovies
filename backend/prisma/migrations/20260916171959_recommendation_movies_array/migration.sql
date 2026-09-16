/*
  Warnings:

  - You are about to drop the column `reason` on the `recommendations` table. All the data in the column will be lost.
  - You are about to drop the column `tmdb_movie_id` on the `recommendations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `recommendations` DROP COLUMN `reason`,
    DROP COLUMN `tmdb_movie_id`,
    ADD COLUMN `movies` JSON NULL;
