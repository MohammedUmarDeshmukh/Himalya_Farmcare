import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from './src/config/db.js';
import {
  processChatMessage,
  detectLanguage,
  generateFallbackResponse,
  getCatalogueContext,
} from './src/services/chatbotService.js';

dotenv.config();

console.log('====================================================');
console.log('GEMINI INTEGRATION, FALLBACK & MULTILINGUAL TEST');
console.log('====================================================');

let passed = 0;
let failed = 0;

function assert(condition, name, detail = '') {
  if (condition) {
    passed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    failed++;
    console.error(`❌ FAIL: ${name} ${detail ? `(${detail})` : ''}`);
  }
}

async function runTests() {
  await connectDatabase();
  console.log('Database connected successfully.\n');

  console.log(`Configured AI_MODEL: "${process.env.AI_MODEL}"\n`);

  // ----------------------------------------------------
  // TEST 1: REAL GEMINI API CALL (English)
  // ----------------------------------------------------
  console.log('--- 1. REAL GEMINI API CALL (English) ---');
  try {
    const enRes = await processChatMessage({
      message: 'What is BugNox Prime and what crop is it used for?',
    });

    assert(
      Boolean(enRes.reply) && enRes.reply.length > 20,
      'Gemini API returns non-empty reply for English query'
    );
    assert(
      enRes.provider === 'gemini-ai',
      'Response provider is "gemini-ai" (real API success)',
      `Provider: ${enRes.provider}`
    );
    assert(
      enRes.language === 'english',
      'Detected language is "english"',
      `Language: ${enRes.language}`
    );
    assert(
      enRes.reply.toLowerCase().includes('bugnox') || enRes.reply.toLowerCase().includes('cotton'),
      'Reply contains grounded product information (BugNox / Cotton)'
    );
    console.log('Gemini English Response Sample:\n', enRes.reply.substring(0, 220) + '...\n');
  } catch (err) {
    assert(false, 'Real Gemini API Call (English)', err.message);
  }

  // ----------------------------------------------------
  // TEST 2: REAL GEMINI API CALL (Hinglish)
  // ----------------------------------------------------
  console.log('--- 2. REAL GEMINI API CALL (Hinglish) ---');
  try {
    const hingRes = await processChatMessage({
      message: 'Cotton ke liye kaun sa insecticide hai aur kitna dosage chahiye?',
    });

    assert(
      Boolean(hingRes.reply) && hingRes.reply.length > 20,
      'Gemini API returns non-empty reply for Hinglish query'
    );
    assert(
      hingRes.language === 'hinglish',
      'Detected language is "hinglish"',
      `Language: ${hingRes.language}`
    );
    assert(
      hingRes.provider === 'gemini-ai' || hingRes.provider === 'database-fallback',
      'Valid provider response received'
    );
    console.log('Gemini Hinglish Response Sample:\n', hingRes.reply.substring(0, 220) + '...\n');
  } catch (err) {
    assert(false, 'Real Gemini API Call (Hinglish)', err.message);
  }

  // ----------------------------------------------------
  // TEST 3: REAL GEMINI API CALL (Hindi Devanagari)
  // ----------------------------------------------------
  console.log('--- 3. REAL GEMINI API CALL (Hindi) ---');
  try {
    const hiRes = await processChatMessage({
      message: 'कपास की फसल के लिए कीटनाशक दवा कौन सी है?',
    });

    assert(
      Boolean(hiRes.reply) && hiRes.reply.length > 20,
      'Gemini API returns non-empty reply for Hindi query'
    );
    assert(
      hiRes.language === 'hindi',
      'Detected language is "hindi"',
      `Language: ${hiRes.language}`
    );
    console.log('Gemini Hindi Response Sample:\n', hiRes.reply.substring(0, 220) + '...\n');
  } catch (err) {
    assert(false, 'Real Gemini API Call (Hindi)', err.message);
  }

  // ----------------------------------------------------
  // TEST 4: DATABASE-BACKED FALLBACK VERIFICATION
  // ----------------------------------------------------
  console.log('--- 4. DATABASE FALLBACK WHEN GEMINI IS UNAVAILABLE ---');
  const originalKey = process.env.GEMINI_API_KEY;
  try {
    // Temporarily point to invalid key to simulate API error
    process.env.GEMINI_API_KEY = 'invalid_dummy_key_for_fallback_test';

    const fallbackRes = await processChatMessage({
      message: 'BugNox Prime ka price kya hai?',
    });

    assert(
      fallbackRes.provider === 'database-fallback',
      'System seamlessly triggers "database-fallback" when API key is invalid',
      `Provider: ${fallbackRes.provider}`
    );
    assert(
      Boolean(fallbackRes.reply) && fallbackRes.reply.includes('BugNox Prime'),
      'Fallback response includes accurate product name and details'
    );
    assert(
      Array.isArray(fallbackRes.products) && fallbackRes.products.length > 0,
      'Fallback response attaches matching product cards from MongoDB'
    );
    console.log('Database Fallback Response Sample:\n', fallbackRes.reply.substring(0, 220) + '...\n');
  } catch (err) {
    assert(false, 'Database Fallback Verification', err.message);
  } finally {
    process.env.GEMINI_API_KEY = originalKey;
  }

  // ----------------------------------------------------
  // TEST 5: TIMEOUT & SAFETY HANDLING
  // ----------------------------------------------------
  console.log('--- 5. TIMEOUT & SAFETY HANDLING ---');
  try {
    // Test empty message rejection
    let emptyError = false;
    try {
      await processChatMessage({ message: '' });
    } catch (e) {
      emptyError = true;
    }
    assert(emptyError, 'processChatMessage rejects empty message with Error');

    // Test non-string message rejection
    let nonStringError = false;
    try {
      await processChatMessage({ message: 12345 });
    } catch (e) {
      nonStringError = true;
    }
    assert(nonStringError, 'processChatMessage rejects non-string message with Error');
  } catch (err) {
    assert(false, 'Timeout & Safety Handling', err.message);
  }

  console.log('\n====================================================');
  console.log(`FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  await mongoose.disconnect();
}

runTests();
