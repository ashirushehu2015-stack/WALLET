# MANGAPAY — BVN/NIN FIELD-LEVEL ENCRYPTION MIGRATION READINESS REPORT

**Author:** Cybersecurity Specialist & Lead Database Auditor  
**Audit Reference:** MANGAPAY-DATA-PROT-MIGRATION-2026-11-09  
**Status:** MIGRATION SCRIPT TESTED & OPERATIONAL  
**Date:** November 9, 2026  

---

## 1. REGULATORY CONTEXT & DATA PROTECTION MANDATE

Under the Nigeria Data Protection Act (NDPA 2023), NDPR, and Central Bank of Nigeria (CBN) Risk-Based Cybersecurity Framework:
- Bank Verification Numbers (BVN) and National Identity Numbers (NIN) are legally classified as **Sensitive Personal Data (SPD)**.
- Storing SPD in plaintext constitutes an egregious regulatory compliance failure carrying severe sanctions.
- In Sprint 4, MangaPay engineered real-time AES-256-GCM field encryption for all new KYC submissions.
- However, legacy records created prior to Sprint 4 or historical test records could potentially contain unencrypted strings.

Sprint 6 required an operational, idempotent, and non-destructive database migration procedure to encrypt all existing historical records before commercial activation.

---

## 2. ENCRYPTION ALGORITHM & DATA INTEGRITY SPECIFICATION

### 2.1 Cryptographic Standard
- **Cipher:** Advanced Encryption Standard in Galois/Counter Mode (AES-256-GCM).
- **Key Derivation:** 256-bit symmetric master key provided via `ENCRYPTION_MASTER_KEY` environment variable.
- **Initialization Vector (IV):** Cryptographically random 96-bit (12-byte) IV generated per field via `crypto.randomBytes(12)`. IVs are never reused.
- **Authentication Tag:** 128-bit (16-byte) Galois authentication tag verifying ciphertext authenticity and preventing ciphertext tampering.
- **Format Prefix:** `v1:<iv_hex>:<tag_hex>:<ciphertext_hex>`.

### 2.2 Decryption Round-Trip Verification Pre-Commit
To eliminate the risk of irreversible data corruption during migration, the migration engine implements a mandatory round-trip verification step in memory before writing to PostgreSQL:
```ts
const newBvnEnc = record.bvn ? encryptIdentifier(record.bvn) : null;

// Mandatory Roundtrip Check
if (newBvnEnc && record.bvn) {
  const roundtripBvn = decryptIdentifier(newBvnEnc);
  if (roundtripBvn !== record.bvn.trim()) {
    throw new Error(`Integrity check failed: Roundtrip BVN decryption mismatch for record ${record.id}`);
  }
}
```
If the decrypted plaintext does not match the original plaintext character-for-character, the transaction aborts immediately and no database changes are committed.

---

## 3. MIGRATION SCRIPT IMPLEMENTATION

The production migration tool is located at:
[`backend/scripts/migrate-bvn-nin-encryption.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/scripts/migrate-bvn-nin-encryption.ts)

### 3.1 Idempotency & Safe Resume
- The migration inspects each record's BVN and NIN values using `isEncrypted(val)`.
- If a record begins with `v1:`, it is recognized as already encrypted and is skipped automatically.
- If the migration is interrupted (e.g., server restart or network timeout), re-running the script safely resumes without double-encrypting already processed records.

### 3.2 Controlled Transactional Batching
- The script processes records in configurable chunks (default: 50 records per batch).
- Batching prevents connection pool starvation, locks tables for minimal duration, and prevents out-of-memory errors on large datasets.

### 3.3 Zero Plaintext Logging
- Log streams never output unencrypted BVN/NIN strings.
- Only masked identifiers (e.g., `222******89` or `100******45`) are surfaced to console and log files via `maskIdentifier()`.

---

## 4. PRE-MIGRATION, EXECUTION & ROLLBACK PROCEDURES

### 4.1 Step 1: Pre-Migration Database Snapshot (Mandatory)
Before executing the script on live or staging environments, a full PostgreSQL binary dump must be captured:
```bash
pg_dump -U postgres -d mangapay_prod -t kyc_records > pre_migration_kyc_records_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 4.2 Step 2: Verification of Encryption Key
Ensure `ENCRYPTION_MASTER_KEY` is configured in production environment secrets:
- Must be a 64-character hexadecimal string representing 32 bytes (256 bits).
- Verify key presence:
  ```powershell
  if (-not $env:ENCRYPTION_MASTER_KEY) { Write-Error "ENCRYPTION_MASTER_KEY is not defined!" }
  ```

### 4.3 Step 3: Migration Execution
Run the standalone migration runner:
```bash
cd backend
npx ts-node scripts/migrate-bvn-nin-encryption.ts
```

### 4.4 Step 4: Post-Migration Database Audit
Run an automated verification query against PostgreSQL to ensure zero unencrypted records remain:
```sql
SELECT count(*) 
FROM kyc_records 
WHERE (bvn IS NOT NULL AND bvn NOT LIKE 'v1:%')
   OR (nin IS NOT NULL AND nin NOT LIKE 'v1:%');
```
**Expected Outcome:** `count = 0`.

### 4.5 Rollback Procedure (Emergency Only)
If unexpected discrepancies occur:
1. Stop application server traffic: `pm2 stop mangapay-backend`
2. Restore table from pre-migration backup:
   ```bash
   psql -U postgres -d mangapay_prod < pre_migration_kyc_records_backup_*.sql
   ```
3. Restart application backend: `pm2 restart mangapay-backend`

---

## 5. AUDIT CONCLUSION

The BVN/NIN Encryption Migration Engine is complete, tested, and ready for production deployment. Its zero-data-loss verification checks, idempotency, and strict privacy controls fulfill all statutory requirements of NDPA 2023 and CBN cybersecurity mandates.
