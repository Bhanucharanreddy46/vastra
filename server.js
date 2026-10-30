import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// AI Studio requires the app to listen strictly on port 3000 (0.0.0.0).
// Do not use process.env.PORT as Cloud Run injects PORT=8080 which collides with container ingress.
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from public/ and workspace root
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Data paths
const PATRONS_FILE = path.join(__dirname, 'data', 'patrons.json');
const PRODUCTS_FILE = path.join(__dirname, 'data', 'catalog_products.json');
const FESTIVE_FILE = path.join(__dirname, 'data', 'festive_products.json');
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');
const CATEGORIES_FILE = path.join(__dirname, 'data', 'categories.json');
const CATALOGS_FILE = path.join(__dirname, 'data', 'catalogs.json');
const INQUIRIES_FILE = path.join(__dirname, 'data', 'inquiries.json');
const REPORT_FILE = path.join(__dirname, 'data', 'import_report.json');

function readJsonFile(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
  return defaultValue;
}

function writeJsonFile(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
    return false;
  }
}

// ================= API ROUTES =================

// 1. Get products (with filtering, search, sorting)
app.get('/api/catalog/products', (req, res) => {
  const { occasion, category, gender, search, sort, includeUnpublished } = req.query;
  let products = readJsonFile(PRODUCTS_FILE, []);

  if (includeUnpublished !== 'true') {
    products = products.filter(p => p.published !== false);
  }

  if (occasion && occasion !== 'all') {
    products = products.filter(p => p.occasion?.toLowerCase() === occasion.toLowerCase());
  }

  if (category && category !== 'all') {
    products = products.filter(p => p.category?.toLowerCase() === category.toLowerCase());
  }

  if (gender && gender !== 'all') {
    products = products.filter(p => p.gender?.toLowerCase() === gender.toLowerCase());
  }

  if (search && search.trim() !== '') {
    const q = search.toLowerCase().trim();
    products = products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.fabric?.toLowerCase().includes(q) ||
      p.occasion?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.colors?.some(c => c.toLowerCase().includes(q))
    );
  }

  if (sort === 'name-asc') {
    products.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'name-desc') {
    products.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sort === 'code-asc') {
    products.sort((a, b) => a.code.localeCompare(b.code));
  }

  res.json({ success: true, count: products.length, products });
});

// 2. Get single product by id or code
app.get('/api/catalog/products/:id', (req, res) => {
  const { id } = req.params;
  const products = readJsonFile(PRODUCTS_FILE, []);
  const product = products.find(p => p.id === id || p.code?.toLowerCase() === id.toLowerCase());

  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  res.json({ success: true, product });
});

// 2b. Get Vastra Festive Collection products
app.get('/api/festive/products', (req, res) => {
  const { category, search } = req.query;
  let products = readJsonFile(FESTIVE_FILE, []);

  if (category && category !== 'all') {
    products = products.filter(p => p.category?.toLowerCase() === category.toLowerCase());
  }

  if (search && search.trim() !== '') {
    const q = search.toLowerCase().trim();
    products = products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.fabric?.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, count: products.length, products });
});

// 2c. Submit completed order (simulated instant UPI / Card payment)
app.post('/api/orders', (req, res) => {
  const { items, paymentMethod, customerDetails, amount, status = 'Confirmed', patronEmail, patronId } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ success: false, error: 'Cart items are required' });
  }

  const orders = readJsonFile(ORDERS_FILE, []);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderId = `VAS-ORD-2026-${randomSuffix}`;
  const transactionId = `TXN-${paymentMethod?.toUpperCase().replace(/[^A-Z0-9]/g, '-') || 'UPI'}-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  const email = patronEmail || customerDetails?.email || 'kmbhanucharanreddy@gmail.com';

  const newOrder = {
    orderId,
    transactionId,
    patronEmail: email.toLowerCase(),
    patronId: patronId || 'patron_user',
    items,
    amount: amount || items.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0),
    paymentMethod: paymentMethod || 'Instant UPI',
    customerDetails: customerDetails || {
      name: 'Bhanu Charan Reddy',
      phone: '+91 94402 09898',
      email: email,
      address: 'Villa 14, Royal Palm Residences, Jubilee Hills, Hyderabad - 500033'
    },
    trackingStage: 'Placed',
    status,
    stageHistory: [
      {
        stage: 'Placed',
        timestamp: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        note: 'Order placed & payment authorized successfully. Reserved with the Vastra Atelier.'
      }
    ],
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }),
    createdAt: new Date().toISOString()
  };

  orders.unshift(newOrder);
  writeJsonFile(ORDERS_FILE, orders);

  res.status(201).json({
    success: true,
    message: 'Order placed and payment confirmed successfully',
    order: newOrder
  });
});

// 2d. Get single order details
app.get('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const orders = readJsonFile(ORDERS_FILE, []);
  const order = orders.find(o => o.orderId === id || o.transactionId === id);

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  res.json({ success: true, order });
});

// 2e. Patron Profile: Get profile
app.get('/api/patron/profile', (req, res) => {
  const { email } = req.query;
  const patrons = readJsonFile(PATRONS_FILE, []);
  
  if (!email) {
    return res.json({ success: true, profile: patrons[0] || null });
  }

  const queryEmail = email.toLowerCase().trim();
  let patron = patrons.find(p => p.email?.toLowerCase().trim() === queryEmail);

  if (!patron) {
    // Generate default profile structure
    patron = {
      uid: `patron_${Date.now().toString(36)}`,
      name: queryEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email: queryEmail,
      phone: '+91 94402 09898',
      address: {
        house: 'Flat 402, Highgrove Suites',
        street: 'Jubilee Hills Road 36',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500033',
        landmark: 'Near Jubilee Club'
      },
      measurements: {
        chest: '40 inches',
        waist: '34 inches',
        kurtaLength: '42 inches',
        shoulder: '18 inches'
      },
      tier: 'Patron Club',
      memberSince: 'October 2026',
      updatedAt: new Date().toISOString()
    };
    patrons.push(patron);
    writeJsonFile(PATRONS_FILE, patrons);
  }

  res.json({ success: true, profile: patron });
});

// 2f. Patron Profile: Save / Update profile
app.post('/api/patron/profile', (req, res) => {
  const { email, name, phone, address, measurements } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  const patrons = readJsonFile(PATRONS_FILE, []);
  const queryEmail = email.toLowerCase().trim();
  const index = patrons.findIndex(p => p.email?.toLowerCase().trim() === queryEmail);

  let updatedProfile;
  if (index !== -1) {
    updatedProfile = {
      ...patrons[index],
      name: name || patrons[index].name,
      phone: phone || patrons[index].phone,
      address: address ? { ...patrons[index].address, ...address } : patrons[index].address,
      measurements: measurements ? { ...patrons[index].measurements, ...measurements } : patrons[index].measurements,
      updatedAt: new Date().toISOString()
    };
    patrons[index] = updatedProfile;
  } else {
    updatedProfile = {
      uid: `patron_${Date.now().toString(36)}`,
      email: queryEmail,
      name: name || queryEmail.split('@')[0],
      phone: phone || '+91 94402 09898',
      address: address || {},
      measurements: measurements || {},
      tier: 'Patron Club',
      memberSince: 'October 2026',
      updatedAt: new Date().toISOString()
    };
    patrons.push(updatedProfile);
  }

  writeJsonFile(PATRONS_FILE, patrons);
  res.json({ success: true, message: 'Profile updated successfully', profile: updatedProfile });
});

// 2g. Patron Orders: Get orders for authenticated patron
app.get('/api/patron/orders', (req, res) => {
  const { email } = req.query;
  const orders = readJsonFile(ORDERS_FILE, []);

  if (!email || email === 'all') {
    return res.json({ success: true, count: orders.length, orders });
  }

  const qEmail = email.toLowerCase().trim();
  const patronOrders = orders.filter(o => 
    o.patronEmail?.toLowerCase() === qEmail || 
    o.customerDetails?.email?.toLowerCase() === qEmail ||
    // For demo convenience, if patron is Bhanu, match any order with his phone or name
    (qEmail.includes('bhanu') && (o.customerDetails?.name?.toLowerCase().includes('bhanu') || o.customerDetails?.phone?.includes('94402')))
  );

  res.json({ success: true, count: patronOrders.length, orders: patronOrders });
});

// 2h. Patron Order: Advance 4-stage tracking state (Placed -> Atelier Tailoring -> Dispatched -> Delivered)
app.post('/api/patron/orders/:id/advance', (req, res) => {
  const { id } = req.params;
  const orders = readJsonFile(ORDERS_FILE, []);
  const order = orders.find(o => o.orderId === id || o.transactionId === id);

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  const stages = ['Placed', 'Atelier Tailoring', 'Dispatched', 'Delivered'];
  const currentIdx = stages.indexOf(order.trackingStage || 'Placed');
  const nextIdx = (currentIdx + 1) % stages.length;
  const nextStage = stages[nextIdx];

  const nowString = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const notesMap = {
    'Placed': 'Order placed & payment authorized successfully. Reserved with the Vastra Atelier.',
    'Atelier Tailoring': 'Garment hand-cut and assigned to master artisan. Zari and zardozi detailing underway.',
    'Dispatched': 'Hand-inspected, packed in luxury garment chamber, handed to white-glove insured courier.',
    'Delivered': 'Delivered in person and signed by recipient. We hope the ensemble graces your occasion beautifully.'
  };

  order.trackingStage = nextStage;
  if (!order.stageHistory) order.stageHistory = [];
  order.stageHistory.push({
    stage: nextStage,
    timestamp: nowString,
    note: notesMap[nextStage]
  });

  writeJsonFile(ORDERS_FILE, orders);
  res.json({ success: true, message: `Order tracking updated to ${nextStage}`, order });
});

// 3. Get catalog categories with metadata
app.get('/api/catalog/categories', (req, res) => {
  const { gender, occasion } = req.query;
  let categories = readJsonFile(CATEGORIES_FILE, []);

  if (gender && gender !== 'all') {
    categories = categories.filter(c => c.gender?.toLowerCase() === gender.toLowerCase());
  }

  if (occasion && occasion !== 'all') {
    categories = categories.filter(c =>
      c.applicableOccasions?.some(occ => occ.toLowerCase() === occasion.toLowerCase())
    );
  }

  categories.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  res.json({ success: true, count: categories.length, categories });
});

// 3b. Get single category by id or slug
app.get('/api/catalog/categories/:id', (req, res) => {
  const { id } = req.params;
  const categories = readJsonFile(CATEGORIES_FILE, []);
  const category = categories.find(c => c.id === id || c.slug === id.toLowerCase());

  if (!category) {
    return res.status(404).json({ success: false, error: 'Category not found' });
  }

  res.json({ success: true, category });
});

// 4. Get catalog PDFs
app.get('/api/catalog/catalogs', (req, res) => {
  const catalogs = readJsonFile(CATALOGS_FILE, []);
  res.json({ success: true, count: catalogs.length, catalogs });
});

// 4. Get import and audit report
app.get('/api/catalog/report', (req, res) => {
  const report = readJsonFile(REPORT_FILE, { status: 'Not available' });
  res.json({ success: true, report });
});

// 5. Submit customer inquiry
app.post('/api/catalog/inquiries', (req, res) => {
  const { customerName, contactNumber, email, productId, productName, productCode, requestedSize, requestedColor, message } = req.body;

  if (!customerName || (!contactNumber && !email)) {
    return res.status(400).json({ success: false, error: 'Name and contact info (phone or email) are required.' });
  }

  const inquiries = readJsonFile(INQUIRIES_FILE, []);
  const newInquiry = {
    id: `INQ-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
    customerName: customerName.trim(),
    contactNumber: contactNumber ? contactNumber.trim() : '',
    email: email ? email.trim() : '',
    productId: productId || '',
    productName: productName || 'General Inquiry',
    productCode: productCode || 'VAS-GEN',
    requestedSize: requestedSize || 'Made-to-Measure',
    requestedColor: requestedColor || 'As Shown',
    message: message ? message.trim() : '',
    status: 'New',
    createdAt: new Date().toISOString()
  };

  inquiries.unshift(newInquiry);
  writeJsonFile(INQUIRIES_FILE, inquiries);

  res.status(201).json({ success: true, message: 'Inquiry received successfully', inquiry: newInquiry });
});

// 6. Admin: Get all inquiries
app.get('/api/admin/inquiries', (req, res) => {
  const inquiries = readJsonFile(INQUIRIES_FILE, []);
  res.json({ success: true, count: inquiries.length, inquiries });
});

// 7. Admin: Update inquiry status
app.patch('/api/admin/inquiries/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const inquiries = readJsonFile(INQUIRIES_FILE, []);
  const inq = inquiries.find(i => i.id === id);

  if (!inq) {
    return res.status(404).json({ success: false, error: 'Inquiry not found' });
  }

  if (status) inq.status = status;
  writeJsonFile(INQUIRIES_FILE, inquiries);

  res.json({ success: true, inquiry: inq });
});

// 8. Admin: Update product details
app.put('/api/admin/products/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const products = readJsonFile(PRODUCTS_FILE, []);
  const index = products.findIndex(p => p.id === id || p.code === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  products[index] = {
    ...products[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  writeJsonFile(PRODUCTS_FILE, products);
  res.json({ success: true, product: products[index] });
});

// 9. Admin: Add product
app.post('/api/admin/products', (req, res) => {
  const newProduct = req.body;
  if (!newProduct.name || !newProduct.code) {
    return res.status(400).json({ success: false, error: 'Product name and code are required' });
  }

  const products = readJsonFile(PRODUCTS_FILE, []);
  const id = newProduct.id || newProduct.code.toLowerCase().replace(/[^a-z0-9]/g, '-');

  const created = {
    ...newProduct,
    id,
    published: newProduct.published ?? true,
    createdAt: new Date().toISOString()
  };

  products.push(created);
  writeJsonFile(PRODUCTS_FILE, products);

  res.status(201).json({ success: true, product: created });
});

// ================= PAGE ROUTES =================

// Dedicated Clothing Catalog Page
app.get('/clothing-catalog', (req, res) => {
  res.sendFile(path.join(__dirname, 'clothing-catalog.html'));
});

app.get('/clothing-catalog/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'clothing-catalog.html'));
});

// Dedicated Patron Profile Dashboard Page
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Home Page Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Vastra Atelier & Showroom running on http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please wait or stop the existing process.`);
  } else {
    console.error('Server error:', err);
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
