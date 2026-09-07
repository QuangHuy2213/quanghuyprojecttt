ALTER TABLE "Transaction" ADD COLUMN "saleRequestedAt" TIMESTAMP(3), ADD COLUMN "completedAt" TIMESTAMP(3), ADD COLUMN "negotiatedAt" TIMESTAMP(3);
ALTER TABLE "posts" ADD COLUMN "approvedAt" TIMESTAMP(3);
UPDATE "posts" SET "approvedAt" = "updatedAt" WHERE "status" IN ('ACTIVE', 'SOLD');
ALTER TABLE "notifications" ADD COLUMN "eventKey" TEXT, ADD COLUMN "link" TEXT;
CREATE UNIQUE INDEX "notifications_eventKey_key" ON "notifications"("eventKey");
ALTER TABLE "messages" ADD COLUMN "post_id" INTEGER, ADD COLUMN "read_at" TIMESTAMP(3), ADD COLUMN "client_message_id" TEXT;
-- Existing messages predate unread tracking; do not turn all history into new badges.
UPDATE "messages" SET "read_at" = "created_at";
ALTER TABLE "messages" ADD CONSTRAINT "messages_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "messages_sender_id_client_message_id_key" ON "messages"("sender_id", "client_message_id");
CREATE INDEX "messages_receiver_id_read_at_idx" ON "messages"("receiver_id", "read_at");
CREATE INDEX "messages_sender_id_receiver_id_post_id_created_at_idx" ON "messages"("sender_id", "receiver_id", "post_id", "created_at");
