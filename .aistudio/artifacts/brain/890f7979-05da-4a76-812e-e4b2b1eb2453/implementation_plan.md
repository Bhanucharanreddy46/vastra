# Clothing Catalog & Product Showcase Architecture Plan

A dedicated, couture digital showroom and catalog library for Vastra, transforming 8 event-specific clothing catalog PDFs into an editorial shopping and bespoke inquiry experience with full administrative controls.

## User Review & Critical Decisions

> [!IMPORTANT]
> All 8 provided catalog PDFs have been analyzed and cataloged. Each design represents bespoke Indian celebration couture across key ceremonies (Wedding, Sangeeth, Haldi, Engagement, House Warming, Baby Shower, Naming Ceremony, Pre-Wedding).

- **Confirmed Catalog Source**: 8 original PDFs (`Wedding`, `Sangeeth`, `Haldi`, `ENGAGEMENT`, `House_warming_ceremony`, `Baby_shower`, `Naming_cermony`, `Pre_wedding`), totaling 45 reviewed pages.
- **Navigation & Integration**: Seamlessly linked via `/clothing-catalog` and accessible from the primary top navigation bar, mobile overlay menu, and hero CTA on the landing page.
- **Bespoke Inquiries**: Since luxury couture is made-to-measure, prices are marked as *"Price upon request / Bespoke Couture"*, accompanied by a 1-click WhatsApp order inquiry with pre-filled product codes and an integrated on-site inquiry form stored in the Admin Dashboard.
- **Original PDF Library**: Every catalog PDF is preserved as an individual, downloadable document with high-resolution page previews.

---

## 1. Overview & Core Concept

- **What It Does**: Adds an independent `/clothing-catalog` page to Vastra. Customers can filter by Occasion (Wedding, Sangeeth, Haldi, etc.) and by Recipient/Category (Bride, Groom, Women, Men, Kids, Baby, Couples), search by title/code/color, inspect high-resolution product cards and detailed modal views, send direct purchase inquiries, and browse/download the original 8 catalog PDFs.
- **Target Audience**: Brides, grooms, families, and luxury couture clients shopping for curated wedding and celebratory wardrobe ensembles.
- **Key Value**: Bridges traditional PDF lookbooks into an interactive, search-enabled digital atelier while preserving the brand's aesthetic.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Discovery & Exploration**: The customer clicks "Clothing Catalog" from the navigation. They arrive at an editorial banner introducing the collections with quick category chips (All, Wedding, Sangeeth, Haldi, Engagement, House Warming, Baby Shower, Naming Ceremony, Pre-Wedding) and audience filters (Bride, Groom, Kids, etc.).
2. **Search & Refinement**: Real-time instant search matches product names, codes (e.g. `VAS-WED-001`), fabrics, and hues. Results update instantly without page reloads.
3. **Product Inspection**: Clicking any card opens a contiguous Product Detail Modal displaying high-resolution garment imagery, official Vastra product code, artisanal description, fabric and craft notes, available custom sizing (Made-to-Measure, XS–XXL, Custom), and bespoke inquiry actions.
4. **Order Inquiry**: The customer clicks "Inquire via WhatsApp" (pre-populating the product name and code) or fills out the on-site inquiry form (saved to the database and viewable by the brand administrator).
5. **Catalog PDF Library**: Customers can switch to the "Download Catalogs" tab or scroll to the library section to preview all 8 occasion PDFs, view individual pages in a full-screen viewer, or download the original high-resolution PDFs.
6. **Admin Management**: Accessible via `/clothing-catalog?admin=true` or an admin quick-toggle. The administrator can edit product titles, descriptions, categories, and codes; toggle published/draft state; review customer inquiries; and view the complete PDF processing report.

### Visual Identity & Theme
- **Aesthetic Direction**: High-end Indian luxury fashion atelier (consistent with Vastra's existing dark charcoal `#11100E`, warm ivory `#F1EADB`, and antique champagne gold `#D9C7A3`).
- **Typography**: `Bodoni Moda` for regal editorial headlines; `Jost` for crisp, unboxed sans-serif metadata, navigation, and tabular figures.
- **Card Design**: Strict zero-pill discipline. Imagery occupies 70% of card height on a deep dark ground with hairline borders (`rgba(241,234,219,.12)`), subtle lift on hover, unboxed typographic metadata separated by `·`, and aligned action buttons.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full-Stack Static + API Integration on Express**
  - *Chosen Approach*: Expand `server.js` with structured REST APIs (`/api/catalog/products`, `/api/catalog/catalogs`, `/api/catalog/inquiries`) backed by a persistent JSON store, while serving `/clothing-catalog` either as a client-side route or standalone HTML/JS page.
  - *Why*: Maintains instant zero-rebuild runtime responsiveness, requires no heavy external frameworks, and guarantees 100% compatibility with the existing port 3000 server.
- **Decision 2: Image Extraction & Slicing Strategy**
  - *Chosen Approach*: Systematically slice and extract the distinct clothing designs from each PDF page into clean, high-resolution web assets stored in `/public/catalog-images/`, paired with Ghostscript/canvas fallback rendering.
  - *Why*: Allows true individual product grids, zoomable detail views, and fast CDN-like loading without requiring users to download giant PDFs to see individual garments.
- **Decision 3: Non-Destructive Codebase Preservation**
  - *Chosen Approach*: Keep the existing `index.html` landing page 100% intact, adding a stylish "Catalog" nav link and hero button that routes smoothly to `/clothing-catalog`.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Vastra Web Platform                             │
├───────────────────────────────────┬────────────────────────────────────┤
│           Public Views            │          Admin Operations          │
│  • Landing Page (index.html)      │  • Admin Product Editor            │
│  • Clothing Catalog (/clothing)   │  • PDF Catalog Manager             │
│  • Product Detail Modal           │  • Customer Inquiry Inbox          │
│  • Download Catalogs Library      │  • Extraction Audit Report         │
└─────────────────┬─────────────────┴──────────────────┬─────────────────┘
                  │                                    │
                  ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Express API Layer (server.js)                       │
│  • GET  /api/products          (Search, filter by occasion/role)       │
│  • GET  /api/products/:id      (Single product details)                │
│  • POST /api/inquiries         (Capture customer inquiry)              │
│  • GET  /api/catalogs          (PDF metadata & download endpoints)     │
│  • POST /api/admin/products    (Update/create/publish products)        │
│  • GET  /api/admin/inquiries   (Review customer inquiries)             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Data & Asset Storage                              │
│  • /data/catalog_products.json  (Structured product catalog records)   │
│  • /data/inquiries.json         (Submitted customer inquiries)         │
│  • /public/catalog-images/      (Extracted individual garment images)  │
│  • /public/assets/aistudio/*.pdf(Original authoritative PDF catalogs)  │
└────────────────────────────────────────────────────────────────────────┘
```

### Extracted Catalog Inventory Summary
1. **Baby Shower (`Baby_shower_48fc727b.pdf`)**: 6 pages
   - Couples Maternity Ensembles (Ruffled blush gown, Banarasi coord, Chikankari set)
   - Women's Tulle & Organza Maternity Gowns
   - Men's Embroidered Sherwanis & Pastel Kurtas
2. **Engagement (`ENGAGEMENT_d957291d.pdf`)**: 5 pages
   - Bridal Couture (Petal Applique Lehenga, Draped Ombre Gown, Crimson Kalidar)
   - Groom Couture (Black Velvet Bandhgala, Pichwai Kurta, Rust Jodhpuri)
   - Kids Girls & Boys (Lotus Choli, Sharara, Dapper Tweed Suit, Bandi Kurta)
3. **Haldi Ceremony (`Haldi__0ce6bdf7.pdf`)**: 5 pages
   - Groom's Festive Kurtas (Ombre Yellow Embroidered Kurta, Kalamkari Stole Set)
   - Bride's Sunny Lehengas (Tiered Sharara Cape, Mirror-Work & Miniature Art Lehenga)
   - Kids Haldi Wear (Leheriya Sets, Tropical Tree Kurta, Pearl Cape Choli)
4. **House Warming (`House_warming_ceremony_28991031.pdf`)**: 6 pages
   - Men's Heritage Kurtas & Dhotis
   - Women's Classic Lehengas & Saffron Silk Sarees
   - Boys Elephant Embroidered Kurtas & Girls Brocade Skirts
5. **Pre-Wedding (`Pre_wedding` / `Maroon_and_Pink_Elegant...pdf`)**: 5 pages
   - Western & Indo-Western Evening Gowns & Tuxedos
   - Men's Double-Breasted Tailored Suits & Groom Silhouettes
   - Bride's Cascading High-Low Ruffle Gowns
6. **Naming Ceremony (`Naming_cermony_a8dcb215.pdf`)**: 7 pages
   - Family Color-Coordinated Sets (Sky Blue, Kasavu Mundu & Sage Organza)
   - Baby Girls Luxury Frocks (Tulip Organza, Pearl Cloud Frock, Pattu Pavada)
   - Baby Boys Heritage Sets (Ivory Gold Angrakha, Velvet Deer Bandhgala, Lion Vest)
7. **Sangeeth Celebration (`Sangeeth_505cd679.pdf`)**: 5 pages
   - Groom's Glamour Wear (Sequin Tuxedos, Asymmetric Velvet Bandhgalas, Embroidered Sherwanis)
   - Bride's Cocktail & Sangeeth Lehengas (Molten Gold Gown, Chevron Sequin Lehenga, Cape Saree)
   - Kids Glamour Party Outfits (Velvet bow gowns, Aqua blazer, Peacock embroidered kurtas)
8. **Royal Wedding (`Wedding__10459534.pdf`)**: 6 pages
   - Bride & Groom Royal Coordinates (Emerald Zardozi, Ice Blue Palace Pair, Navy Regal Pair)
   - Royal Groom Sherwanis (Brocade Angrakhas, Rose Gold Sherwani, Ivory Heritage)
   - Royal Bridal Lehengas (Lotus Kalidar, Torani Mustard Silk, Banarasi Crimson)
   - Kids Royal Wedding Outfits (Mirror-work lehengas, Peacock velvet bandhgalas)

---

## 5. Verification & Testing Checklist
- [ ] `/clothing-catalog` loads fast with clean luxury styling matching Vastra.
- [ ] All 8 catalog PDFs are downloadable and readable in-browser without corruption.
- [ ] Search and category filters dynamically filter products across Occasion and Recipient.
- [ ] Product details modal opens smoothly with complete specifications and high-resolution images.
- [ ] WhatsApp inquiry link generates pre-filled message with product title and code.
- [ ] On-site inquiry submission validates inputs and logs the inquiry to admin storage.
- [ ] Admin dashboard enables editing, unpublishing/publishing, and review.
- [ ] Existing home page remains 100% operational with smooth navigation links.
- [ ] Responsive behavior verified on mobile, tablet, and desktop viewports.
