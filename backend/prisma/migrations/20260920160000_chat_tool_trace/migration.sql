-- AlterTable
ALTER TABLE `chat_messages` MODIFY `role` ENUM('USER', 'ASSISTANT', 'TOOL') NOT NULL,
    ADD COLUMN `tool_call_id` VARCHAR(191) NULL,
    ADD COLUMN `tool_calls` JSON NULL;
