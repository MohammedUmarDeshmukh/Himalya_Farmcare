import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dns.setServers(['8.8.8.8', '1.1.1.1']);

const User = (await import('./src/models/User.js')).default;
const Product = (await import('./src/models/Product.js')).default;
const Crop = (await import('./src/models/Crop.js')).default;
const Problem = (await import('./src/models/Problem.js')).default;
const ApplicationMethod = (await import('./src/models/ApplicationMethod.js')).default;
const Order = (await import('./src/models/Order.js')).default;

async function runDatabaseAudit() {
  console.log('=== PHASE C: DATABASE AUDIT START ===\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB host:', mongoose.connection.host);

  const results = {
    users: { count: 0, sample: null, checks: [] },
    products: { count: 0, activeCount: 0, checks: [] },
    crops: { count: 0, items: [], checks: [] },
    problems: { count: 0, items: [], checks: [] },
    methods: { count: 0, items: [], checks: [] },
    orders: { count: 0, sample: null, checks: [] },
  };

  // 1. User records audit (with +password explicitly selected)
  const users = await User.find({}).select('+password').lean();
  results.users.count = users.length;
  console.log(`Found ${users.length} user records.`);

  // Check admin user existence
  const adminUser = users.find(u => u.role === 'admin');
  if (adminUser) {
    results.users.checks.push('Admin user exists: ' + adminUser.email);
    console.log('Admin user found:', adminUser.email, 'Role:', adminUser.role);
  } else {
    results.users.checks.push('WARNING: No admin user found');
  }

  // Check password hashing (bcrypt format: starts with $2a$ or $2b$)
  let nonHashedPasswords = 0;
  for (const u of users) {
    const isHashed = typeof u.password === 'string' && (u.password.startsWith('$2a$') || u.password.startsWith('$2b$'));
    if (!isHashed) nonHashedPasswords++;
  }
  results.users.checks.push(`Password hashing check: ${users.length - nonHashedPasswords}/${users.length} passwords correctly bcrypt hashed`);
  console.log(`Password hashing check: ${users.length - nonHashedPasswords}/${users.length} passwords bcrypt hashed.`);

  // Check unique email constraints
  const emails = users.map(u => u.email.toLowerCase());
  const duplicateEmails = emails.filter((item, index) => emails.indexOf(item) !== index);
  results.users.checks.push(`Duplicate email check: ${duplicateEmails.length === 0 ? 'None (PASS)' : duplicateEmails.join(', ')}`);

  // Check saved farm addresses in users
  const usersWithAddresses = users.filter(u => Array.isArray(u.savedAddresses) && u.savedAddresses.length > 0);
  results.users.checks.push(`Users with saved farm addresses: ${usersWithAddresses.length}`);
  console.log(`Users with saved farm addresses: ${usersWithAddresses.length}`);

  // 2. Product records audit
  const products = await Product.find({}).lean();
  results.products.count = products.length;
  results.products.activeCount = products.filter(p => p.status === 'active').length;
  console.log(`Found ${products.length} products (${results.products.activeCount} active).`);

  // Check product required fields: name, crop, problem, applicationMethod, sequence, prices, stock
  let invalidProducts = 0;
  for (const p of products) {
    if (!p.name || !p.crop || !p.problem || !p.applicationMethod || p.sequence === undefined) {
      invalidProducts++;
    }
  }
  results.products.checks.push(`Product required fields check: ${products.length - invalidProducts}/${products.length} valid`);

  // Check product dosages
  const productsWithDosage = products.filter(p => p.dosagePerAcre > 0);
  results.products.checks.push(`Products with stored dosagePerAcre: ${productsWithDosage.length}/${products.length}`);
  console.log(`Products with stored dosagePerAcre: ${productsWithDosage.length}/${products.length}`);

  // Check product prices
  const productsWithPrices = products.filter(p => Array.isArray(p.prices) && p.prices.length > 0);
  results.products.checks.push(`Products with prices array: ${productsWithPrices.length}/${products.length}`);
  console.log(`Products with prices: ${productsWithPrices.length}/${products.length}`);

  // 3. Crops audit
  const crops = await Crop.find({}).lean();
  results.crops.count = crops.length;
  results.crops.items = crops.map(c => c.name);
  console.log(`Found ${crops.length} crops:`, results.crops.items.join(', '));

  // 4. Problems audit
  const problems = await Problem.find({}).lean();
  results.problems.count = problems.length;
  results.problems.items = problems.map(p => p.name);
  console.log(`Found ${problems.length} problems:`, results.problems.items.join(', '));

  // 5. Methods audit
  const methods = await ApplicationMethod.find({}).lean();
  results.methods.count = methods.length;
  results.methods.items = methods.map(m => m.name);
  console.log(`Found ${methods.length} application methods:`, results.methods.items.join(', '));

  // 6. Orders audit
  const orders = await Order.find({}).lean();
  results.orders.count = orders.length;
  console.log(`Found ${orders.length} order records.`);

  if (orders.length > 0) {
    let validRefs = 0;
    let validTotals = 0;
    for (const ord of orders) {
      if (ord.orderNumber && ord.items && ord.items.length > 0) validRefs++;
      if (typeof ord.totalAmount === 'number' && typeof ord.subtotal === 'number') validTotals++;
    }
    results.orders.checks.push(`Valid order numbers and items: ${validRefs}/${orders.length}`);
    results.orders.checks.push(`Valid financial totals: ${validTotals}/${orders.length}`);
    console.log(`Orders summary: ${validRefs}/${orders.length} valid structures.`);
  } else {
    results.orders.checks.push('No historical orders yet (empty collection)');
  }

  console.log('\n=== PHASE C DATABASE AUDIT SUMMARY ===');
  console.log(JSON.stringify(results, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

runDatabaseAudit().catch(err => {
  console.error('Database audit failed:', err);
  process.exit(1);
});
