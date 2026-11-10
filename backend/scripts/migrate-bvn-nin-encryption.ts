/**
 * MANGAPAY DATA PROTECTION MIGRATION: ENCRYPT EXISTING PLAINTEXT BVN & NIN
 * 
 * Safely migrates existing plaintext BVN and NIN values in `kyc_records` to AES-256-GCM.
 * - Idempotent & Resume-safe: Skips records already prefixed with `v1:`
 * - Zero Data Discard: Validates decryption roundtrip before committing each record
 * - Controlled Batches: Processes in configurable batches (default 50)
 * - Zero Plaintext Exposure: Masked logging only
 */

import { prisma } from '../src/config/db';
import { encryptIdentifier, decryptIdentifier, isEncrypted, maskIdentifier } from '../src/utils/encryption';
import { logger } from '../src/config/logger';

export interface MigrationSummary {
  totalRecordsAudited: number;
  alreadyEncrypted: number;
  migratedCount: number;
  failedCount: number;
  errors: string[];
}

export async function migrateBvnNinEncryption(batchSize: number = 50): Promise<MigrationSummary> {
  console.log('\n======================================================');
  console.log('🔒 MANGAPAY KYC DATA ENCRYPTION MIGRATION (AES-256-GCM)');
  console.log('======================================================\n');

  const summary: MigrationSummary = {
    totalRecordsAudited: 0,
    alreadyEncrypted: 0,
    migratedCount: 0,
    failedCount: 0,
    errors: [],
  };

  try {
    const kycRecords = await prisma.kYCRecord.findMany({
      orderBy: { createdAt: 'asc' },
    });

    summary.totalRecordsAudited = kycRecords.length;
    console.log(`Found ${kycRecords.length} total KYC records in database.`);

    // Process in controlled batches
    for (let i = 0; i < kycRecords.length; i += batchSize) {
      const batch = kycRecords.slice(i, i + batchSize);

      for (const record of batch) {
        const bvnNeedsEncryption = record.bvn && !isEncrypted(record.bvn);
        const ninNeedsEncryption = record.nin && !isEncrypted(record.nin);

        if (!bvnNeedsEncryption && !ninNeedsEncryption) {
          summary.alreadyEncrypted++;
          continue;
        }

        try {
          const newBvnEnc = record.bvn ? encryptIdentifier(record.bvn) : null;
          const newNinEnc = record.nin ? encryptIdentifier(record.nin) : null;

          // Integrity Check: Verify that decryption matches the original plaintext before DB commit
          if (newBvnEnc && record.bvn) {
            const roundtripBvn = decryptIdentifier(newBvnEnc);
            if (roundtripBvn !== record.bvn.trim()) {
              throw new Error(`Integrity check failed: Roundtrip BVN decryption mismatch for record ${record.id}`);
            }
          }

          if (newNinEnc && record.nin) {
            const roundtripNin = decryptIdentifier(newNinEnc);
            if (roundtripNin !== record.nin.trim()) {
              throw new Error(`Integrity check failed: Roundtrip NIN decryption mismatch for record ${record.id}`);
            }
          }

          // Atomic DB update
          await prisma.kYCRecord.update({
            where: { id: record.id },
            data: {
              bvn: newBvnEnc,
              nin: newNinEnc,
            },
          });

          summary.migratedCount++;
          console.log(`  ✅ Encrypted Record [ID: ${record.id.substring(0, 8)}...] | BVN: ${maskIdentifier(record.bvn)} | NIN: ${maskIdentifier(record.nin)}`);
        } catch (err: any) {
          summary.failedCount++;
          const errMsg = `Failed to encrypt KYC Record ${record.id}: ${err.message}`;
          summary.errors.push(errMsg);
          console.error(`  ❌ ${errMsg}`);
        }
      }
    }

    console.log('\n======================================================');
    console.log(`📊 MIGRATION SUMMARY:`);
    console.log(`   Total Audited:      ${summary.totalRecordsAudited}`);
    console.log(`   Already Encrypted:  ${summary.alreadyEncrypted}`);
    console.log(`   Successfully Migrated: ${summary.migratedCount}`);
    console.log(`   Failed:             ${summary.failedCount}`);
    console.log('======================================================\n');

    return summary;
  } catch (error: any) {
    console.error('Fatal Migration Error:', error.message);
    throw error;
  }
}

// Allow standalone execution
if (require.main === module) {
  migrateBvnNinEncryption()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
