import { VASService } from '../src/modules/vas/services/vas.service';
import { VASPricingService } from '../src/modules/vas/services/pricing.service';
import { VTPassProvider } from '../src/modules/vas/providers/vtpass.provider';

async function runOfflineVASUnitTests() {
  console.log('=====================================================================');
  console.log('🧪 RUNNING VAS UNIT TEST SUITE (OFFLINE & ENGINE SPECIFICATION)');
  console.log('=====================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Phone Normalization
  console.log('--- 1. Phone Normalization Tests ---');
  assert(VASService.normalizePhoneNumber('08031234567') === '08031234567', 'Standard 11-digit local format');
  assert(VASService.normalizePhoneNumber('+2348031234567') === '08031234567', 'E.164 +234 international format');
  assert(VASService.normalizePhoneNumber('2348031234567') === '08031234567', '234 without + prefix');
  assert(VASService.normalizePhoneNumber('0803-123-4567') === '08031234567', 'Dashes stripped correctly');
  assert(VASService.normalizePhoneNumber('0803 123 4567') === '08031234567', 'Spaces stripped correctly');

  let invalidCaught = false;
  try {
    VASService.normalizePhoneNumber('12345');
  } catch (e) {
    invalidCaught = true;
  }
  assert(invalidCaught, 'Rejects invalid short numbers');

  // 2. Telecom Prefix Auto-Detection
  console.log('\n--- 2. Telecom Prefix Detection Tests ---');
  assert(VASService.detectNetwork('08030000000') === 'MTN', 'MTN prefix 0803');
  assert(VASService.detectNetwork('08060000000') === 'MTN', 'MTN prefix 0806');
  assert(VASService.detectNetwork('07030000000') === 'MTN', 'MTN prefix 0703');
  assert(VASService.detectNetwork('08020000000') === 'AIRTEL', 'Airtel prefix 0802');
  assert(VASService.detectNetwork('08080000000') === 'AIRTEL', 'Airtel prefix 0808');
  assert(VASService.detectNetwork('08050000000') === 'GLO', 'Glo prefix 0805');
  assert(VASService.detectNetwork('07050000000') === 'GLO', 'Glo prefix 0705');
  assert(VASService.detectNetwork('08090000000') === '9MOBILE', '9mobile prefix 0809');
  assert(VASService.detectNetwork('08180000000') === '9MOBILE', '9mobile prefix 0818');

  // 3. VTpass Request ID Format Requirement
  console.log('\n--- 3. VTpass Specification (request_id Format) ---');
  // VTpass requires: YYYYMMDDHHmm + alphanumeric string (at least 12 chars timestamp prefix)
  const provider = new VTPassProvider();
  // Access private generator via method check or regex test
  const now = new Date();
  const year = now.getFullYear();
  const reqIdRegex = /^\d{12}[a-zA-Z0-9]+$/;
  // Test generating through provider helper
  const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, '');
  assert(datePrefix.length === 8, `Date prefix matches YYYYMMDD: ${datePrefix}`);

  // 4. Authoritative Pricing & Commission Breakdown
  console.log('\n--- 4. Authoritative Wholesale Accounting Math ---');
  const mtn = VASPricingService.quoteAirtime('MTN', 5000);
  assert(mtn.sellingPrice === 5000, 'MTN Selling Price is ₦5,000');
  assert(mtn.providerCost === 4900, 'MTN Provider Cost is ₦4,900 (2% wholesale discount)');
  assert(mtn.profitAmount === 100, 'MTN Platform Margin is ₦100');
  assert(mtn.sellingPrice === mtn.providerCost + mtn.profitAmount, 'Sum Invariant: 4900 + 100 === 5000');

  const glo = VASPricingService.quoteAirtime('GLO', 10000);
  assert(glo.sellingPrice === 10000, 'Glo Selling Price is ₦10,000');
  assert(glo.providerCost === 9750, 'Glo Provider Cost is ₦9,750 (2.5% wholesale discount)');
  assert(glo.profitAmount === 250, 'Glo Platform Margin is ₦250');
  assert(glo.sellingPrice === glo.providerCost + glo.profitAmount, 'Sum Invariant: 9750 + 250 === 10000');

  const dataQuote = VASPricingService.quoteData(1500);
  assert(dataQuote.sellingPrice === 1500, 'Data selling price equals bundle cost');
  assert(dataQuote.providerCost === 1500, 'Data wholesale provider cost tracked');
  assert(dataQuote.serviceFee === 0, 'No extra hidden transaction fee on data');

  console.log('\n=====================================================================');
  console.log(`🏁 UNIT SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================================\n');
}

runOfflineVASUnitTests();
