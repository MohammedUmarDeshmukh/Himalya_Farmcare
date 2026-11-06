import dotenv from 'dotenv';
import { resolve } from 'node:path';
import {
  detectLanguage,
  getCatalogueContext,
  findMatchingProducts,
  generateFallbackResponse,
  processChatMessage,
  extractAcreage,
  normalizeQuery,
} from './src/services/chatbotService.js';
import { handleChatMessage } from './src/controllers/chatbotController.js';

dotenv.config({ path: resolve(process.cwd(), 'backend/.env') });

const mockProducts = [
  {
    _id: 'prod1',
    id: 1,
    name: 'BugNox Prime',
    crop: 'Cotton',
    problem: 'Insecticide',
    applicationMethod: 'Spray',
    sequence: 2,
    dosagePerAcre: 100,
    dosageUnit: 'ml',
    prices: [{ size: 100, amount: 288 }, { size: 500, amount: 2848.76 }],
    stock: 50,
  },
  {
    _id: 'prod2',
    id: 3,
    name: 'FungiClear Pro',
    crop: 'Cotton',
    problem: 'Fungicide',
    applicationMethod: 'Spray',
    sequence: 1,
    dosagePerAcre: 500,
    dosageUnit: 'ml',
    prices: [{ size: 100, amount: 324 }, { size: 500, amount: 2344.56 }],
    stock: 45,
  },
  {
    _id: 'prod3',
    id: 13,
    name: 'NeoBug Kill',
    crop: 'Turmeric',
    problem: 'Insecticide',
    applicationMethod: 'Spray',
    sequence: 1,
    dosagePerAcre: 100,
    dosageUnit: 'ml',
    prices: [{ size: 100, amount: 216 }, { size: 500, amount: 2488.39 }],
    stock: 40,
  },
];

const mockCrops = [
  { name: 'CORN' },
  { name: 'Cotton' },
  { name: 'Soyabean' },
  { name: 'Turmeric' },
  { name: 'OTHER' },
];

const mockProblems = [
  { name: 'Insecticide' },
  { name: 'Fungicide' },
  { name: 'PGR' },
  { name: 'Special PGR' },
];

const mockMethods = [
  { name: 'Spray' },
  { name: 'Drip' },
];

const mockCatalogue = {
  products: mockProducts,
  crops: mockCrops,
  problems: mockProblems,
  methods: mockMethods,
};

let passed = 0;
let failed = 0;

function assert(desc, condition) {
  if (condition) {
    console.log(`✅ PASS: ${desc}`);
    passed += 1;
  } else {
    console.error(`❌ FAIL: ${desc}`);
    failed += 1;
  }
}

async function runTests() {
  console.log('--- STARTING PHASE 16 CHATBOT INTEGRATION TESTS ---');

  // 1. Language Detection Tests
  assert('Detects English query', detectLanguage('Which products are available for Cotton?') === 'english');
  assert('Detects Hindi Devanagari query', detectLanguage('कपास के लिए कौनसे कीटनाशक उपलब्ध हैं?') === 'hindi');
  assert('Detects Hinglish query', detectLanguage('Cotton crop ke liye kaunse products available hain?') === 'hinglish');
  assert('Detects Hinglish order query', detectLanguage('Mera order kaise track hoga?') === 'hinglish');
  assert('Detects Hinglish thank you', detectLanguage('bahut dhanyawad sir') === 'hinglish');

  // 2. Query Normalization & Typo Tolerance
  assert('Normalizes "cotten" to "cotton"', normalizeQuery('cotten medicine') === 'cotton medicine');
  assert('Normalizes "turmaric" to "turmeric"', normalizeQuery('turmaric dawa') === 'turmeric dawa');
  assert('Normalizes "haldi" to "turmeric"', normalizeQuery('haldi keeda') === 'turmeric keeda');

  // 3. Acreage Extraction
  assert('Extracts 5 acres from "How much for 5 acres?"', extractAcreage('How much for 5 acres?') === 5);
  assert('Extracts 2.5 acres from "2.5 acre ke liye"', extractAcreage('2.5 acre ke liye') === 2.5);
  assert('Extracts 10 acres from "10 एकड़ दवा"', extractAcreage('10 एकड़ दवा') === 10);

  // 4. Dynamic Dosage & Acreage Math Calculation
  const acreageRes = generateFallbackResponse('How much BugNox Prime for 5 acres?', mockCatalogue, 'english');
  assert('Calculates total dose for 5 acres (500 ml)', acreageRes.reply.includes('500 ml'));
  assert('Recommends 1 pack of 500ml (Zero Wastage)', acreageRes.reply.includes('500 ml bottles:** 1'));

  const acreageRes2 = generateFallbackResponse('I have 3 acres, how much BugNox do I need?', mockCatalogue, 'english');
  assert('Calculates 300 ml for 3 acres with 3 x 100ml bottles', acreageRes2.reply.includes('300') && acreageRes2.reply.includes('100 ml bottles:** 3'));

  // 5. Product Comparison
  const compRes = generateFallbackResponse('compare BugNox Prime and FungiClear Pro', mockCatalogue, 'english');
  assert('Comparison contains BugNox Prime and FungiClear Pro', compRes.reply.includes('BugNox Prime') && compRes.reply.includes('FungiClear Pro'));
  assert('Comparison shows side-by-side details', compRes.reply.includes('Crop:') && compRes.reply.includes('Dosage:'));
  assert('Comparison attaches both product cards', compRes.products.length === 2);

  // 6. Live Stock Inquiry
  const stockRes = generateFallbackResponse('Is BugNox Prime in stock?', mockCatalogue, 'english');
  assert('Stock inquiry shows live 50 units count', stockRes.reply.includes('50 units'));
  assert('Stock inquiry shows In Stock status', stockRes.reply.includes('In Stock'));

  // 7. Price Inquiry
  const priceRes = generateFallbackResponse('What is the price of BugNox Prime?', mockCatalogue, 'english');
  assert('Price inquiry shows 100ml price (₹288)', priceRes.reply.includes('288'));
  assert('Price inquiry mentions 5% GST', priceRes.reply.includes('5% GST'));

  // 8. Supported Crops Catalogue Question
  const cropsRes = generateFallbackResponse('What crops are supported?', mockCatalogue, 'english');
  assert('Crops inquiry lists supported crops (Cotton, Turmeric, etc.)', cropsRes.reply.includes('Cotton') && cropsRes.reply.includes('Turmeric'));

  // 9. Supported Problems / Categories Catalogue Question
  const problemsRes = generateFallbackResponse('What problems do you cover?', mockCatalogue, 'english');
  assert('Problems inquiry lists Insecticide and Fungicide', problemsRes.reply.includes('Insecticide') && problemsRes.reply.includes('Fungicide'));

  // 10. Application Method & Spray Sequence Questions
  const seqRes = generateFallbackResponse('What is spray sequence 1 and 2?', mockCatalogue, 'english');
  assert('Explains Sequence 1, 2, 3+ in crop life cycle', seqRes.reply.includes('Sequence 1') && seqRes.reply.includes('Sequence 2'));

  // 11. Incomplete Query Follow-up Prompting
  const vagueRes = generateFallbackResponse('suggest medicine', mockCatalogue, 'english');
  assert('Vague query asks which crop and problem', vagueRes.reply.includes('Which crop') && vagueRes.reply.includes('What problem'));

  // 12. Out-of-Scope Politeness
  const outOfScopeRes = generateFallbackResponse('What is the weather today?', mockCatalogue, 'english');
  assert('Out-of-scope inquiry redirects politely to agriculture', outOfScopeRes.reply.includes('dedicated') && outOfScopeRes.reply.includes('Agricultural Assistant'));

  // 13. Gratitude / Thank You
  const thanksRes = generateFallbackResponse('Thank you very much', mockCatalogue, 'english');
  assert('Thank you response is warm and mentions duty', thanksRes.reply.includes('welcome') && thanksRes.reply.includes('Duty'));

  const dhanyawadRes = generateFallbackResponse('bahut dhanyawad', mockCatalogue, 'hinglish');
  assert('Hinglish gratitude mentions Kisan Bhai & Dhanyawad', dhanyawadRes.reply.includes('dhanyawad') && dhanyawadRes.reply.includes('Kisan Bhai'));

  // 14. Capabilities / Help Request
  const helpRes = generateFallbackResponse('What can you do to help me?', mockCatalogue, 'english');
  assert('Help inquiry lists capabilities', helpRes.reply.includes('Dynamic Dosage Math') && helpRes.reply.includes('GST Invoices'));

  // 15. Typo Query Handling (e.g. "cotten products")
  const typoRes = generateFallbackResponse('cotten products', mockCatalogue, 'english');
  assert('Typo "cotten" still matches Cotton products', typoRes.reply.includes('Cotton') && typoRes.products.length > 0);

  // 16. Controller Input Validation Tests
  let badInputResStatus = null;
  let badInputPayload = null;
  const mockBadReq = { body: { message: '   ' }, ip: '127.0.0.1' };
  const mockBadRes = {
    status(code) {
      badInputResStatus = code;
      return {
        json(p) {
          badInputPayload = p;
        },
      };
    },
  };

  await handleChatMessage(mockBadReq, mockBadRes);
  assert('Rejects empty message with 400 status', badInputResStatus === 400 && badInputPayload.success === false);

  // 17. Controller Overlength Message Validation (>1000 chars)
  const mockLongReq = { body: { message: 'a'.repeat(1005) }, ip: '127.0.0.1' };
  await handleChatMessage(mockLongReq, mockBadRes);
  assert('Rejects >1000 char message with 400 status', badInputResStatus === 400);

  // 18. ProcessChatMessage with Multi-turn Context
  const processRes = await processChatMessage({
    message: 'What is the dosage of BugNox Prime?',
    context: [
      { role: 'user', text: 'Hello' },
      { role: 'assistant', text: 'Namaste! How can I help you today?' },
    ],
  });
  assert('ProcessChatMessage returns valid reply', Boolean(processRes.reply) && typeof processRes.reply === 'string');
  assert('ProcessChatMessage transparently specifies provider', Boolean(processRes.provider));

  console.log(`\n===========================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`===========================================`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
