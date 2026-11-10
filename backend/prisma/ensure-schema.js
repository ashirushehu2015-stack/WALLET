"use strict";
const fs = require("fs");
const path = require("path");
try {
  require("dotenv").config();
} catch (_) {
  // Environment variables provided directly by host (e.g. Render)
}

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function extractEnumBody(schemaText, enumName) {
  const match = schemaText.match(new RegExp(`enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\}`));
  return match ? match[1] : "";
}

async function ensureEnumValues(existingTypes, enumName, values) {
  if (!existingTypes.has(enumName) || values.length === 0) {
    return;
  }
  for (const val of values) {
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${val}'`
    );
  }
}

async function main() {
  const schemaPath = path.join(__dirname, "schema.prisma");
  const schemaText = fs.readFileSync(schemaPath, "utf8");

  const typesRows = await prisma.$queryRawUnsafe(`
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname IN ('UserRole', 'KYCStatus', 'TransactionType')
  `);
  const existingTypes = new Set(typesRows.map((r) => r.typname));

  // Commit any new enum values in standalone queries before `prisma db push`
  // alters column defaults (e.g., KYCRecord.status default 'REGISTERED').
  const userRoleBody = extractEnumBody(schemaText, "UserRole");
  if (/\bSUPER_ADMIN\b/.test(userRoleBody)) {
    await ensureEnumValues(existingTypes, "UserRole", ["SUPER_ADMIN"]);
  }

  const kycStatusBody = extractEnumBody(schemaText, "KYCStatus");
  const kycNewValues = ["REGISTERED", "VERIFICATION_PENDING", "UNAVAILABLE"].filter((v) =>
    new RegExp(`\\b${v}\\b`).test(kycStatusBody)
  );
  await ensureEnumValues(existingTypes, "KYCStatus", kycNewValues);

  const txTypeBody = extractEnumBody(schemaText, "TransactionType");
  const txNewValues = ["VAS_AIRTIME", "VAS_DATA"].filter((v) =>
    new RegExp(`\\b${v}\\b`).test(txTypeBody)
  );
  await ensureEnumValues(existingTypes, "TransactionType", txNewValues);

  // Safely migrate legacy global idempotency_keys_key_key index to customer-scoped (userId, key)
  // before `prisma db push` runs so Prisma does not reject unique index replacement.
  const usesCompositeIdempotency = /@@unique\(\[\s*userId\s*,\s*key\s*\]\)/.test(schemaText);
  if (usesCompositeIdempotency) {
    const tableRows = await prisma.$queryRawUnsafe(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'idempotency_keys'
    `);
    if (tableRows.length > 0) {
      const legacyIndexRows = await prisma.$queryRawUnsafe(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'idempotency_keys'
          AND indexname = 'idempotency_keys_key_key'
      `);
      if (legacyIndexRows.length > 0) {
        console.log("Migrating idempotency_keys unique constraint to customer-scoped (userId, key)...");
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "idempotency_keys" DROP CONSTRAINT IF EXISTS "idempotency_keys_key_key"`
        );
        await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "idempotency_keys_key_key"`);
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "idempotency_keys"
            ADD COLUMN IF NOT EXISTS "requestHash" TEXT,
            ADD COLUMN IF NOT EXISTS "operationType" TEXT,
            ADD COLUMN IF NOT EXISTS "transactionReference" TEXT,
            ADD COLUMN IF NOT EXISTS "leaseOwner" TEXT,
            ADD COLUMN IF NOT EXISTS "lastProcessingUpdate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
        `);
        await prisma.$executeRawUnsafe(`
          CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_userId_key_key"
            ON "idempotency_keys"("userId", "key")
        `);
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "idempotency_keys_key_idx"
            ON "idempotency_keys"("key")
        `);
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "idempotency_keys_createdAt_idx"
            ON "idempotency_keys"("createdAt")
        `);
      }
    }
  }

  console.log("Database schema pre-sync checks complete.");
}

main()
  .catch((err) => {
    console.error("Failed during schema pre-sync:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
