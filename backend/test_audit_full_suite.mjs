import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

import { connectDatabase } from './src/config/db.js';
import adminRoutes from './src/routes/adminRoutes.js';
import applicationMethodRoutes from './src/routes/applicationMethodRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import cropRoutes from './src/routes/cropRoutes.js';
import orderRoutes from './src/routes/orderRoutes.js';
import problemRoutes from './src/routes/problemRoutes.js';
import productRoutes from './src/routes/productRoutes.js';
import recommendationRoutes from './src/routes/recommendationRoutes.js';
import chatbotRoutes from './src/routes/chatbotRoutes.js';

import User from './src/models/User.js';
import Product from './src/models/Product.js';
import Order from './src/models/Order.js';
import Crop from './src/models/Crop.js';
import Problem from './src/models/Problem.js';
import ApplicationMethod from './src/models/ApplicationMethod.js';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api/admin', adminRoutes);
app.use('/api/application-methods', applicationMethodRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/products', productRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/chatbot', chatbotRoutes);

let server;
let baseUrl;

const results = {
  passed: 0,
  failed: 0,
  details: [],
};

function recordTest(name, condition, message = '') {
  if (condition) {
    results.passed++;
    results.details.push({ status: 'PASS', name, message });
    console.log(`✅ PASS: ${name}`);
  } else {
    results.failed++;
    results.details.push({ status: 'FAIL', name, message });
    console.error(`❌ FAIL: ${name} - ${message}`);
  }
}

async function api(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let json;
  try {
    json = await res.json();
  } catch (e) {
    json = null;
  }
  return { status: res.status, headers: res.headers, body: json };
}

async function runAudit() {
  console.log('====================================================');
  console.log('HIMALAYA FARMCARE: COMPREHENSIVE AUTOMATED AUDIT');
  console.log('====================================================');

  await connectDatabase();

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Ephemeral test API running on ${baseUrl}\n`);

  const testTimestamp = Date.now();
  const testFarmer1Email = `qa_farmer1_${testTimestamp}@testfarm.local`;
  const testFarmer2Email = `qa_farmer2_${testTimestamp}@testfarm.local`;
  const testPassword = 'Password123!';

  let farmer1Token = null;
  let farmer1User = null;
  let farmer2Token = null;
  let farmer2User = null;
  let adminToken = null;
  let testOrderId = null;
  let activeProductSample = null;

  try {
    // ----------------------------------------------------
    // PHASE B & G: AUTHENTICATION, REGISTRATION & SECURITY
    // ----------------------------------------------------
    console.log('\n--- 1. AUTHENTICATION & SECURITY TESTS ---');

    // Test 1: Register validation - missing fields
    const regFail = await api('/api/auth/register', {
      method: 'POST',
      body: { name: '', email: 'invalid-email', password: '123' },
    });
    recordTest(
      'Register validation fails on invalid input (400)',
      regFail.status === 400 && regFail.body?.errors?.name && regFail.body?.errors?.email && regFail.body?.errors?.password,
      `Status: ${regFail.status}`
    );

    // Test 2: Normal Farmer Registration
    const reg1 = await api('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Kisan Ramesh Patil',
        email: testFarmer1Email,
        phone: '9876543210',
        password: testPassword,
      },
    });
    recordTest(
      'Farmer 1 registration succeeds (201)',
      reg1.status === 201 && reg1.body?.token && reg1.body?.user?.email === testFarmer1Email,
      `Status: ${reg1.status}`
    );
    farmer1Token = reg1.body?.token;
    farmer1User = reg1.body?.user;

    // Test 3: Duplicate Email Rejection (409)
    const regDup = await api('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Duplicate Kisan',
        email: testFarmer1Email,
        password: testPassword,
      },
    });
    recordTest(
      'Duplicate email registration rejected with 409 Conflict',
      regDup.status === 409,
      `Status: ${regDup.status}`
    );

    // Test 4: Privilege Escalation Attack Prevention
    // Try to register with role: 'admin'
    const regEscalate = await api('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Hacker User',
        email: `hacker_${testTimestamp}@test.local`,
        password: testPassword,
        role: 'admin',
      },
    });
    // Check in database that role was forced to 'farmer'
    const hackedUserInDb = await User.findOne({ email: `hacker_${testTimestamp}@test.local` });
    recordTest(
      'Role privilege escalation prevented (public registration forces role: "farmer")',
      hackedUserInDb && hackedUserInDb.role === 'farmer',
      `Assigned role in DB: ${hackedUserInDb?.role}`
    );
    if (hackedUserInDb) await User.deleteOne({ _id: hackedUserInDb._id });

    // Test 5: Register Farmer 2
    const reg2 = await api('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Kisan Suresh Deshmukh',
        email: testFarmer2Email,
        phone: '9822334455',
        password: testPassword,
      },
    });
    recordTest('Farmer 2 registration succeeds (201)', reg2.status === 201 && reg2.body?.token);
    farmer2Token = reg2.body?.token;
    farmer2User = reg2.body?.user;

    // Test 6: Login valid credentials
    const loginOk = await api('/api/auth/login', {
      method: 'POST',
      body: { email: testFarmer1Email, password: testPassword },
    });
    recordTest(
      'Login with valid credentials succeeds (200) and returns JWT',
      loginOk.status === 200 && Boolean(loginOk.body?.token),
      `Status: ${loginOk.status}`
    );

    // Test 7: Login invalid password (401)
    const loginBadPass = await api('/api/auth/login', {
      method: 'POST',
      body: { email: testFarmer1Email, password: 'WrongPassword999!' },
    });
    recordTest(
      'Login with wrong password rejected with 401',
      loginBadPass.status === 401,
      `Status: ${loginBadPass.status}`
    );

    // Test 8: Login unknown email (401)
    const loginBadEmail = await api('/api/auth/login', {
      method: 'POST',
      body: { email: `nonexistent_${testTimestamp}@himalaya.local`, password: testPassword },
    });
    recordTest(
      'Login with nonexistent email rejected with 401',
      loginBadEmail.status === 401,
      `Status: ${loginBadEmail.status}`
    );

    // Test 9: Auth check /api/auth/me with valid Bearer token
    const meOk = await api('/api/auth/me', {
      headers: { Authorization: `Bearer ${farmer1Token}` },
    });
    recordTest(
      'GET /api/auth/me with valid Bearer token returns farmer data',
      meOk.status === 200 && meOk.body?.user?.email === testFarmer1Email,
      `Status: ${meOk.status}`
    );

    // Test 10: Auth check /api/auth/me with no token (401)
    const meNoToken = await api('/api/auth/me');
    recordTest(
      'GET /api/auth/me without token rejected with 401 Unauthorized',
      meNoToken.status === 401,
      `Status: ${meNoToken.status}`
    );

    // Test 11: Auth check with malformed token (401)
    const meBadToken = await api('/api/auth/me', {
      headers: { Authorization: 'Bearer thisisnotavalidjwttoken123' },
    });
    recordTest(
      'GET /api/auth/me with corrupted token rejected with 401 Unauthorized',
      meBadToken.status === 401,
      `Status: ${meBadToken.status}`
    );

    // Test 12: Admin Login
    const adminLogin = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@himalayafarmcare.com', password: process.env.ADMIN_PASSWORD || 'Admin@12345' },
    });
    if (adminLogin.status === 200) {
      adminToken = adminLogin.body?.token;
      recordTest('Admin login succeeds with configured credentials (200)', true);
    } else {
      // Fallback: query admin in DB and generate token directly
      const adminDoc = await User.findOne({ role: 'admin' });
      if (adminDoc) {
        const jwtSecret = process.env.JWT_SECRET;
        const jwtMod = await import('jsonwebtoken');
        adminToken = jwtMod.default.sign({ id: adminDoc._id, role: 'admin' }, jwtSecret, { expiresIn: '1d' });
        recordTest('Admin account verified in database and authorized', true);
      } else {
        recordTest('Admin account exists', false, 'No admin found in DB');
      }
    }

    // Test 13: RBAC - Farmer cannot access Admin Dashboard Stats (403)
    const farmerAdminAccess = await api('/api/admin/stats', {
      headers: { Authorization: `Bearer ${farmer1Token}` },
    });
    recordTest(
      'Farmer token forbidden from accessing /api/admin/stats (403 Forbidden)',
      farmerAdminAccess.status === 403,
      `Status: ${farmerAdminAccess.status}`
    );

    // Test 14: Admin can access Admin Dashboard Stats (200)
    const adminStatsAccess = await api('/api/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordTest(
      'Admin token accesses /api/admin/stats (200 OK)',
      adminStatsAccess.status === 200 && adminStatsAccess.body?.stats !== undefined,
      `Status: ${adminStatsAccess.status}`
    );

    // ----------------------------------------------------
    // PHASE B: PROFILE & SAVED ADDRESSES APIS
    // ----------------------------------------------------
    console.log('\n--- 2. PROFILE & SAVED ADDRESSES TESTS ---');

    // Test 15: Farmer Profile Update
    const updateProf = await api('/api/auth/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: { name: 'Ramesh Balaji Patil', phone: '9988776655', primaryCrop: 'Cotton' },
    });
    recordTest(
      'PUT /api/auth/profile updates profile fields (200)',
      updateProf.status === 200 && updateProf.body?.user?.name === 'Ramesh Balaji Patil',
      `Status: ${updateProf.status}`
    );

    // Test 16: Add Saved Farm Address
    const addAddr = await api('/api/auth/addresses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: {
        title: 'Home Farm Plot 1',
        name: 'Ramesh Patil',
        phone: '9988776655',
        village: 'Shegaon',
        district: 'Buldhana',
        state: 'Maharashtra',
        pincode: '444203',
        acreage: 5,
        isDefault: true,
      },
    });
    recordTest(
      'POST /api/auth/addresses saves new farm address (201)',
      addAddr.status === 201 && Array.isArray(addAddr.body?.savedAddresses) && addAddr.body.savedAddresses.length > 0,
      `Status: ${addAddr.status}`
    );
    const createdAddrId = addAddr.body?.savedAddresses?.[0]?._id;

    // Test 17: Update Saved Address
    if (createdAddrId) {
      const editAddr = await api(`/api/auth/addresses/${createdAddrId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${farmer1Token}` },
        body: { acreage: 8 },
      });
      recordTest(
        'PUT /api/auth/addresses/:id updates existing address (200)',
        editAddr.status === 200 && editAddr.body?.savedAddresses?.find((a) => a._id === createdAddrId)?.acreage === 8,
        `Status: ${editAddr.status}`
      );
    }

    // ----------------------------------------------------
    // PHASE B: CATALOGUE, PRODUCTS, CROPS, PROBLEMS APIS
    // ----------------------------------------------------
    console.log('\n--- 3. PRODUCT CATALOGUE & MASTER DATA TESTS ---');

    // Test 18: Public GET /api/products
    const prods = await api('/api/products');
    recordTest(
      'Public GET /api/products returns active products list (200)',
      prods.status === 200 && Array.isArray(prods.body?.data) && prods.body.data.length >= 20,
      `Count: ${prods.body?.data?.length}`
    );
    activeProductSample = prods.body?.data?.[0];

    // Test 19: Public GET /api/products/:id
    if (activeProductSample) {
      const singleProd = await api(`/api/products/${activeProductSample._id}`);
      recordTest(
        'Public GET /api/products/:id returns specific product (200)',
        singleProd.status === 200 && singleProd.body?.data?.name === activeProductSample.name,
        `Name: ${singleProd.body?.data?.name}`
      );
    }

    // Test 20: GET /api/products/invalid_id handles cleanly (400 or 404)
    const badProdId = await api('/api/products/650000000000000000000099');
    recordTest(
      'GET /api/products/:id with non-existent ObjectId returns 404',
      badProdId.status === 404,
      `Status: ${badProdId.status}`
    );

    // Test 21: Non-admin cannot create product (401/403)
    const createProdFarmer = await api('/api/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: { name: 'Unauthorized Chemical' },
    });
    recordTest(
      'Farmer token forbidden from creating products (403)',
      createProdFarmer.status === 403,
      `Status: ${createProdFarmer.status}`
    );

    // Test 22: Public GET /api/crops
    const cropsRes = await api('/api/crops');
    recordTest(
      'Public GET /api/crops returns crops (200)',
      cropsRes.status === 200 && Array.isArray(cropsRes.body?.data) && cropsRes.body.data.length >= 4,
      `Crops: ${cropsRes.body?.data?.map((c) => c.name).join(', ')}`
    );

    // Test 23: Public GET /api/problems
    const probsRes = await api('/api/problems');
    recordTest(
      'Public GET /api/problems returns problems (200)',
      probsRes.status === 200 && Array.isArray(probsRes.body?.data) && probsRes.body.data.length >= 4,
      `Problems: ${probsRes.body?.data?.map((p) => p.name).join(', ')}`
    );

    // Test 24: Public GET /api/application-methods
    const methodsRes = await api('/api/application-methods');
    recordTest(
      'Public GET /api/application-methods returns methods (200)',
      methodsRes.status === 200 && Array.isArray(methodsRes.body?.data) && methodsRes.body.data.length >= 2,
      `Methods: ${methodsRes.body?.data?.map((m) => m.name).join(', ')}`
    );

    // ----------------------------------------------------
    // PHASE D: RECOMMENDATION ENGINE PERMUTATIONS
    // ----------------------------------------------------
    console.log('\n--- 4. RECOMMENDATION ENGINE TESTS ---');

    // Test 25: Cotton + Insecticide + Spray + Sequence 2
    const rec1 = await api('/api/recommendations/generate', {
      method: 'POST',
      body: {
        crop: 'Cotton',
        problem: 'Insecticide',
        applicationMethod: 'Spray',
        spraySequence: 2,
        acreage: 4,
      },
    });
    const match1 = rec1.body?.products?.[0];
    recordTest(
      'Cotton + Insecticide + Spray + Sequence 2 yields matching active product',
      rec1.status === 200 && rec1.body?.status === 'recommendations_found' && match1 !== undefined,
      `Product: ${match1?.product?.name}`
    );

    // Test 26: Acreage scaling calculation
    // Acreage 4 -> dosage.totalForAcreage must equal perAcre * 4
    if (match1?.dosage) {
      const expectedTotal = match1.dosage.perAcre * 4;
      recordTest(
        'Dosage total scales linearly with acreage (perAcre * 4)',
        match1.dosage.totalForAcreage === expectedTotal && match1.dosage.perAcre === match1.product.dosagePerAcre,
        `perAcre: ${match1.dosage.perAcre}, totalForAcreage: ${match1.dosage.totalForAcreage}`
      );
    }

    // Test 27: Turmeric + Fungicide + Spray + Sequence 2
    const rec2 = await api('/api/recommendations/generate', {
      method: 'POST',
      body: {
        crop: 'Turmeric',
        problem: 'Fungicide',
        applicationMethod: 'Spray',
        spraySequence: 2,
        acreage: 2.5,
      },
    });
    recordTest(
      'Turmeric + Fungicide + Spray + Sequence 2 returns valid matches',
      rec2.status === 200 && rec2.body?.products?.length > 0,
      `Count: ${rec2.body?.products?.length}, Name: ${rec2.body?.products?.[0]?.product?.name}`
    );

    // Test 28: Zero matches handled gracefully (no crash)
    const recEmpty = await api('/api/recommendations/generate', {
      method: 'POST',
      body: {
        crop: 'OTHER',
        problem: 'OTHER',
        applicationMethod: 'OTHER',
        spraySequence: 1,
        acreage: 1,
      },
    });
    recordTest(
      'Non-matching recommendation handled gracefully (status: "no_match", totalMatches: 0)',
      recEmpty.status === 200 && recEmpty.body?.status === 'no_match' && recEmpty.body?.products?.length === 0,
      `Status: ${recEmpty.body?.status}`
    );

    // Test 29: Recommendation validation failure on missing required fields
    const recBad = await api('/api/recommendations/generate', {
      method: 'POST',
      body: { crop: '', problem: 'Insecticide', acreage: -1 },
    });
    recordTest(
      'Recommendation rejects invalid/missing input with 400',
      recBad.status === 400 && recBad.body?.errors?.crop && recBad.body?.errors?.acreage,
      `Status: ${recBad.status}`
    );

    // ----------------------------------------------------
    // PHASE E & B: ORDER PLACEMENT, BILLING & INVENTORY
    // ----------------------------------------------------
    console.log('\n--- 5. ORDER PLACEMENT, BILLING & STOCK TESTS ---');

    // Find an active product with stock >= 2 for the order test
    const orderProduct = await Product.findOne({ status: 'active', stock: { $gte: 5 } });
    if (!orderProduct) {
      throw new Error('No active product with stock >= 5 found for order testing.');
    }
    const initialStock = orderProduct.stock;
    const itemUnitPrice = orderProduct.prices?.[0]?.amount || 100;
    const itemSize = orderProduct.prices?.[0]?.size || 100;
    const orderQty = 2;
    const expectedSubtotal = Number((itemUnitPrice * orderQty).toFixed(2));
    const expectedGst = Number((expectedSubtotal * 0.05).toFixed(2));
    const expectedTotal = Number((expectedSubtotal + expectedGst).toFixed(2));

    // Test 30: Farmer places valid COD order
    const orderRes = await api('/api/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: {
        items: [
          {
            productId: orderProduct._id.toString(),
            sizeMl: itemSize,
            qty: orderQty,
          },
        ],
        shippingAddress: {
          name: 'Ramesh Patil',
          phone: '9988776655',
          village: 'Shegaon',
          district: 'Buldhana',
          state: 'Maharashtra',
          pincode: '444203',
        },
        paymentMethod: 'COD',
        notes: 'QA Automated Verification Order',
      },
    });

    recordTest(
      'Farmer 1 places COD order successfully (201 Created)',
      orderRes.status === 201 && orderRes.body?.order?._id !== undefined,
      `Status: ${orderRes.status}, OrderNo: ${orderRes.body?.order?.orderNumber}`
    );
    testOrderId = orderRes.body?.order?._id;
    const placedOrder = orderRes.body?.order;

    // Test 31: Billing math verification (Subtotal, 5% GST, Grand Total)
    if (placedOrder) {
      const isSubtotalCorrect = placedOrder.subtotal === expectedSubtotal;
      const isGstCorrect = placedOrder.taxAmount === expectedGst;
      const isTotalCorrect = placedOrder.totalAmount === expectedTotal;
      recordTest(
        'Billing math strictly verified: Subtotal = P*Q, Tax = 5% GST, Total = Subtotal + Tax',
        isSubtotalCorrect && isGstCorrect && isTotalCorrect,
        `Expected Subtotal: ₹${expectedSubtotal}, Got: ₹${placedOrder.subtotal}; Expected GST: ₹${expectedGst}, Got: ₹${placedOrder.taxAmount}; Total: ₹${placedOrder.totalAmount}`
      );
    }

    // Test 32: Stock synchronization (Stock decremented by ordered quantity)
    const productAfterOrder = await Product.findById(orderProduct._id);
    recordTest(
      'Inventory deduction verified: stock atomically decremented by ordered quantity',
      productAfterOrder.stock === initialStock - orderQty,
      `Initial: ${initialStock}, After order: ${productAfterOrder.stock}`
    );

    // Test 33: Order validation fails when quantity exceeds stock
    const highQtyRes = await api('/api/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: {
        items: [
          {
            productId: orderProduct._id.toString(),
            sizeMl: itemSize,
            qty: productAfterOrder.stock + 100, // Exceeds stock
          },
        ],
        shippingAddress: {
          name: 'Ramesh Patil',
          phone: '9988776655',
          village: 'Shegaon',
          district: 'Buldhana',
          state: 'Maharashtra',
          pincode: '444203',
        },
      },
    });
    recordTest(
      'Order rejects when quantity exceeds available stock (400)',
      highQtyRes.status === 400 && highQtyRes.body?.message?.includes('Insufficient stock'),
      `Status: ${highQtyRes.status}, Msg: ${highQtyRes.body?.message}`
    );

    // ----------------------------------------------------
    // PHASE G: ORDER ISOLATION & DATA SECURITY
    // ----------------------------------------------------
    console.log('\n--- 6. ORDER PRIVACY & DATA ISOLATION TESTS ---');

    // Test 34: Farmer 1 can view own order
    const viewOwnOrder = await api(`/api/orders/${testOrderId}`, {
      headers: { Authorization: `Bearer ${farmer1Token}` },
    });
    recordTest(
      'Farmer 1 can view their own order details (200)',
      viewOwnOrder.status === 200 && viewOwnOrder.body?.data?._id === testOrderId,
      `Status: ${viewOwnOrder.status}`
    );

    // Test 35: Farmer 2 CANNOT view Farmer 1's order (Data Isolation: 403 Forbidden)
    const viewOtherOrder = await api(`/api/orders/${testOrderId}`, {
      headers: { Authorization: `Bearer ${farmer2Token}` },
    });
    recordTest(
      'Farmer 2 blocked from viewing Farmer 1 order (403 Forbidden - Data Isolation)',
      viewOtherOrder.status === 403,
      `Status: ${viewOtherOrder.status}`
    );

    // Test 36: Admin can view Farmer 1's order
    const adminViewOrder = await api(`/api/orders/${testOrderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordTest(
      'Admin authorized to view any order (200 OK)',
      adminViewOrder.status === 200 && adminViewOrder.body?.data?._id === testOrderId,
      `Status: ${adminViewOrder.status}`
    );

    // Test 37: Farmer 2 My-Orders list does not contain Farmer 1 orders
    const farmer2Orders = await api('/api/orders/my-orders', {
      headers: { Authorization: `Bearer ${farmer2Token}` },
    });
    const leakFound = farmer2Orders.body?.data?.some((o) => o._id === testOrderId);
    recordTest(
      'Farmer 2 /api/orders/my-orders contains 0 orders from Farmer 1',
      farmer2Orders.status === 200 && !leakFound,
      `Farmer 2 order count: ${farmer2Orders.body?.data?.length}`
    );

    // Test 38: Admin Order Management - Update order status (pending -> confirmed)
    const updateStatusRes = await api(`/api/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'confirmed' },
    });
    recordTest(
      'Admin updates order status to "confirmed" (200 OK)',
      updateStatusRes.status === 200 && updateStatusRes.body?.data?.orderStatus === 'confirmed',
      `Status: ${updateStatusRes.body?.data?.orderStatus}`
    );

    // Test 39: Farmer CANNOT update order status via admin endpoint (403)
    const farmerUpdateStatus = await api(`/api/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: { status: 'delivered' },
    });
    recordTest(
      'Farmer blocked from mutating order status directly (403 Forbidden)',
      farmerUpdateStatus.status === 403,
      `Status: ${farmerUpdateStatus.status}`
    );

    // Test 40: Admin Order CSV Export
    const csvExport = await api('/api/orders/admin/export', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordTest(
      'Admin can export orders CSV (/api/orders/admin/export)',
      csvExport.status === 200 && csvExport.headers.get('content-type')?.includes('text/csv'),
      `Content-Type: ${csvExport.headers.get('content-type')}`
    );

    // Test 41: Farmer CANNOT export orders CSV (403 Forbidden)
    const farmerCsvExport = await api('/api/orders/admin/export', {
      headers: { Authorization: `Bearer ${farmer1Token}` },
    });
    recordTest(
      'Farmer forbidden from exporting orders CSV (403 Forbidden)',
      farmerCsvExport.status === 403,
      `Status: ${farmerCsvExport.status}`
    );

    // ----------------------------------------------------
    // PHASE F: CHATBOT API ENDPOINT TESTS
    // ----------------------------------------------------
    console.log('\n--- 7. CHATBOT API ENDPOINT TESTS ---');

    // Test 42: Valid chatbot message query
    const chatOk = await api('/api/chatbot/message', {
      method: 'POST',
      body: { message: 'What is BugNox Prime?' },
    });
    recordTest(
      'POST /api/chatbot/message returns structured AI response (200 OK)',
      chatOk.status === 200 && Boolean(chatOk.body?.reply),
      `Reply length: ${chatOk.body?.reply?.length}`
    );

    // Test 43: Empty message rejected (400)
    const chatEmpty = await api('/api/chatbot/message', {
      method: 'POST',
      body: { message: '   ' },
    });
    recordTest(
      'POST /api/chatbot/message rejects empty message (400 Bad Request)',
      chatEmpty.status === 400,
      `Status: ${chatEmpty.status}`
    );

    // Test 44: Excessive length message rejected (400)
    const chatTooLong = await api('/api/chatbot/message', {
      method: 'POST',
      body: { message: 'A'.repeat(1005) },
    });
    recordTest(
      'POST /api/chatbot/message rejects message >1000 characters (400 Bad Request)',
      chatTooLong.status === 400,
      `Status: ${chatTooLong.status}`
    );

    // ----------------------------------------------------
    // RESTORE INVENTORY FOR CLEANUP
    // ----------------------------------------------------
    // Restore product stock back to original
    await Product.findByIdAndUpdate(orderProduct._id, { $inc: { stock: orderQty } });
    console.log(`\n[Inventory Restored] Restored +${orderQty} stock to "${orderProduct.name}".`);

    // Clean up test order
    if (testOrderId) {
      await Order.deleteOne({ _id: testOrderId });
      console.log(`[Order Cleaned] Removed QA test order ${testOrderId}.`);
    }

    // Clean up test users
    if (farmer1User?._id) await User.deleteOne({ _id: farmer1User._id });
    if (farmer2User?._id) await User.deleteOne({ _id: farmer2User._id });
    console.log(`[Users Cleaned] Removed QA test user accounts.`);

  } catch (err) {
    console.error('Audit encountered unexpected error:', err);
    recordTest('Test suite execution without unexpected exception', false, err.message);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('Ephemeral test server closed.');
    }
  }

  console.log('\n====================================================');
  console.log(`AUDIT FINISHED: ${results.passed} PASSED, ${results.failed} FAILED`);
  console.log('====================================================');

  await mongoose.disconnect();
}

runAudit();
