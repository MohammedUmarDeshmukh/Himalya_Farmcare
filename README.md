# Smart Agriculture Product Recommendation & Admin Management

**Himalaya FarmCare** — *"Serving Your Farm Is Our Duty"*

A comprehensive full-stack B.Tech major-project web application designed for agricultural treatment planning, acreage-based dosage calculation, database-driven smart product recommendations, secure authentication, and a complete administrative management dashboard with secure product image uploading.

---

## Technology Stack

- **Frontend:** React 18, Vite, React Router 6, Custom Responsive CSS.
- **Backend:** Node.js, Express.js (ES Modules), MongoDB Atlas, Mongoose 8.
- **Authentication & Security:** JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`), Role-Based Access Control (Admin / Farmer).
- **File Upload & Storage:** Multer for secure product image handling, local disk storage with modular cloud-ready architecture.

---

## Features Implemented (Phases 1–13)

1. **Branding & Layout (Phases 1–4):** Himalaya FarmCare design, responsive top navigation, landing page with live database counters, catalogue previews, and footer.
2. **Backend API Bootstrap (Phase 5):** Express REST API, CORS validation, Atlas DNS SRV resolution, and `/api/health` monitoring.
3. **Product Management API & Seed Data (Phase 6):** MongoDB Product model, CRUD endpoints, stock and pricing array support.
4. **Crop Management (Phase 7):** Crop model, API routes, and dynamic filter integration.
5. **Problem Management (Phase 8):** Agricultural problem classification (Insecticide, Fungicide, PGR, Special PGR).
6. **Application Method Management (Phase 9):** Delivery method definitions (Foliar Spray, Drip Irrigation).
7. **Smart Recommendation Engine (Phase 10):** Database matching algorithm based on farmer-selected crop, problem, application method, and spray sequence with acreage dosage calculations, quota tracking, and printable GST billing.
8. **User Registration & Authentication (Phase 11):** Secure JWT auth, bcrypt password hashing, farmer registration, login, session persistence, and privilege escalation guards.
9. **Admin Dashboard & Management (Phase 12):** Protected administrative dashboard at `/admin`, real-time MongoDB metrics, product management, crop management, problem management, application method management, farmer user management, and admin seed automation (`npm run seed:admin`).
10. **Product Image Upload & Management (Phase 13):** Modular Multer-based image uploading, format and size validation, unique filename generation, static image serving, image replacement/removal, and catalogue fallback display.

---

## Phase 13: Product Image Upload & Management

### Image Storage Architecture
- Uploads are safely stored locally in:
  ```text
  backend/uploads/products/
  ```
- Served statically via the Express backend route:
  ```text
  GET http://localhost:5000/uploads/products/<filename>
  ```
- Kept strictly out of source control (`.gitignore` protects `uploads/*` while maintaining directory scaffolding).
- Storage logic is modularized in `backend/src/middleware/uploadMiddleware.js` for easy transition to cloud storage (e.g. AWS S3 or Google Cloud Storage) if needed in future phases.

### File Upload Constraints & Security
- **Allowed MIME Types:** `image/jpeg`, `image/jpg`, `image/png`, `image/webp`.
- **Allowed Extensions:** `.jpg`, `.jpeg`, `.png`, `.webp`.
- **Maximum File Size:** 5 MB (`5 * 1024 * 1024` bytes). Exceeding files are rejected with HTTP 400.
- **Filename Sanitization:** Unique collision-free names: `product-<timestamp>-<random>.<ext>`.
- **Path Traversal Protection:** Absolute path validation and `path.basename()` extraction prevent directory traversal attacks.
- **Authorization:** Only authenticated administrators (`role: 'admin'`) can upload, update, or remove product images. Unauthenticated requests receive HTTP 401; farmer accounts receive HTTP 403.
- **Catalogue Fallback:** Products without an uploaded image automatically display `/products/res.jpg` or default numbered catalogue images. Broken image links are caught via `onError` fallbacks.

### Image Management API Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/products/upload-image` | Admin | Upload a standalone product image (`multipart/form-data`, field: `image`). Returns `{ imageUrl }`. |
| **PUT** | `/api/products/:id/image` | Admin | Replace image for an existing product. Deletes previous uploaded file from disk. |
| **DELETE** | `/api/products/:id/image` | Admin | Remove product image from product document and delete file from disk. |
| **GET** | `/uploads/products/:filename` | Public | Statically serve uploaded product images with proper MIME headers. |

---

## Folder Structure

```text
smart-agriculture/
├── frontend/                         # React/Vite Client
│   ├── public/products/              # Static product images (1.jpg to 20.jpg, res.jpg fallback)
│   └── src/
│       ├── components/               # Navbar, Cart, ProductCard, FilterPanel, AdminProtectedRoute, etc.
│       ├── context/                  # AuthContext (session, login, register, logout)
│       ├── layouts/                  # AdminLayout (sidebar, topbar, mobile drawer)
│       ├── pages/
│       │   ├── Landing.jsx           # Public hero and overview
│       │   ├── Home.jsx              # Product catalogue, dosage calculator & cart
│       │   ├── Login.jsx             # Farmer & admin login
│       │   ├── Register.jsx          # Farmer registration
│       │   ├── Profile.jsx           # Farmer profile & saved farm addresses (Phase 15)
│       │   ├── MyOrders.jsx          # Farmer order tracking, timeline & invoice PDF (Phase 14-15)
│       │   └── admin/                # Admin pages (Dashboard, Orders, Products, Crops, Problems, Methods, Users)
│       ├── components/               # OrderInvoiceModal, OrderTrackingTimeline, CheckoutModal, etc.
│       ├── services/                 # API services (orderService, adminService, authService, productService, etc.)
│       └── utils/                    # Recommendation logic, dosage formulas, formatters
├── backend/                          # Express REST API
│   ├── uploads/                      # Uploaded asset storage (git-ignored)
│   │   └── products/                 # Product image uploads
│   ├── src/
│   │   ├── config/db.js              # MongoDB Atlas connection with SRV DNS resolution
│   │   ├── controllers/              # orderController (CSV export, tracking), authController (profile, addresses), etc.
│   │   ├── middleware/               # authMiddleware (protect, authorize), uploadMiddleware (multer)
│   │   ├── models/                   # Order, User (with savedAddresses), Product, Crop, Problem, ApplicationMethod
│   │   ├── routes/                   # orderRoutes, adminRoutes, authRoutes, productRoutes, etc.
│   │   ├── seed/                     # Seed scripts (admin, products, crops, problems, methods)
│   │   ├── services/                 # recommendationService (Phase 10 engine)
│   │   ├── utils/                    # orderNumber generator, CSV sanitizer
│   │   └── server.js                 # Express server bootstrap & static file mounting
│   ├── .env.example                  # Environment configuration template
│   └── package.json
└── README.md
```

---

## Running the Application

### 1. Environment Configuration

In `backend/`:
```powershell
cd backend
Copy-Item .env.example .env
```
Ensure your `backend/.env` contains valid credentials:
```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/smartagriwebapp
PORT=5000
JWT_SECRET=your_jwt_secret_token_here
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
ADMIN_NAME=Himalaya FarmCare Admin
ADMIN_EMAIL=admin@himalayafarmcare.com
ADMIN_PASSWORD=YourAdminPassword123!
```

### 2. Seed Admin & Initial Data (One-Time)

```powershell
cd backend
npm run seed:admin
npm run seed:crops
npm run seed:problems
npm run seed:application-methods
npm run seed:products
```

### 3. Start the Backend API

```powershell
cd backend
npm run dev
```
Server starts on `http://localhost:5000`. Health check: `GET http://localhost:5000/api/health`.

### 4. Start the Frontend Client

```powershell
cd frontend
npm install
npm run dev
```
Client starts on `http://localhost:5173`.

### 5. Production Build

```powershell
cd frontend
npm run build
```
Generates production assets in `frontend/dist/`.
