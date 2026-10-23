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
const PRODUCTS_FILE = path.join(__dirname, 'data', 'catalog_products.json');
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
