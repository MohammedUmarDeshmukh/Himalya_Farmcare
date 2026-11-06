import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Crop from '../models/Crop.js';
import Problem from '../models/Problem.js';
import ApplicationMethod from '../models/ApplicationMethod.js';

// Detect query language: 'hindi' (Devanagari), 'hinglish' (Roman Hindi), or 'english'
export function detectLanguage(text = '') {
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hindi';
  }

  const hinglishPatterns = [
    /\b(kya|hai|hain|kaise|karein|kare|batao|bataiye|chahiye|kitna|kitni|mein|ke|liye|mujhe|mera|meri|fasal|kheti|dawai|keede|khatam|milega|hoga|kahan|kaunsa|kaunse|karo|nahi|dawa|kripya|namaste|pranam|ram\s*ram|dhanyawad|shukriya|shukriyaa|madad|bigha|ekad|daam|bhav)\b/i,
  ];

  for (const regex of hinglishPatterns) {
    if (regex.test(text)) return 'hinglish';
  }

  return 'english';
}

// Normalize common phonetic agricultural typos and variations
export function normalizeQuery(query = '') {
  let q = query.toLowerCase().trim();

  // Common spelling corrections
  q = q.replace(/\bcotten\b/g, 'cotton');
  q = q.replace(/\bturmaric\b/g, 'turmeric');
  q = q.replace(/\bhaldi\b/g, 'turmeric');
  q = q.replace(/\bmakka\b|\bmakai\b/g, 'corn');
  q = q.replace(/\bsoya\b|\bsoyabean\b/g, 'soyabean');
  q = q.replace(/\bgehu\b|\bgenhu\b/g, 'wheat');
  q = q.replace(/\bganna\b/g, 'sugarcane');
  q = q.replace(/\bdhan\b|\bchawal\b/g, 'rice');
  q = q.replace(/\binsektiside\b|\binsectiside\b/g, 'insecticide');
  q = q.replace(/\bfungiside\b/g, 'fungicide');
  q = q.replace(/\bbug\s*nox\b/g, 'bugnox');

  return q;
}

// Fetch active catalogue data from MongoDB for real-time grounding
export async function getCatalogueContext() {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return { products: [], crops: [], problems: [], methods: [] };
  }

  try {
    const [products, crops, problems, methods] = await Promise.all([
      Product.find({ status: 'active' })
        .select('name brand company crop problem applicationMethod sequence dosagePerAcre dosageUnit prices stock description')
        .lean(),
      Crop.find({ status: 'active' }).select('name description slug').lean(),
      Problem.find({ status: 'active' }).select('name description slug').lean(),
      ApplicationMethod.find({ status: 'active' }).select('name description slug').lean(),
    ]);

    return { products, crops, problems, methods };
  } catch (err) {
    console.error('Failed to fetch catalogue context for chatbot:', err.message);
    return { products: [], crops: [], problems: [], methods: [] };
  }
}

// Find matching products based on text keywords with typo tolerance
export function findMatchingProducts(query, products) {
  const q = normalizeQuery(query);
  const matched = [];

  for (const p of products) {
    const pName = p.name ? p.name.toLowerCase() : '';
    const pCrop = p.crop ? p.crop.toLowerCase() : '';
    const pProb = p.problem ? p.problem.toLowerCase() : '';
    const pBrand = p.brand ? p.brand.toLowerCase() : '';

    const nameMatch = pName && (q.includes(pName) || pName.split(' ').some((word) => word.length > 3 && q.includes(word)));
    const cropMatch = pCrop && q.includes(pCrop);
    const probMatch = pProb && q.includes(pProb);
    const brandMatch = pBrand && q.includes(pBrand);

    if (nameMatch || (cropMatch && probMatch) || (cropMatch && (q.includes('product') || q.includes('dawa') || q.includes('medicine')))) {
      matched.push(p);
    }
  }

  // If crop specific query (e.g. "Cotton products" or "Turmeric")
  if (matched.length === 0) {
    for (const p of products) {
      if (p.crop && q.includes(p.crop.toLowerCase())) {
        matched.push(p);
      }
    }
  }

  // If problem specific query (e.g. "Insecticide" or "Fungicide")
  if (matched.length === 0) {
    for (const p of products) {
      if (p.problem && q.includes(p.problem.toLowerCase())) {
        matched.push(p);
      }
    }
  }

  return matched.slice(0, 6);
}

// Format product details for UI cards
export function formatProductCard(p) {
  const p100 = p.prices?.find((pr) => pr.size === 100)?.amount;
  const p500 = p.prices?.find((pr) => pr.size === 500)?.amount;

  return {
    id: p._id || p.id,
    name: p.name,
    crop: p.crop,
    problem: p.problem,
    method: p.applicationMethod,
    dosagePerAcre: p.dosagePerAcre,
    dosageUnit: p.dosageUnit || 'ml',
    p100: p100 !== undefined ? p100 : null,
    p500: p500 !== undefined ? p500 : null,
    stock: p.stock ?? 50,
  };
}

// Extract acreage number from farmer query
export function extractAcreage(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:acres?|ekad|एकड़|एकड|ac\b)/i) ||
                text.match(/for\s+(\d+(?:\.\d+)?)\s*(?:acres?|ekad|एकड़)/i) ||
                text.match(/(\d+(?:\.\d+)?)\s*acre/i);
  if (match) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val > 0 && val <= 500) {
      return val;
    }
  }
  return null;
}

/**
 * Intelligent Rule-based NLP Engine (Database Grounded Fallback)
 * Powered strictly by live MongoDB data and robust multi-intent parsing
 */
export function generateFallbackResponse(query, catalogue, lang) {
  const original = query.trim();
  const q = normalizeQuery(original);
  const { products, crops, problems, methods } = catalogue;

  // 1. Gratitude / Thank You (English, Hindi, Hinglish)
  if (/\b(thank you|thanks|dhanyawad|dhanyavaad|shukriya|shukriyaa|bahut dhanyawad|thanks a lot)\b/i.test(q)) {
    if (lang === 'hindi') {
      return {
        reply: `आपका बहुत-बहुत धन्यवाद किसान भाई! 🙏 "आपकी खेती की सेवा हमारा कर्तव्य है"। यदि आपको फसलों, दवाओं या ऑर्डर के संबंध में कोई अन्य सहायता चाहिए, तो कभी भी पूछें। आपका दिन और फसल शुभ हो!`,
        products: [],
      };
    }
    if (lang === 'hinglish') {
      return {
        reply: `Bahut-bahut dhanyawad Kisan Bhai! 🙏 "Serving Your Farm Is Our Duty". Agar aapko kisi bhi crop, dawai, dosage ya order ke baare mein aur sawal ho, toh bejhijhak poochhein. Happy farming!`,
        products: [],
      };
    }
    return {
      reply: `You are very welcome! 🙏 "Serving Your Farm Is Our Duty." If you ever need further assistance with your crops, dosages, or orders, Himalaya FarmCare is always here to help. Wishing you a bountiful harvest!`,
      products: [],
    };
  }

  // 2. Greetings (English, Hindi, Hinglish)
  if (/^(hi|hello|hey|namaste|namaskar|नमस्ते|नमस्कार|प्रणाम|राम\s*राम|kese ho|kaise ho|greetings|good\s*(morning|afternoon|evening))/i.test(q)) {
    if (lang === 'hindi') {
      return {
        reply: `नमस्ते किसान भाई! 🙏 हिमालय फार्मकेयर (Himalaya FarmCare) के कृषि सहायक में आपका स्वागत है। "आपकी खेती की सेवा हमारा कर्तव्य है"।\n\nमैं फसलों (कपास, हल्दी, मक्का, सोयाबीन), उत्पादों की जानकारी, दवा की खुराक (Dosage), ऑर्डर और वेबसाइट के उपयोग में आपकी सहायता कर सकता हूँ। बताएं, आज मैं आपकी क्या सेवा करूँ?`,
        products: [],
      };
    }
    if (lang === 'hinglish') {
      return {
        reply: `Namaste Kisan Bhai! 🙏 Himalaya FarmCare ke Agriculture Assistant mein aapka swagat hai. "Serving Your Farm Is Our Duty".\n\nMain crops (Cotton, Turmeric, Corn, Soyabean), agriculture products, dosage calculation, orders aur website features mein aapki madad kar sakta hoon. Aap kis baare mein jaanna chahte hain?`,
        products: [],
      };
    }
    return {
      reply: `Hello and welcome to Himalaya FarmCare Assistant! 🙏 "Serving Your Farm Is Our Duty".\n\nI can assist you with crop protection products, verified dosage information, smart recommendations, order placement, and order tracking. How can I assist your farm today?`,
      products: [],
    };
  }

  // 3. Capabilities / Help Request
  if (/(what can you do|how can you help|help me|kya kar sakte ho|kya madad|kaise madad|features|capabilities|what do you do)/i.test(q)) {
    if (lang === 'hindi') {
      return {
        reply: `**मैं इन कार्यों में आपकी सहायता कर सकता हूँ:**\n• **उत्पादों की जानकारी:** कपास, हल्दी, मक्का आदि के लिए कीटनाशक और फफूंदनाशक।\n• **खुराक गणक (Dosage Math):** अपनी जमीन (Acres) बताएं, मैं आवश्यक मिलीलीटर और बोतलों की संख्या निकालूँगा।\n• **स्मार्ट सिफारिश:** अपनी फसल और समस्या के अनुसार चरणबद्ध स्प्रे योजना।\n• **ऑर्डर और ट्रैकिंग:** Cash on Delivery पर ऑर्डर करना और लाइव डिलीवरी स्टेटस देखना।\n• **आधिकारिक बिल:** 5% GST सहित रसीद डाउनलोड और प्रिंट करना।\n\nआप किसी भी समय हिंदी, हिंग्लिश या अंग्रेजी में पूछ सकते हैं!`,
        products: [],
      };
    }
    if (lang === 'hinglish') {
      return {
        reply: `**Main in cheezon mein aapki help kar sakta hoon:**\n• **Product Details:** Cotton, Turmeric, Corn ke liye Insecticides, Fungicides aur PGRs.\n• **Dosage Calculation:** Apne acres batayein, main exact ml aur bottles count calculate karunga.\n• **Smart Recommendation:** Crop aur problem ke mutabik sequenced spray plan.\n• **Order & Tracking:** Cash on Delivery (COD) order place karna aur My Orders mein live tracking.\n• **GST Invoice:** 5% GST official bill download aur print karna.\n\nAap bejhijhak koi bhi sawal pooch sakte hain!`,
        products: [],
      };
    }
    return {
      reply: `**Here is how I can assist your farm:**\n• **Product Catalogue:** Verified insecticides, fungicides, and PGRs for Cotton, Turmeric, Corn, Soyabean, and more.\n• **Dynamic Dosage Math:** Tell me your farm acreage (e.g. "How much for 5 acres?"), and I will calculate the exact milliliters and bottle count.\n• **Smart Recommendation:** Generate custom sequenced application plans.\n• **Order Placement & Tracking:** Order with Cash on Delivery (COD) and track live progress.\n• **Official GST Invoices:** Download and print tax invoices directly from My Orders.`,
      products: [],
    };
  }

  // 4. Product Comparison (e.g., "compare BugNox Prime and Insektor Max" or "BugNox vs Insektor")
  if (/(compare|difference between|vs|versus|mukabla|antar)/i.test(q)) {
    const mentioned = products.filter((p) => {
      const pName = p.name.toLowerCase();
      const firstWord = pName.split(' ')[0];
      return q.includes(pName) || (firstWord.length > 3 && q.includes(firstWord));
    });

    if (mentioned.length >= 2) {
      const pA = mentioned[0];
      const pB = mentioned[1];
      const pA100 = pA.prices?.find((x) => x.size === 100)?.amount ? `₹${pA.prices.find((x) => x.size === 100).amount}` : 'N/A';
      const pA500 = pA.prices?.find((x) => x.size === 500)?.amount ? `₹${pA.prices.find((x) => x.size === 500).amount}` : 'N/A';
      const pB100 = pB.prices?.find((x) => x.size === 100)?.amount ? `₹${pB.prices.find((x) => x.size === 100).amount}` : 'N/A';
      const pB500 = pB.prices?.find((x) => x.size === 500)?.amount ? `₹${pB.prices.find((x) => x.size === 500).amount}` : 'N/A';

      if (lang === 'hindi') {
        return {
          reply: `**तुलना (Comparison): ${pA.name} बनाम ${pB.name}**\n\n• **1. ${pA.name}:**\n  - फसल: ${pA.crop} | श्रेणी: ${pA.problem}\n  - विधि: ${pA.applicationMethod} (क्रम: ${pA.sequence || 1})\n  - खुराक: ${pA.dosagePerAcre} ${pA.dosageUnit || 'ml'}/एकड़\n  - कीमत: 100ml: ${pA100} | 500ml: ${pA500}\n  - स्टॉक: ${pA.stock} यूनिट्स\n\n• **2. ${pB.name}:**\n  - फसल: ${pB.crop} | श्रेणी: ${pB.problem}\n  - विधि: ${pB.applicationMethod} (क्रम: ${pB.sequence || 1})\n  - खुराक: ${pB.dosagePerAcre} ${pB.dosageUnit || 'ml'}/एकड़\n  - कीमत: 100ml: ${pB100} | 500ml: ${pB500}\n  - स्टॉक: ${pB.stock} यूनिट्स\n\nदोनों उत्पाद हमारे कैटलॉग में सत्यापित हैं और Cash on Delivery के साथ उपलब्ध हैं।`,
          products: [formatProductCard(pA), formatProductCard(pB)],
        };
      }
      return {
        reply: `**Product Comparison: ${pA.name} vs ${pB.name}**\n\n• **1. ${pA.name}:**\n  - Crop: ${pA.crop} | Category: ${pA.problem}\n  - Method: ${pA.applicationMethod} (Sequence: ${pA.sequence || 1})\n  - Dosage: ${pA.dosagePerAcre} ${pA.dosageUnit || 'ml'}/Acre\n  - Pricing: 100ml: ${pA100} | 500ml: ${pA500}\n  - Available Stock: ${pA.stock} units\n\n• **2. ${pB.name}:**\n  - Crop: ${pB.crop} | Category: ${pB.problem}\n  - Method: ${pB.applicationMethod} (Sequence: ${pB.sequence || 1})\n  - Dosage: ${pB.dosagePerAcre} ${pB.dosageUnit || 'ml'}/Acre\n  - Pricing: 100ml: ${pB100} | 500ml: ${pB500}\n  - Available Stock: ${pB.stock} units\n\nBoth products are verified in the database and available for COD order.`,
        products: [formatProductCard(pA), formatProductCard(pB)],
      };
    }
  }

  // 5. Dynamic Dosage Calculation for Acreage (e.g. "How much for 5 acres?" or "3 acre ke liye kitna")
  const acreage = extractAcreage(q);
  if (acreage !== null) {
    // Find target product or default to matched product/problem
    let targetProd = products.find((p) => {
      const pName = p.name.toLowerCase();
      const firstWord = pName.split(' ')[0];
      return q.includes(pName) || (firstWord.length > 3 && q.includes(firstWord));
    });

    if (!targetProd) {
      // If crop mentioned, take first product of that crop
      const cropP = products.find((p) => p.crop && q.includes(p.crop.toLowerCase()));
      if (cropP) targetProd = cropP;
    }

    const dosePerAcre = targetProd ? targetProd.dosagePerAcre : (/fung/i.test(q) ? 500 : 100);
    const unit = targetProd?.dosageUnit || 'ml';
    const totalMl = acreage * dosePerAcre;

    // Calculate optimal 500ml and 100ml bottle combination
    const b500 = Math.floor(totalMl / 500);
    const remainder = totalMl % 500;
    const b100 = Math.ceil(remainder / 100);

    const prodLabel = targetProd ? targetProd.name : 'Crop Protection Product';
    const card = targetProd ? [formatProductCard(targetProd)] : [];

    if (lang === 'hindi') {
      return {
        reply: `**${acreage} एकड़ के लिए खुराक गणना (Dosage Calculation):**\n• **उत्पाद:** ${prodLabel}\n• **मानक खुराक:** ${dosePerAcre} ${unit} प्रति एकड़\n• **कुल आवश्यक दवा:** ${acreage} एकड़ × ${dosePerAcre} ${unit} = **${totalMl} ${unit}**\n\n📦 **अनुशंसित बोतल संयोजन (शून्य बर्बादी):**\n• **500 ml बोतलें:** ${b500} बोतल (${b500 * 500} ml)\n• **100 ml बोतलें:** ${b100} बोतल (${b100 * 100} ml)\n• **कुल आपूर्ति:** ${b500 * 500 + b100 * 100} ${unit}\n\nआप इस मात्रा को सीधे कार्ट में जोड़ सकते हैं और Cash on Delivery पर मंगा सकते हैं।`,
        products: card,
      };
    }
    if (lang === 'hinglish') {
      return {
        reply: `**${acreage} Acre ke liye Dosage Calculation:**\n• **Product:** ${prodLabel}\n• **Standard Dosage:** ${dosePerAcre} ${unit} per Acre\n• **Total Required:** ${acreage} Acres × ${dosePerAcre} ${unit} = **${totalMl} ${unit}**\n\n📦 **Recommended Bottle Pack (Zero Wastage):**\n• **500 ml bottles:** ${b500} bottle (${b500 * 500} ml)\n• **100 ml bottles:** ${b100} bottle (${b100 * 100} ml)\n• **Total Pack:** ${b500 * 500 + b100 * 100} ${unit}\n\nAap website ke top dosage bar mein bhi acreage daalkar cart auto-fill kar sakte hain!`,
        products: card,
      };
    }
    return {
      reply: `**Dosage Calculation for ${acreage} Acres:**\n• **Product Reference:** ${prodLabel}\n• **Standard Dosage:** ${dosePerAcre} ${unit} / Acre\n• **Total Volume Required:** ${acreage} Acres × ${dosePerAcre} ${unit} = **${totalMl} ${unit}**\n\n📦 **Optimal Bottle Combination (Zero Wastage):**\n• **500 ml bottles:** ${b500} pack(s) (${b500 * 500} ml)\n• **100 ml bottles:** ${b100} pack(s) (${b100 * 100} ml)\n• **Total Delivered Volume:** ${b500 * 500 + b100 * 100} ${unit}\n\nYou can also enter ${acreage} in the dosage bar on the catalogue to automatically adjust bottle quantities in your cart!`,
      products: card,
    };
  }

  // 6. Specific Product Lookup & Stock / Price Check
  const matchedProd = products.find((p) => {
    const pName = p.name ? p.name.toLowerCase() : '';
    const firstWord = pName.split(' ')[0];
    return pName && (q.includes(pName) || (firstWord.length > 3 && q.includes(firstWord)));
  });

  if (matchedProd) {
    const card = formatProductCard(matchedProd);
    const p100Text = card.p100 ? `₹${card.p100}` : 'N/A';
    const p500Text = card.p500 ? `₹${card.p500}` : 'N/A';

    // Check if specifically asking about stock
    if (/(stock|available|availability|kitna hai|bache hain|in stock)/i.test(q)) {
      if (lang === 'hindi') {
        return {
          reply: `**${matchedProd.name} का स्टॉक विवरण:**\n• **वर्तमान उपलब्ध स्टॉक:** ${matchedProd.stock} यूनिट्स\n• **उपलब्धता स्थिति:** ${matchedProd.stock > 0 ? '🟢 स्टॉक में उपलब्ध (In Stock)' : '🔴 समाप्त (Out of Stock)'}\n• **पैकिंग साइज़:** 100 ml (${p100Text}) एवं 500 ml (${p500Text})\n\nआप इस उत्पाद को सीधे कार्ट में जोड़ सकते हैं।`,
          products: [card],
        };
      }
      return {
        reply: `**Live Stock Status for ${matchedProd.name}:**\n• **Available Stock:** ${matchedProd.stock} units in MongoDB inventory\n• **Availability:** ${matchedProd.stock > 0 ? '🟢 In Stock (Ready for Dispatch)' : '🔴 Out of Stock'}\n• **Sizes Available:** 100 ml (${p100Text}) and 500 ml (${p500Text})\n\nYou can add it to your cart and place an order via Cash on Delivery.`,
        products: [card],
      };
    }

    // Check if specifically asking about price
    if (/(price|cost|rate|keemat|kitne ka|kitna dam|bhav)/i.test(q)) {
      if (lang === 'hindi') {
        return {
          reply: `**${matchedProd.name} की कीमत:**\n• **100 ml पैक:** ${p100Text}\n• **500 ml पैक:** ${p500Text}\n• **टैक्स:** 5% GST चेकआउट पर शामिल किया जाता है।\n• **भुगतान:** Cash on Delivery (डिलीवरी के समय नकद भुगतान)।`,
          products: [card],
        };
      }
      return {
        reply: `**Official Pricing for ${matchedProd.name}:**\n• **100 ml Bottle:** ${p100Text}\n• **500 ml Bottle:** ${p500Text}\n• **Tax:** 5% GST is computed transparently at checkout.\n• **Payment Method:** Cash on Delivery (COD) supported.`,
        products: [card],
      };
    }

    // Full Product Details
    if (lang === 'hindi') {
      return {
        reply: `**उत्पाद विवरण: ${matchedProd.name}**\n• **फसल:** ${matchedProd.crop}\n• **श्रेणी:** ${matchedProd.problem}\n• **प्रयोग विधि:** ${matchedProd.applicationMethod} (क्रम: ${matchedProd.sequence || 1})\n• **अनुशंसित खुराक:** ${matchedProd.dosagePerAcre} ${matchedProd.dosageUnit || 'ml'} प्रति एकड़\n• **कीमत:** 100ml: ${p100Text} | 500ml: ${p500Text}\n• **उपलब्ध स्टॉक:** ${matchedProd.stock} यूनिट्स\n\nआप इस उत्पाद को सीधे अपने कार्ट में जोड़कर Cash on Delivery पर ऑर्डर कर सकते हैं।`,
        products: [card],
      };
    }
    if (lang === 'hinglish') {
      return {
        reply: `**Product Details: ${matchedProd.name}**\n• **Target Crop:** ${matchedProd.crop}\n• **Problem Category:** ${matchedProd.problem}\n• **Method:** ${matchedProd.applicationMethod} (Sequence: ${matchedProd.sequence || 1})\n• **Dosage:** ${matchedProd.dosagePerAcre} ${matchedProd.dosageUnit || 'ml'} per Acre\n• **Price:** 100ml: ${p100Text} | 500ml: ${p500Text}\n• **Stock:** ${matchedProd.stock} units available\n\nAap is product ko cart mein add karke COD par order kar sakte hain.`,
        products: [card],
      };
    }
    return {
      reply: `**Product Details: ${matchedProd.name}**\n• **Target Crop:** ${matchedProd.crop}\n• **Category:** ${matchedProd.problem}\n• **Application Method:** ${matchedProd.applicationMethod} (Sequence: ${matchedProd.sequence || 1})\n• **Stored Dosage:** ${matchedProd.dosagePerAcre} ${matchedProd.dosageUnit || 'ml'} per Acre\n• **Pricing:** 100ml: ${p100Text} | 500ml: ${p500Text}\n• **Stock Availability:** ${matchedProd.stock} units in stock\n\nYou can add this product to your cart and check out with Cash on Delivery.`,
      products: [card],
    };
  }

  // 7. All Available Products / Stock Overview
  if (/(what products|available products|list products|all products|products in stock|kya dawai hai|kaunse product hain|all items)/i.test(q)) {
    const list = products.slice(0, 8).map((p) => `• **${p.name}** (${p.crop} - ${p.problem}, Stock: ${p.stock})`).join('\n');
    const cards = products.slice(0, 6).map(formatProductCard);

    if (lang === 'hindi') {
      return {
        reply: `**हिमालय फार्मकेयर के सक्रिय उत्पाद (कुल ${products.length} उत्पाद):**\n\n${list}\n\nसभी उत्पाद 100ml और 500ml साइज़ में Cash on Delivery के साथ उपलब्ध हैं। किसी भी उत्पाद पर क्लिक करके विवरण देखें।`,
        products: cards,
      };
    }
    return {
      reply: `**Active Himalaya FarmCare Products (${products.length} items in database):**\n\n${list}\n\nAll items are available in 100ml and 500ml bottles with Cash on Delivery. Cards are attached below:`,
      products: cards,
    };
  }

  // 8. Supported Crops Catalogue Question
  if (/(what crops|supported crops|which crops|crops list|fasal|kaunsi fasal|crops covered)/i.test(q)) {
    const cropNames = crops.map((c) => `• **${c.name}**`).join('\n');
    if (lang === 'hindi') {
      return {
        reply: `**हिमालय फार्मकेयर पर समर्थित फसलें:**\n\n${cropNames}\n\nआप किसी भी फसल के लिए अनुशंसित कीटनाशक, फफूंदनाशक या पीजीआर उत्पादों की जानकारी ले सकते हैं।`,
        products: [],
      };
    }
    return {
      reply: `**Supported Crops in Himalaya FarmCare:**\n\n${cropNames}\n\nYou can inquire about targeted products, dosages, and application methods for any of these crops!`,
      products: [],
    };
  }

  // 9. Supported Problems / Categories Catalogue Question
  if (/(what problems|categories|problem types|problems covered|samasya|bimari)/i.test(q)) {
    const probNames = problems.map((pr) => `• **${pr.name}**`).join('\n');
    if (lang === 'hindi') {
      return {
        reply: `**समर्थित कृषि समस्या श्रेणियां:**\n\n${probNames}\n\nप्रत्येक श्रेणी के लिए मानक खुराक:\n• कीटनाशक (Insecticides): 100 ml/एकड़\n• फफूंदनाशक (Fungicides): 500 ml/एकड़\n• पीजीआर (PGR): 200 ml/एकड़`,
        products: [],
      };
    }
    return {
      reply: `**Covered Agricultural Problem Categories:**\n\n${probNames}\n\nStandard dosage benchmarks:\n• Insecticides: 100 ml / Acre\n• Fungicides: 500 ml / Acre\n• PGR / Plant Growth: 200 ml / Acre`,
      products: [],
    };
  }

  // 10. Application Methods & Spray Sequence Questions
  if (/(application method|spray or drip|how to apply|vidhi|chhidkaw|sequence|spray sequence|sequence 1|sequence 2)/i.test(q)) {
    if (/(sequence|spray sequence|sequence 1|sequence 2|sequence 3)/i.test(q)) {
      if (lang === 'hindi') {
        return {
          reply: `**स्प्रे क्रम (Spray Sequence) क्या है?**\n• **Sequence 1, 2, 3+** फसल के जीवन चक्र में दवा के सही छिड़काव चरण को दर्शाता है।\n• **Sequence 1 (प्रारंभिक अवस्था):** फसल के शुरुआती विकास में सुरक्षा के लिए फफूंदनाशक या बेसिक सुरक्षा।\n• **Sequence 2 (मध्य अवस्था):** कीटों के प्रकोप के समय लक्षित कीटनाशक छिड़काव।\n• **Sequence 3 (अंतिम अवस्था):** फल और फूलों के विकास के लिए PGR और पोषण।\n\nयह क्रम दवाओं के रासायनिक टकराव को रोकता है और फसल को अधिकतम सुरक्षा प्रदान करता है।`,
          products: [],
        };
      }
      return {
        reply: `**What is Spray Sequence (1, 2, 3+)?**\n• Spray Sequence represents the scientifically recommended chronological schedule of treatments during the crop's vegetative and reproductive stages:\n  - **Sequence 1 (Early Stage):** Preventative foundation, soil conditioning, or early fungal protection.\n  - **Sequence 2 (Active Growth):** Targeted pest suppression and insect management.\n  - **Sequence 3 (Reproductive/Flowering):** Growth enhancement and yield boost through PGRs.\n• Following sequence numbers avoids chemical incompatibility and protects your crop systematically.`,
        products: [],
      };
    }

    const methodNames = methods.map((m) => `• **${m.name}**`).join('\n');
    if (lang === 'hindi') {
      return {
        reply: `**उपलब्ध प्रयोग विधियां (Application Methods):**\n\n${methodNames || '• Spray\n• Drip'}\n\n• **Spray (पर्णीय छिड़काव):** पत्तों और तनों पर सीधे स्प्रेयर से छिड़काव।\n• **Drip (ड्रिप सिंचाई):** पानी के साथ जड़ क्षेत्र में ड्रिप प्रणाली द्वारा दवा पहुंचाना।`,
        products: [],
      };
    }
    return {
      reply: `**Supported Application Methods in Himalaya FarmCare:**\n\n${methodNames || '• Spray (Foliar application)\n• Drip (Fertigation / Root zone)'}\n\n• **Foliar Spray:** Uniform mist application directly onto plant canopy and foliage.\n• **Drip Irrigation:** Root-zone delivery through drip lines for systemic absorption.`,
      products: [],
    };
  }

  // 11. Safety, Medical & Yield Guarantees
  if (/(guarantee|yield guarantee|double yield|bimari theek|cure|miracle|magic|zyada paidawar)/i.test(q)) {
    if (lang === 'hindi') {
      return {
        reply: `⚠️ **महत्वपूर्ण कृषि सुरक्षा सूचना:**\nहिमालय फार्मकेयर किसी भी उत्पाद से फसल की पैदावार दोगुनी करने या 100% गारंटी का दावा नहीं करता है। फसल की पैदावार मिट्टी की गुणवत्ता, मौसम, पानी और बीजों पर निर्भर करती है।\n\nगंभीर फसल रोगों के निदान के लिए कृपया अपने नजदीकी कृषि विज्ञान केंद्र (KVK) या प्रमाणित कृषि अधिकारी से परामर्श लें।`,
        products: [],
      };
    }
    return {
      reply: `⚠️ **Agricultural Safety Notice:**\nHimalaya FarmCare does not guarantee crop yield or financial outcomes. Agricultural results depend on weather conditions, soil fertility, irrigation, and agronomic practices.\n\nFor uncertain crop health issues or severe infestations, always consult your local agricultural extension service or certified agronomist.`,
      products: [],
    };
  }

  // 12. Smart Recommendation Engine Guide
  if (/(recommendation|recommend|sifarish|plan|sujhav|kaise use kare|how to use recommendation)/i.test(q)) {
    if (lang === 'hindi') {
      return {
        reply: `**स्मार्ट सिफारिश (Smart Recommendation) का उपयोग कैसे करें:**\n1. होम पेज या **Recommendation** टैब पर जाएं।\n2. अपनी फसल (जैसे Cotton या Turmeric) चुनें।\n3. समस्या चुनें (जैसे Insecticide, Fungicide, या PGR)।\n4. छिड़काव विधि (Spray या Drip) चुनें।\n5. **Get Recommendation** पर क्लिक करें।\n6. अपनी जमीन (Acres) दर्ज करें और खुराक के अनुसार बोतलें कार्ट में जोड़ें!`,
        products: [],
      };
    }
    if (lang === 'hinglish') {
      return {
        reply: `**Smart Recommendation Feature kaise use karein:**\n1. Navbar mein **Recommendation** page par jayein.\n2. Apni Crop (jaise Cotton ya Turmeric) select karein.\n3. Problem type (Insecticide, Fungicide, ya PGR) chunein.\n4. Application Method (Spray ya Drip) select karein.\n5. **Get Recommendation** button par click karein.\n6. Apni zameen (Acres) enter karke ideal bottle quantities auto-calculate karein aur cart mein add karein!`,
        products: [],
      };
    }
    return {
      reply: `**How to use Smart Recommendation:**\n1. Navigate to the **Recommendation** page from the top navigation bar.\n2. Select your target **Crop** (e.g. Cotton, Turmeric).\n3. Choose your agricultural **Problem** category (Insecticide, Fungicide, PGR, or Special PGR).\n4. Select your **Application Method** (Spray or Drip).\n5. Click **Get Recommendation** to generate a sequenced application plan.\n6. Enter your farm acreage in the dosage bar to automatically calculate required bottle sizes and quantities!`,
      products: [],
    };
  }

  // 13. Dosage Rules Guide
  if (/(dosage|dose|khurak|matra|calculator|how much to spray)/i.test(q)) {
    if (lang === 'hindi') {
      return {
        reply: `**दवा की खुराक (Dosage) संबंधी नियम:**\n* हमारे डेटाबेस में संग्रहित उत्पाद के आधार पर:\n  - **कीटनाशक (Insecticides):** 100 ml प्रति एकड़\n  - **फफूंदनाशक (Fungicides):** 500 ml प्रति एकड़\n  - **अन्य / PGR:** 200 ml प्रति एकड़\n\n💡 **खुराक गणक (Dosage Calculator):**\nवेबसाइट के शीर्ष पर अपनी जमीन (Acres) दर्ज करें और **Next (Calculate)** पर क्लिक करें। सिस्टम आपके एकड़ के अनुसार 100ml और 500ml की सटीक बोतलें स्वतः निकाल देता है ताकि दवा व्यर्थ न हो।`,
        products: [],
      };
    }
    if (lang === 'hinglish') {
      return {
        reply: `**Dosage & Khurak Rules:**\n* Stored catalogue records ke mutabik standard guidelines:\n  - **Insecticides:** 100 ml per Acre\n  - **Fungicides:** 500 ml per Acre\n  - **PGR & Others:** 200 ml per Acre\n\n💡 **Auto-Dosage Calculator:**\nNavbar ke neeche **Farm land (Acres)** box mein apne acres likhein aur **Next (Calculate)** dabayein. System aapke acreage ke hisaab se required 100ml aur 500ml bottles calculate karke cart update kar dega.`,
        products: [],
      };
    }
    return {
      reply: `**Product Dosage Guidelines:**\n* Based on stored catalogue specifications in Himalaya FarmCare:\n  - **Insecticides:** 100 ml / Acre\n  - **Fungicides:** 500 ml / Acre\n  - **PGR & Other products:** 200 ml / Acre\n\n💡 **Using the Dosage Calculator:**\nEnter your total acreage in the dosage bar at the top of the catalogue and click **Next (Calculate)**. The application automatically calculates the exact milliliters required and suggests the optimal combination of 100ml and 500ml bottles to eliminate wastage.`,
      products: [],
    };
  }

  // 14. Order Tracking & Invoices
  if (/(track|tracking|status|my orders|invoice|bill|receipt|rasid|parcha)/i.test(q)) {
    if (lang === 'hindi') {
      return {
        reply: `**ऑर्डर ट्रैकिंग और रसीद (Invoice) डाउनलोड:**\n* **ऑर्डर स्टेटस देखें:** नेविगेशन बार में **📦 My Orders** पर जाएं। वहाँ आप अपने ऑर्डर की लाइव ट्रैकिंग टाइमलाइन (Pending ➔ Confirmed ➔ Dispatched ➔ In Transit ➔ Delivered) देख सकते हैं।\n* **पक्का बिल (Official GST Invoice):** अपने किसी भी ऑर्डर के आगे **View & Print Invoice** बटन पर क्लिक करें। वहाँ से आप 5% GST सहित आधिकारिक रसीद देख सकते हैं और PDF सेव या प्रिंट कर सकते हैं।`,
        products: [],
      };
    }
    if (lang === 'hinglish') {
      return {
        reply: `**Order Tracking & Invoice Download:**\n* **Order Track karein:** Top navigation mein **📦 My Orders** link par jayein. Wahan aap apne order ka live status dekh sakte hain (Pending ➔ Confirmed ➔ Dispatched ➔ In Transit ➔ Delivered).\n* **Invoice PDF Download:** Har order ke saath **View & Print Invoice** button hai. Is par click karke aap official GST tax invoice dekh sakte hain aur PDF print kar sakte hain.`,
        products: [],
      };
    }
    return {
      reply: `**Order Tracking & Tax Invoice:**\n* **Track Delivery:** Go to **📦 My Orders** from the top navigation bar. You can view the live progress timeline for every placed order (Pending ➔ Confirmed ➔ Dispatched ➔ In Transit ➔ Delivered).\n* **Download Invoice:** On any confirmed order in My Orders, click the **View & Print Invoice** button. This opens the official printable GST tax invoice with farmer details, line items, and grand total.`,
      products: [],
    };
  }

  // 15. Order Placement & Checkout Guide
  if (/(how.*order|place.*order|order.*kaise|kaise.*order|khareed|buy.*product|checkout|cash on delivery|cod)/i.test(q)) {
    if (lang === 'hindi') {
      return {
        reply: `**ऑर्डर कैसे करें (How to Place an Order):**\n1. उत्पाद सूची में से अपनी पसंद का उत्पाद चुनें और **Add to Cart** पर क्लिक करें।\n2. दाईं ओर कार्ट में बोतलों की मात्रा जांचें।\n3. **Proceed to Checkout** पर क्लिक करें।\n4. अपना किसान खाता लॉगिन करें (यदि पहले से नहीं है तो 1 मिनट में Register करें)।\n5. अपना खेत का पता चुनें या नया पता दर्ज करें।\n6. भुगतान का प्रकार **Cash on Delivery (COD)** रहेगा (सामान मिलने पर नकद भुगतान करें)।\n7. **Confirm & Place Order** पर क्लिक करें। आपका ऑर्डर बुक हो जाएगा!`,
        products: [],
      };
    }
    if (lang === 'hinglish') {
      return {
        reply: `**Order Place karne ka tarika:**\n1. Catalogue se product select karein aur **Add to Cart** dabayein.\n2. Cart pane mein quantity aur price review karein.\n3. **Proceed to Checkout** par click karein.\n4. Login karein ya naya account register karein.\n5. Apna delivery address chunein (saved address ya custom address).\n6. Payment mode **Cash on Delivery (COD)** select rahega—jab parcel farm par pahuche tabhi cash payment karein.\n7. **Confirm & Place Order** dabayein aur aapka order confirm ho jayega!`,
        products: [],
      };
    }
    return {
      reply: `**How to Place an Order on Himalaya FarmCare:**\n1. Browse the catalogue and click **Add to Cart** on your required products.\n2. Review quantities and totals in the Cart section on the right.\n3. Click **Proceed to Checkout**.\n4. Log in to your farmer account (or Register if you are a new user).\n5. Select a saved farm delivery location or enter your shipping address.\n6. Payment is **Cash on Delivery (COD)** — pay safely when supplies arrive at your farm.\n7. Click **Confirm & Place Order** to receive your unique Order ID!`,
      products: [],
    };
  }

  // 16. User Registration & Login Guidance
  if (/(how to register|how to login|sign up|create account|account kaise banaye|login kaise kare)/i.test(q)) {
    if (lang === 'hindi') {
      return {
        reply: `**पंजीकरण और लॉगिन प्रक्रिया:**\n1. **पंजीकरण (Register):** शीर्ष नेविगेशन बार में **Register** पर क्लिक करें। अपना नाम, ईमेल और सुरक्षित पासवर्ड दर्ज करें। आपका किसान खाता तुरंत तैयार हो जाएगा।\n2. **लॉगिन (Login):** **Login** बटन पर क्लिक करें, अपना ईमेल और पासवर्ड दर्ज करें। आपकी लॉगिन स्थिति सुरक्षित रूप से सहेजी जाती है।\n3. **सुरक्षा:** किसानों को केवल किसान अधिकार मिलते हैं (व्यवस्थापक अधिकार सुरक्षित हैं)।`,
        products: [],
      };
    }
    return {
      reply: `**Account Registration & Login Guide:**\n1. **Registration:** Click **Register** in the top navigation bar. Enter your Full Name, Email, and a password. Your farmer account will be activated immediately.\n2. **Login:** Click **Login**, provide your credentials, and submit. Your session persists securely across page refreshes.\n3. **Role Safety:** Farmer accounts are protected; administrative functions are restricted to authorized admins only.`,
      products: [],
    };
  }

  // 17. Profile & Saved Addresses
  if (/(profile|address|pata|khet ka pata|saved address|update phone|change name)/i.test(q)) {
    if (lang === 'hindi') {
      return {
        reply: `**किसान प्रोफाइल और खेत के पते का प्रबंधन:**\n1. नेविगेशन में **Profile** विकल्प पर क्लिक करें।\n2. यहाँ आप अपना नाम, मोबाइल नंबर और प्राथमिक कृषि क्षेत्र (Primary Farming Region) अपडेट कर सकते हैं।\n3. **+ Add Farm Address** पर क्लिक करके अपने मुख्य खेत, बगीचे या पॉलीहाउस का पता सहेजें।\n4. सहेजे गए पते से चेकआउट के समय 1-क्लिक में पता चुना जा सकता है!`,
        products: [],
      };
    }
    if (lang === 'hinglish') {
      return {
        reply: `**Profile & Farm Addresses Manage karein:**\n1. Navbar mein **Profile** par jayein.\n2. Apna Name, Phone Number aur Farming Region update karein.\n3. **+ Add Farm Address** button par click karke apne farm locations (Village, District, Pincode, Acreage) save karein.\n4. Default farm address set karne se checkout ke waqt automatically address fill ho jata hai!`,
        products: [],
      };
    }
    return {
      reply: `**Managing Profile & Saved Farm Addresses:**\n1. Click on **Profile** in the top navigation bar.\n2. Update your personal details, phone number, and primary farming region.\n3. Use the **+ Add Farm Address** button to store multiple delivery locations (Main Farm, Orchard, Polyhouse) with village, district, state, and pincode.\n4. Setting a default farm address enables fast, 1-click checkout!`,
      products: [],
    };
  }

  // 18. Follow-up Questions for Incomplete Queries (e.g. "suggest medicine", "dawa batao", "recommend")
  if (/^(suggest medicine|dawa batao|recommend|give recommendation|kuch dawai|suggest product|kheti ki dawa)$/i.test(q) ||
      /^medicine$/i.test(q) || /^dawa$/i.test(q) || /^dawai$/i.test(q)) {
    if (lang === 'hindi') {
      return {
        reply: `ज़रूर किसान भाई! सही उत्पाद और खुराक बताने के लिए, कृपया मुझे बताएं:\n1. आपकी कौन सी फसल है? (जैसे कपास, हल्दी, मक्का, या सोयाबीन)\n2. फसल में क्या समस्या आ रही है? (जैसे कीड़े/इल्ली, फफूंद/धब्बा, या फसल विकास/टॉनिक)\n3. आप किस विधि से दवा देना चाहते हैं? (स्प्रे या ड्रिप)?`,
        products: [],
      };
    }
    if (lang === 'hinglish') {
      return {
        reply: `Zaroor Kisan Bhai! Sahi product aur dosage suggest karne ke liye, kripya mujhe batayein:\n1. Aapki kaunsi crop hai? (jaise Cotton, Turmeric, Corn, ya Soyabean)\n2. Fasal mein kya samasya hai? (jaise Keede/Insect, Fungus/Disease, ya Growth/PGR)\n3. Aap spray karna chahte hain ya drip se dena chahte hain?`,
        products: [],
      };
    }
    return {
      reply: `I would be happy to suggest the right agricultural solution! To give you the exact product and dosage, could you please specify:\n1. Which crop are you growing (e.g. Cotton, Turmeric, Corn, Soyabean)?\n2. What problem is affecting your crop (e.g. Insect pests, Fungal disease, or Plant Growth Regulator)?\n3. What is your preferred application method (Foliar Spray or Drip)?`,
      products: [],
    };
  }

  // 19. Out-of-Scope Politeness (Weather, Politics, Crypto, Sports)
  if (/(weather|mausam|rain|barish|cricket|score|ipl|election|politics|modi|crypto|bitcoin|share market|movie|cinema)/i.test(q)) {
    if (lang === 'hindi') {
      return {
        reply: `मैं **हिमालय फार्मकेयर का समर्पित कृषि सहायक** हूँ। मैं विशेष रूप से फसल सुरक्षा उत्पादों, दवा की खुराक (Dosage), कृषि सिफारिशों और फार्म ऑर्डर्स में आपकी सहायता करता हूँ।\n\nमौसम या अन्य विषयों के लिए कृपया संबंधित आधिकारिक सेवाओं को देखें। बताएं, आपकी खेती या फसल के लिए मैं क्या करूँ?`,
        products: [],
      };
    }
    return {
      reply: `I am the dedicated **Himalaya FarmCare Agricultural Assistant**. I specialize exclusively in verified crop protection products, dosage math, sequenced spray plans, and farm supply orders.\n\nFor weather forecasts or general inquiries, please consult local meteorological or news services. How may I assist your farm crops today?`,
      products: [],
    };
  }

  // 20. Specific Crop Queries (Cotton, Turmeric, Corn, Soyabean, etc.)
  const cropMatch = crops.find((c) => c.name && c.name.toLowerCase() !== 'other' && q.includes(c.name.toLowerCase()));
  if (cropMatch) {
    const matchingProducts = products.filter(
      (p) => p.crop && p.crop.toLowerCase() === cropMatch.name.toLowerCase()
    );

    const formattedCards = matchingProducts.slice(0, 4).map(formatProductCard);

    if (matchingProducts.length === 0) {
      if (lang === 'hindi') {
        return {
          reply: `वर्तमान में **${cropMatch.name}** फसल के लिए कोई सक्रिय उत्पाद हमारे कैटलॉग में उपलब्ध नहीं है। कृपया अन्य फसलों जैसे Cotton या Turmeric के उत्पाद देखें।`,
          products: [],
        };
      }
      return {
        reply: `Currently, there are no active products listed in the catalogue for **${cropMatch.name}**. Please check other crops like Cotton or Turmeric.`,
        products: [],
      };
    }

    const productNames = matchingProducts.map((p) => `• **${p.name}** (${p.problem}, ${p.dosagePerAcre}${p.dosageUnit || 'ml'}/Acre, Stock: ${p.stock})`).join('\n');

    if (lang === 'hindi') {
      return {
        reply: `हमारे कैटलॉग में **${cropMatch.name}** फसल के लिए कुल **${matchingProducts.length} उत्पाद** उपलब्ध हैं:\n\n${productNames}\n\nसभी उत्पाद 100ml और 500ml पैक में उपलब्ध हैं और सीधे खेत पर Cash on Delivery के साथ मंगाए जा सकते हैं।`,
        products: formattedCards,
      };
    }
    if (lang === 'hinglish') {
      return {
        reply: `Aapke catalogue mein **${cropMatch.name}** crop ke liye **${matchingProducts.length} products** available hain:\n\n${productNames}\n\nAap inhein cart mein add karke Cash on Delivery par order kar sakte hain. Neeche inke details card diye gaye hain:`,
        products: formattedCards,
      };
    }
    return {
      reply: `We have **${matchingProducts.length} products** available for **${cropMatch.name}** in the Himalaya FarmCare catalogue:\n\n${productNames}\n\nAll items are available in 100ml and 500ml sizes with Cash on Delivery. See matching products below:`,
      products: formattedCards,
    };
  }

  // 21. Specific Problem / Category Queries (Insecticide, Fungicide, PGR, Special PGR)
  const problemMatch = problems.find((pr) => q.includes(pr.name.toLowerCase()));
  if (problemMatch || /(insecticide|fungicide|pgr|keede|keeda|fungus|growth|tonic)/i.test(q)) {
    const term = problemMatch ? problemMatch.name : /fung/i.test(q) ? 'Fungicide' : /pgr|growth/i.test(q) ? 'PGR' : 'Insecticide';
    const matchingProducts = products.filter(
      (p) => p.problem && p.problem.toLowerCase() === term.toLowerCase()
    );
    const formattedCards = matchingProducts.slice(0, 4).map(formatProductCard);

    if (lang === 'hindi') {
      return {
        reply: `**${term} श्रेणी के उत्पाद:**\nहमारे डेटाबेस में ${term} के लिए कई सक्रिय उत्पाद हैं (जैसे ${matchingProducts.slice(0, 3).map((p) => p.name).join(', ')} आदि)।\n• मानक खुराक: **${term === 'Insecticide' ? '100 ml' : term === 'Fungicide' ? '500 ml' : '200 ml'} प्रति एकड़**।\n\n⚠️ *सुरक्षा सूचना:* हमेशा अनुमोदित सुरक्षात्मक उपकरण पहनकर छिड़काव करें। यदि कीट या रोग की पहचान अनिश्चित हो, तो अपने नजदीकी कृषि विशेषज्ञ से संपर्क करें।`,
        products: formattedCards,
      };
    }
    if (lang === 'hinglish') {
      return {
        reply: `**${term} Category Products:**\nHimalaya FarmCare catalogue mein ${term} ke liye products available hain (jaise ${matchingProducts.slice(0, 3).map((p) => p.name).join(', ')}).\n* Stored Dosage: **${term === 'Insecticide' ? '100 ml' : term === 'Fungicide' ? '500 ml' : '200 ml'} per Acre**.\n\n⚠️ *Kisan Suraksha:* Spray karte waqt label par likhi hidayat follow karein. Kisi anjaan bimari ke liye kripya certified kheti visheshagya se salah lein.`,
        products: formattedCards,
      };
    }
    return {
      reply: `**${term} Products & Recommendations:**\nWe stock verified ${term} products in the catalogue including ${matchingProducts.slice(0, 3).map((p) => p.name).join(', ')}.\n• Catalogue Dosage: **${term === 'Insecticide' ? '100 ml' : term === 'Fungicide' ? '500 ml' : '200 ml'} per Acre**.\n\n⚠️ *Agricultural Safety Notice:* Always follow safety precautions and wear protective equipment during application. For uncertain crop diseases or severe infestations, please consult a certified agricultural officer.`,
      products: formattedCards,
    };
  }

  // 22. General Fallback
  const generalProducts = findMatchingProducts(q, products);
  const formattedCards = generalProducts.map(formatProductCard);

  if (lang === 'hindi') {
    return {
      reply: `क्षमा करें, मुझे इस विशिष्ट प्रश्न की पूरी जानकारी हमारे कैटलॉग में नहीं मिली।\n\nआप मुझसे फसलों (Cotton, Turmeric, Corn), किसी विशिष्ट उत्पाद (जैसे BugNox Prime, FungiClear), दवा की खुराक (Dosage), या ऑर्डर कैसे करें के बारे में पूछ सकते हैं।`,
      products: formattedCards,
    };
  }
  if (lang === 'hinglish') {
    return {
      reply: `Maaf kijiye, is specific sawal ki direct information catalogue mein uplabdh nahi hai.\n\nAap mujhse Cotton ya Turmeric ke products, dosage rules, order kaise place karein, ya bill invoice ke baare mein pooch sakte hain.`,
      products: formattedCards,
    };
  }
  return {
    reply: `I could not find exact matching records for that specific question in our current catalogue.\n\nFeel free to ask about available products for **Cotton** or **Turmeric**, dosage per acre, how to use the **Smart Recommendation** engine, or how to place and track your orders.`,
    products: formattedCards,
  };
}

/**
 * Main Chat Handler with AI integration and Fallback
 */
export async function processChatMessage({ message, context = [] }) {
  if (!message || typeof message !== 'string') {
    throw new Error('Message is required and must be text.');
  }

  const trimmed = message.trim();
  const lang = detectLanguage(trimmed);
  const catalogue = await getCatalogueContext();

  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const aiModel = process.env.AI_MODEL || 'gemini-3.5-flash';

  // If no AI API key is configured, use the intelligent real-time DB fallback
  if (!apiKey) {
    const fallback = generateFallbackResponse(trimmed, catalogue, lang);
    return {
      reply: fallback.reply,
      products: fallback.products,
      language: lang,
      provider: 'database-fallback',
    };
  }

  // If AI key is configured, query Gemini with full grounding
  try {
    const catalogueSummary = catalogue.products
      .map(
        (p) =>
          `- ${p.name} (Crop: ${p.crop}, Category: ${p.problem}, Method: ${p.applicationMethod}, Sequence: ${p.sequence || 1}, Dosage: ${p.dosagePerAcre}${p.dosageUnit || 'ml'}/acre, 100ml: ₹${p.prices?.find((x) => x.size === 100)?.amount || 'N/A'}, 500ml: ₹${p.prices?.find((x) => x.size === 500)?.amount || 'N/A'}, Stock: ${p.stock})`
      )
      .join('\n');

    const systemPrompt = `You are the official AI Agriculture Assistant for "Himalaya FarmCare" (Tagline: "Serving Your Farm Is Our Duty").
Your duty is to assist farmers in understanding crops, product recommendations, dosages, and website navigation.

STRICT SAFETY AND GROUNDING RULES:
1. ONLY reference products, prices, stock, and dosages from the verified database provided below. NEVER hallucinate or invent new products, dosage values, prices, or yield guarantees.
2. If information is not in the catalogue, clearly state: "That information is not currently available in our catalogue."
3. Dosage rules must strictly follow stored records. If farmer asks for acreage calculation (e.g. 5 acres), multiply the stored dosage per acre by the acreage and calculate optimal 500ml and 100ml bottle quantities with zero or minimal waste.
4. Never make medical or yield guarantees. Recommend consulting a certified agricultural expert for uncertain pest problems.
5. Do not execute or discuss admin operations, and never expose private user credentials or passwords.
6. Language: The user's query language is detected as "${lang}". Respond politely in the SAME language (English, Hindi in Devanagari script, or Hinglish in Roman script). Keep the tone respectful, warm, and helpful ("Kisan Bhai").

CATALOGUE PRODUCTS CURRENTLY IN DATABASE:
${catalogueSummary || 'None currently active'}

AVAILABLE CROPS: ${catalogue.crops.map((c) => c.name).join(', ') || 'Cotton, Turmeric, Corn, Soyabean'}
AVAILABLE PROBLEMS: ${catalogue.problems.map((p) => p.name).join(', ') || 'Insecticide, Fungicide, PGR, Special PGR'}
APPLICATION METHODS: ${catalogue.methods.map((m) => m.name).join(', ') || 'Spray, Drip'}

WEBSITE GUIDES:
- Smart Recommendation: Select crop, problem, method, and sequence.
- Dosage: Top dosage bar calculates milliliters and optimal bottle combinations (100ml/500ml).
- Checkout: Cart -> Proceed to Checkout -> Saved Farm Address -> Cash on Delivery (COD).
- Tracking: In "My Orders" timeline (Pending -> Confirmed -> Dispatched -> In Transit -> Delivered).
- Invoice: Click "View & Print Invoice" in My Orders for official 5% GST receipt.
- Profile: Manage farmer details and saved farm delivery locations in /profile.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

    // Build multi-turn contents properly formatted for Gemini API (user & model roles)
    const contents = [];

    // Prepend system prompt to initial instruction / context
    contents.push({
      role: 'user',
      parts: [{ text: `System Instructions:\n${systemPrompt}` }],
    });
    contents.push({
      role: 'model',
      parts: [{ text: `Understood! I am the official Himalaya FarmCare Assistant. I will strictly follow all safety, database grounding, and language guidelines.` }],
    });

    if (Array.isArray(context) && context.length > 0) {
      for (const turn of context.slice(-4)) {
        if (turn.text && turn.text.trim()) {
          contents.push({
            role: turn.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: turn.text.trim() }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: trimmed }],
    });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Gemini API returned status ${response.status}, switching to database fallback.`);
      const fallback = generateFallbackResponse(trimmed, catalogue, lang);
      return {
        reply: fallback.reply,
        products: fallback.products,
        language: lang,
        provider: 'database-fallback',
      };
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      const fallback = generateFallbackResponse(trimmed, catalogue, lang);
      return {
        reply: fallback.reply,
        products: fallback.products,
        language: lang,
        provider: 'database-fallback',
      };
    }

    const matchedProducts = findMatchingProducts(trimmed, catalogue.products).map(formatProductCard);

    return {
      reply: replyText.trim(),
      products: matchedProducts,
      language: lang,
      provider: 'gemini-ai',
    };
  } catch (err) {
    console.warn('AI processing error or timeout:', err.message, 'Using database fallback.');
    const fallback = generateFallbackResponse(trimmed, catalogue, lang);
    return {
      reply: fallback.reply,
      products: fallback.products,
      language: lang,
      provider: 'database-fallback',
    };
  }
}
