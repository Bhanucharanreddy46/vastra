/**
 * VASTRA LUXURY CART & INSTANT CHECKOUT ENGINE
 * Handles cart state, slide-out drawer, instant UPI & card payment simulation,
 * and order generation.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'vastra_cart_items';
  const WHATSAPP_PHONE = '919440209898';

  // --- Cart State Management ---
  const CartStore = {
    get() {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        console.error('Failed to read cart', e);
        return [];
      }
    },
    save(items) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        window.dispatchEvent(new CustomEvent('vastra-cart-updated', { detail: { items } }));
      } catch (e) {
        console.error('Failed to save cart', e);
      }
    },
    add(product, size = '40', quantity = 1) {
      const items = this.get();
      const existing = items.find(it => it.id === product.id && it.selectedSize === size);
      if (existing) {
        existing.quantity += quantity;
      } else {
        items.push({
          id: product.id,
          code: product.code || 'VAS-GEN',
          name: product.name,
          price: typeof product.price === 'number' ? product.price : (parseInt(String(product.price).replace(/[^0-9]/g, '')) || 18500),
          image: product.image || '/catalog-images/vas-wed-001.jpg',
          category: product.category || 'Festive Couture',
          selectedSize: size,
          quantity: quantity
        });
      }
      this.save(items);
      return items;
    },
    updateQty(id, size, delta) {
      let items = this.get();
      const item = items.find(it => it.id === id && it.selectedSize === size);
      if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
          items = items.filter(it => !(it.id === id && it.selectedSize === size));
        }
      }
      this.save(items);
      return items;
    },
    remove(id, size) {
      let items = this.get();
      items = items.filter(it => !(it.id === id && it.selectedSize === size));
      this.save(items);
      return items;
    },
    clear() {
      this.save([]);
    },
    count() {
      return this.get().reduce((sum, it) => sum + (it.quantity || 1), 0);
    },
    subtotal() {
      return this.get().reduce((sum, it) => sum + ((it.price || 0) * (it.quantity || 1)), 0);
    }
  };

  // Expose global controller
  window.VastraCart = CartStore;

  function formatINR(num) {
    return '₹' + Number(num).toLocaleString('en-IN');
  }

  // --- Dynamic DOM Setup ---
  function initCartDOM() {
    if (document.getElementById('vastraCartRoot')) return;

    const container = document.createElement('div');
    container.id = 'vastraCartRoot';
    container.innerHTML = `
      <!-- Backdrop -->
      <div class="cart-backdrop" id="cartBackdrop"></div>

      <!-- Slide Drawer -->
      <aside class="cart-drawer" id="cartDrawer" role="dialog" aria-modal="true" aria-label="Shopping Bag">
        <div class="cart-drawer__head">
          <div style="display:flex; align-items:baseline; gap:10px;">
            <h2 class="cart-drawer__title">Shopping Bag</h2>
            <span class="label" id="cartHeadCount" style="color:var(--champagne, #D9C7A3)">(0)</span>
          </div>
          <button class="cart-close-btn" id="closeCartBtn" aria-label="Close Bag">
            <svg viewBox="0 0 14 14" width="14" height="14" stroke="currentColor" stroke-width="1.2"><path d="M1 1l12 12M13 1L1 13"/></svg>
          </button>
        </div>

        <div class="cart-drawer__body" id="cartItemsList">
          <!-- Populated dynamically -->
        </div>

        <div class="cart-drawer__foot" id="cartFooter">
          <div class="cart-summary-line">
            <span>Subtotal</span>
            <span id="cartSubtotal">₹0</span>
          </div>
          <div class="cart-summary-line">
            <span>Insured White-Glove Shipping</span>
            <span style="color:var(--champagne, #D9C7A3)">Complimentary</span>
          </div>
          <div class="cart-summary-line">
            <span>Luxury Keepsake Box</span>
            <span style="color:var(--champagne, #D9C7A3)">Included</span>
          </div>
          <div class="cart-summary-line total">
            <span>Total Payable</span>
            <span id="cartTotalPayable">₹0</span>
          </div>

          <button class="cart-btn-primary" id="startCheckoutBtn">
            <span>Instant UPI & Card Checkout</span>
            <span aria-hidden="true">→</span>
          </button>

          <button class="cart-btn-whatsapp" id="cartWhatsAppBtn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 7.44C8.95 7.44 8.68 7.5 8.46 7.74C8.24 7.98 7.62 8.56 7.62 9.73C7.62 10.9 8.47 12.03 8.6 12.2C8.73 12.37 10.28 14.75 12.65 15.77C14.62 16.62 15.02 16.45 15.46 16.41C15.9 16.37 16.88 15.83 17.08 15.26C17.28 14.7 17.28 14.21 17.22 14.11C17.16 14.01 17.01 13.95 16.78 13.84C16.55 13.72 15.43 13.17 15.22 13.1C15.01 13.02 14.86 12.98 14.71 13.21C14.56 13.44 14.13 13.95 14 14.1C13.87 14.25 13.74 14.27 13.51 14.16C13.28 14.04 12.54 13.8 11.66 13.02C10.98 12.41 10.52 11.66 10.39 11.43C10.26 11.2 10.37 11.08 10.49 10.96C10.6 10.86 10.73 10.68 10.85 10.54C10.97 10.4 11.01 10.29 11.09 10.14C11.17 9.99 11.13 9.86 11.07 9.74C11.01 9.63 10.56 8.52 10.37 8.06C10.19 7.62 10 7.68 9.86 7.67C9.73 7.67 9.58 7.66 9.42 7.66C9.27 7.66 9.11 7.44 9.11 7.44Z"/></svg>
            <span>Order via WhatsApp Concierge</span>
          </button>
        </div>
      </aside>

      <!-- Floating Bag Pill -->
      <div class="floating-cart-pill" id="floatingCartPill" role="button" aria-label="Open Shopping Bag">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <span class="label" style="font-weight:600">View Bag (<span id="floatingCartCount">0</span>)</span>
        <span id="floatingCartTotal" style="font-weight:600">₹0</span>
      </div>

      <!-- Instant Checkout Modal -->
      <dialog id="checkoutModal" aria-labelledby="checkoutModalTitle">
        <div class="checkout-modal-sheet">
          <button class="cart-close-btn" id="closeCheckoutBtn" style="position:absolute; top:20px; right:20px;" aria-label="Close">
            <svg viewBox="0 0 14 14" width="14" height="14" stroke="currentColor" stroke-width="1.2"><path d="M1 1l12 12M13 1L1 13"/></svg>
          </button>

          <div class="checkout-header">
            <span class="label" style="color:var(--champagne, #D9C7A3)">Vastra Atelier Checkout</span>
            <h2 id="checkoutModalTitle">Instant Payment & Delivery</h2>
            <p>Complete your order securely via Instant UPI or Card. All orders receive complimentary white-glove delivery.</p>
          </div>

          <form id="checkoutForm" onsubmit="event.preventDefault();" style="display:flex; flex-direction:column; gap:20px;">
            <!-- Customer Details -->
            <div>
              <span class="label" style="color:var(--beige, #A69B86); display:block; margin-bottom:12px;">1. Patron & Delivery Details</span>
              <div class="card-form-grid">
                <div>
                  <label class="label" style="display:block; margin-bottom:4px; color:var(--beige, #A69B86);" for="chkName">Full Name</label>
                  <input id="chkName" required placeholder="e.g. Himanandan Reddy" style="width:100%; border:0; border-bottom:1px solid rgba(241,234,219,0.3); padding:8px 0; color:var(--ivory, #F1EADB);">
                </div>
                <div>
                  <label class="label" style="display:block; margin-bottom:4px; color:var(--beige, #A69B86);" for="chkPhone">WhatsApp Phone</label>
                  <input id="chkPhone" required type="tel" placeholder="+91 94402 09898" style="width:100%; border:0; border-bottom:1px solid rgba(241,234,219,0.3); padding:8px 0; color:var(--ivory, #F1EADB);">
                </div>
                <div class="form-field-full">
                  <label class="label" style="display:block; margin-bottom:4px; color:var(--beige, #A69B86);" for="chkAddress">Delivery Address & Landmark</label>
                  <input id="chkAddress" required placeholder="Apartment / Suite, Street, Landmark" style="width:100%; border:0; border-bottom:1px solid rgba(241,234,219,0.3); padding:8px 0; color:var(--ivory, #F1EADB);">
                </div>
                <div>
                  <label class="label" style="display:block; margin-bottom:4px; color:var(--beige, #A69B86);" for="chkCity">City & State</label>
                  <input id="chkCity" required placeholder="Hyderabad, Telangana" style="width:100%; border:0; border-bottom:1px solid rgba(241,234,219,0.3); padding:8px 0; color:var(--ivory, #F1EADB);">
                </div>
                <div>
                  <label class="label" style="display:block; margin-bottom:4px; color:var(--beige, #A69B86);" for="chkPin">PIN Code</label>
                  <input id="chkPin" required placeholder="500081" style="width:100%; border:0; border-bottom:1px solid rgba(241,234,219,0.3); padding:8px 0; color:var(--ivory, #F1EADB);">
                </div>
              </div>
            </div>

            <!-- Payment Methods -->
            <div>
              <span class="label" style="color:var(--beige, #A69B86); display:block; margin-bottom:12px;">2. Payment Method Simulation</span>
              
              <div class="pay-tabs">
                <button type="button" class="pay-tab active" data-tab="upi">Instant UPI / QR</button>
                <button type="button" class="pay-tab" data-tab="card">Credit / Debit Card</button>
                <button type="button" class="pay-tab" data-tab="netbanking">Net Banking</button>
              </div>

              <!-- UPI Tab Panel -->
              <div id="tabPanelUpi" class="upi-qr-card">
                <p class="label" style="color:var(--champagne, #D9C7A3)">Scan & Pay via any UPI App</p>
                <div class="qr-frame" id="qrContainer">
                  <!-- Dynamic SVG QR Code -->
                  <svg id="dynamicQrSvg" width="160" height="160" viewBox="0 0 160 160"></svg>
                </div>
                <div style="font-size:0.85rem; color:var(--beige, #A69B86);">
                  UPI ID: <strong style="color:var(--ivory, #F1EADB)">vastra.luxury@icici</strong> &bull; Amount: <span id="upiAmountLabel" style="color:var(--champagne, #D9C7A3); font-weight:600;">₹0</span>
                </div>
                <div style="width:100%; border-top:1px solid rgba(241,234,219,0.1); padding-top:14px;">
                  <span class="label" style="font-size:0.65rem; color:var(--beige, #A69B86); display:block; margin-bottom:8px;">Instant Simulated 1-Click Pay:</span>
                  <div class="upi-instant-buttons">
                    <button type="button" class="upi-app-btn" data-simulate-app="Google Pay">
                      <span style="font-weight:600; color:#4285F4">G</span>Pay
                    </button>
                    <button type="button" class="upi-app-btn" data-simulate-app="PhonePe">
                      <span style="font-weight:600; color:#6739B7">Phone</span>Pe
                    </button>
                    <button type="button" class="upi-app-btn" data-simulate-app="Paytm">
                      <span style="font-weight:600; color:#00BAF2">Pay</span>tm
                    </button>
                    <button type="button" class="upi-app-btn" data-simulate-app="Instant UPI Approval" style="border-color:var(--champagne, #D9C7A3)">
                      Approve UPI
                    </button>
                  </div>
                </div>
              </div>

              <!-- Card Tab Panel -->
              <div id="tabPanelCard" style="display:none; flex-direction:column; gap:14px; background:rgba(17,16,14,0.6); padding:20px; border:1px solid rgba(217,199,163,0.2);">
                <div class="form-field-full">
                  <label class="label" style="display:block; margin-bottom:4px; color:var(--beige, #A69B86);" for="chkCardNumber">Card Number</label>
                  <input id="chkCardNumber" placeholder="4532 •••• •••• 8892" maxlength="19" style="width:100%; border:0; border-bottom:1px solid rgba(241,234,219,0.3); padding:8px 0; color:var(--ivory, #F1EADB); font-family:monospace; letter-spacing:0.1em;">
                </div>
                <div class="card-form-grid">
                  <div>
                    <label class="label" style="display:block; margin-bottom:4px; color:var(--beige, #A69B86);" for="chkCardExp">Valid Thru</label>
                    <input id="chkCardExp" placeholder="MM/YY" maxlength="5" style="width:100%; border:0; border-bottom:1px solid rgba(241,234,219,0.3); padding:8px 0; color:var(--ivory, #F1EADB);">
                  </div>
                  <div>
                    <label class="label" style="display:block; margin-bottom:4px; color:var(--beige, #A69B86);" for="chkCardCvv">CVV</label>
                    <input id="chkCardCvv" type="password" placeholder="•••" maxlength="4" style="width:100%; border:0; border-bottom:1px solid rgba(241,234,219,0.3); padding:8px 0; color:var(--ivory, #F1EADB);">
                  </div>
                </div>
                <div>
                  <label class="label" style="display:block; margin-bottom:4px; color:var(--beige, #A69B86);" for="chkCardHolder">Cardholder Name</label>
                  <input id="chkCardHolder" placeholder="Name on Card" style="width:100%; border:0; border-bottom:1px solid rgba(241,234,219,0.3); padding:8px 0; color:var(--ivory, #F1EADB);">
                </div>
                <p style="font-size:0.75rem; color:var(--beige, #A69B86); display:flex; align-items:center; gap:6px;">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--champagne, #D9C7A3)"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                  256-Bit SSL Encrypted Simulated Bank Gateway
                </p>
              </div>

              <!-- Netbanking Tab Panel -->
              <div id="tabPanelNetbanking" style="display:none; flex-direction:column; gap:12px; background:rgba(17,16,14,0.6); padding:20px; border:1px solid rgba(217,199,163,0.2);">
                <label class="label" style="color:var(--beige, #A69B86); display:block;">Select Your Bank:</label>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                  <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                    <input type="radio" name="bank" value="HDFC Bank" checked> HDFC Bank
                  </label>
                  <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                    <input type="radio" name="bank" value="ICICI Bank"> ICICI Bank
                  </label>
                  <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                    <input type="radio" name="bank" value="State Bank of India"> State Bank of India
                  </label>
                  <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                    <input type="radio" name="bank" value="Axis Bank"> Axis Bank
                  </label>
                </div>
              </div>
            </div>

            <!-- Submit Button & Processing State -->
            <div id="checkoutActions" style="display:flex; flex-direction:column; gap:12px; margin-top:8px;">
              <button type="button" class="cart-btn-primary" id="processPaymentBtn">
                <span>Authorize & Complete Payment (<span id="btnPayAmount">₹0</span>)</span>
                <span aria-hidden="true">✓</span>
              </button>
            </div>

            <div id="checkoutLoadingState" style="display:none; text-align:center; padding:20px; flex-direction:column; align-items:center; gap:12px;">
              <div class="spin" style="display:inline-block; width:28px; height:28px; border-width:2px; border-color:var(--champagne, #D9C7A3); border-right-color:transparent;"></div>
              <p class="label" style="color:var(--champagne, #D9C7A3); letter-spacing:0.2em;">Securing Simulated Bank Handshake...</p>
              <p style="font-size:0.8rem; color:var(--beige, #A69B86);">Verifying UPI token & reserving garments at Atelier...</p>
            </div>
          </form>
        </div>
      </dialog>

      <!-- Order Success Modal -->
      <dialog id="orderSuccessModal" aria-labelledby="orderSuccessTitle">
        <div class="checkout-modal-sheet receipt-sheet">
          <div class="receipt-stamp">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <span class="label" style="color:var(--champagne, #D9C7A3)">Order Confirmed & Settled</span>
            <h2 id="orderSuccessTitle" style="font-family:var(--display, 'Bodoni Moda', serif); font-size:1.8rem; margin-top:4px; text-transform:uppercase;">Thank You for Your Patronage</h2>
            <p id="receiptGreeting" style="color:var(--beige, #A69B86); margin-top:6px;">Your festive couture order has been processed successfully.</p>
          </div>

          <div style="background:rgba(17,16,14,0.7); border:1px solid rgba(217,199,163,0.2); width:100%; padding:20px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.8rem; color:var(--beige, #A69B86);">
              <span>Order Reference:</span>
              <strong id="receiptOrderId" style="color:var(--ivory, #F1EADB); font-family:monospace; letter-spacing:0.1em;">VAS-ORD-2026-XXXX</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.8rem; color:var(--beige, #A69B86);">
              <span>Transaction Ref:</span>
              <span id="receiptTxnId" style="color:var(--champagne, #D9C7A3); font-family:monospace;">TXN-UPI-...</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.8rem; color:var(--beige, #A69B86);">
              <span>Estimated Delivery:</span>
              <span id="receiptDeliveryDate" style="color:var(--ivory, #F1EADB)">4-6 Business Days</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.95rem; font-family:var(--display, 'Bodoni Moda', serif); color:var(--ivory, #F1EADB); border-top:1px solid rgba(241,234,219,0.1); padding-top:10px; margin-top:8px;">
              <span>Amount Paid:</span>
              <span id="receiptAmountPaid" style="color:var(--champagne, #D9C7A3)">₹0</span>
            </div>
          </div>

          <div id="receiptItemsContainer" style="width:100%; max-height:160px; overflow-y:auto; border:1px solid rgba(241,234,219,0.08); padding:10px;">
            <!-- Item rows -->
          </div>

          <div style="display:flex; flex-direction:column; gap:10px; width:100%;">
            <a href="/profile.html" class="cart-btn-primary" style="text-decoration:none; text-align:center; background:var(--champagne, #D9C7A3); color:var(--ink, #11100E); justify-content:center;">
              <span>Track in My Profile (4 Stages) →</span>
            </a>
            <a id="receiptWhatsAppLink" target="_blank" rel="noopener noreferrer" class="cart-btn-whatsapp" style="text-decoration:none;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 7.44C8.95 7.44 8.68 7.5 8.46 7.74C8.24 7.98 7.62 8.56 7.62 9.73C7.62 10.9 8.47 12.03 8.6 12.2C8.73 12.37 10.28 14.75 12.65 15.77C14.62 16.62 15.02 16.45 15.46 16.41C15.9 16.37 16.88 15.83 17.08 15.26C17.28 14.7 17.28 14.21 17.22 14.11C17.16 14.01 17.01 13.95 16.78 13.84C16.55 13.72 15.43 13.17 15.22 13.1C15.01 13.02 14.86 12.98 14.71 13.21C14.56 13.44 14.13 13.95 14 14.1C13.87 14.25 13.74 14.27 13.51 14.16C13.28 14.04 12.54 13.8 11.66 13.02C10.98 12.41 10.52 11.66 10.39 11.43C10.26 11.2 10.37 11.08 10.49 10.96C10.6 10.86 10.73 10.68 10.85 10.54C10.97 10.4 11.01 10.29 11.09 10.14C11.17 9.99 11.13 9.86 11.07 9.74C11.01 9.63 10.56 8.52 10.37 8.06C10.19 7.62 10 7.68 9.86 7.67C9.73 7.67 9.58 7.66 9.42 7.66C9.27 7.66 9.11 7.44 9.11 7.44Z"/></svg>
              <span>Track / Consult via WhatsApp Concierge</span>
            </a>
            <button type="button" class="cart-btn-primary" id="finishOrderBtn">
              <span>Continue Exploring Vastra</span>
            </button>
          </div>
        </div>
      </dialog>
    `;
    document.body.appendChild(container);
    bindCartEvents();
  }

  // --- Dynamic Procedural QR Code generator ---
  function drawProceduralQR(svgEl, amount) {
    if (!svgEl) return;
    const size = 160;
    const modules = 25; // 25x25 grid
    const cellSize = size / modules;
    let paths = '';

    // Seed pseudorandom using amount
    let seed = 42 + (amount % 997);
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // Draw position detection patterns (3 corners)
    const drawCorner = (startX, startY) => {
      // 7x7 outer square
      paths += `<rect x="${startX * cellSize}" y="${startY * cellSize}" width="${7 * cellSize}" height="${7 * cellSize}" fill="#11100E"/>`;
      paths += `<rect x="${(startX + 1) * cellSize}" y="${(startY + 1) * cellSize}" width="${5 * cellSize}" height="${5 * cellSize}" fill="#FFFFFF"/>`;
      paths += `<rect x="${(startX + 2) * cellSize}" y="${(startY + 2) * cellSize}" width="${3 * cellSize}" height="${3 * cellSize}" fill="#11100E"/>`;
    };

    drawCorner(0, 0);
    drawCorner(modules - 7, 0);
    drawCorner(0, modules - 7);

    // Random noise for the rest of data modules
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        // Skip corner finder patterns
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= modules - 8) ||
          (r >= modules - 8 && c < 8)
        ) {
          continue;
        }
        if (rnd() > 0.52) {
          paths += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize - 0.2}" height="${cellSize - 0.2}" fill="#11100E"/>`;
        }
      }
    }

    svgEl.innerHTML = paths;
  }

  // --- Render Cart Drawer Content ---
  function renderCartDrawer() {
    const listEl = document.getElementById('cartItemsList');
    const headCountEl = document.getElementById('cartHeadCount');
    const subtotalEl = document.getElementById('cartSubtotal');
    const totalEl = document.getElementById('cartTotalPayable');
    const btnPayAmount = document.getElementById('btnPayAmount');
    const upiAmountLabel = document.getElementById('upiAmountLabel');
    const floatingPill = document.getElementById('floatingCartPill');
    const floatingCount = document.getElementById('floatingCartCount');
    const floatingTotal = document.getElementById('floatingCartTotal');

    const items = CartStore.get();
    const count = CartStore.count();
    const subtotal = CartStore.subtotal();

    // Update Nav Badges across page
    document.querySelectorAll('.cart-count-badge').forEach(el => {
      el.textContent = String(count);
    });

    if (headCountEl) headCountEl.textContent = `(${count})`;
    if (subtotalEl) subtotalEl.textContent = formatINR(subtotal);
    if (totalEl) totalEl.textContent = formatINR(subtotal);
    if (btnPayAmount) btnPayAmount.textContent = formatINR(subtotal);
    if (upiAmountLabel) upiAmountLabel.textContent = formatINR(subtotal);

    // Floating pill visibility
    if (floatingPill && floatingCount && floatingTotal) {
      floatingCount.textContent = String(count);
      floatingTotal.textContent = formatINR(subtotal);
      if (count > 0) {
        floatingPill.classList.add('is-visible');
      } else {
        floatingPill.classList.remove('is-visible');
      }
    }

    if (!listEl) return;

    if (items.length === 0) {
      listEl.innerHTML = `
        <div class="cart-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <p class="serif-it" style="font-size:1.15rem; color:var(--ivory, #F1EADB);">Your shopping bag is empty.</p>
          <p>Discover our Festive Collection and bespoke occasion wear to add curated garments to your bag.</p>
          <a href="#festive" class="card-add-bag-btn" id="emptyExploreBtn" style="margin-top:10px;">Explore Festive Collection</a>
        </div>
      `;
      const exploreBtn = document.getElementById('emptyExploreBtn');
      if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
          closeCart();
        });
      }
      return;
    }

    let html = '';
    items.forEach(item => {
      html += `
        <article class="cart-item">
          <img class="cart-item__thumb" src="${item.image}" alt="${item.name}">
          <div class="cart-item__details">
            <h3 class="cart-item__name">${item.name}</h3>
            <span class="cart-item__meta">CODE: ${item.code} &bull; SIZE: ${item.selectedSize}</span>
            <span class="cart-item__price">${formatINR(item.price)}</span>
            <div class="cart-item__controls">
              <button class="cart-qty-btn" data-action="dec" data-id="${item.id}" data-size="${item.selectedSize}" aria-label="Decrease quantity">-</button>
              <span class="cart-qty-num">${item.quantity}</span>
              <button class="cart-qty-btn" data-action="inc" data-id="${item.id}" data-size="${item.selectedSize}" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <button class="cart-item__remove" data-action="del" data-id="${item.id}" data-size="${item.selectedSize}" aria-label="Remove item">
            <svg viewBox="0 0 14 14" width="14" height="14" stroke="currentColor" stroke-width="1.2"><path d="M1 1l12 12M13 1L1 13"/></svg>
          </button>
        </article>
      `;
    });

    listEl.innerHTML = html;

    // Attach quantity and delete listeners
    listEl.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget;
        const action = target.dataset.action;
        const id = target.dataset.id;
        const size = target.dataset.size;
        if (!id || !size) return;

        if (action === 'inc') {
          CartStore.updateQty(id, size, 1);
        } else if (action === 'dec') {
          CartStore.updateQty(id, size, -1);
        } else if (action === 'del') {
          CartStore.remove(id, size);
        }
        renderCartDrawer();
      });
    });
  }

  // --- Open & Close Helpers ---
  function openCart() {
    renderCartDrawer();
    const backdrop = document.getElementById('cartBackdrop');
    const drawer = document.getElementById('cartDrawer');
    if (backdrop && drawer) {
      backdrop.classList.add('is-open');
      drawer.classList.add('is-open');
    }
  }

  function closeCart() {
    const backdrop = document.getElementById('cartBackdrop');
    const drawer = document.getElementById('cartDrawer');
    if (backdrop && drawer) {
      backdrop.classList.remove('is-open');
      drawer.classList.remove('is-open');
    }
  }

  // --- Checkout Flow ---
  function openCheckout() {
    closeCart();
    const subtotal = CartStore.subtotal();
    if (subtotal <= 0) {
      alert('Your shopping bag is empty. Please add items to checkout.');
      return;
    }

    // Auto-fill from active patron session if available
    if (window.VastraAuth?.getUser()) {
      const patron = window.VastraAuth.getUser();
      const nameInput = document.getElementById('chkName');
      const phoneInput = document.getElementById('chkPhone');
      const addressInput = document.getElementById('chkAddress');
      const cityInput = document.getElementById('chkCity');
      const pinInput = document.getElementById('chkPin');

      if (nameInput && !nameInput.value) nameInput.value = patron.name || '';
      if (phoneInput && !phoneInput.value) phoneInput.value = patron.phone || '+91 94402 09898';
      if (addressInput && !addressInput.value) addressInput.value = patron.address?.house ? `${patron.address.house}, ${patron.address.street || ''}` : 'Villa 14, Royal Palm Residences, Road 36';
      if (cityInput && !cityInput.value) cityInput.value = patron.address?.city || 'Hyderabad';
      if (pinInput && !pinInput.value) pinInput.value = patron.address?.pincode || '500033';
    }

    const modal = document.getElementById('checkoutModal');
    const qrSvg = document.getElementById('dynamicQrSvg');
    if (qrSvg) {
      drawProceduralQR(qrSvg, subtotal);
    }
    if (modal) {
      modal.showModal();
    }
  }

  function closeCheckout() {
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.close();
  }

  // Simulate payment processing and generate order confirmation
  async function executePayment(paymentMethod) {
    const actionsBox = document.getElementById('checkoutActions');
    const loadingState = document.getElementById('checkoutLoadingState');
    if (actionsBox) actionsBox.style.display = 'none';
    if (loadingState) loadingState.style.display = 'flex';

    const patronUser = window.VastraAuth?.getUser();

    const nameInput = document.getElementById('chkName');
    const phoneInput = document.getElementById('chkPhone');
    const addressInput = document.getElementById('chkAddress');
    const cityInput = document.getElementById('chkCity');
    const pinInput = document.getElementById('chkPin');

    const patronName = nameInput?.value?.trim() || patronUser?.name || 'Bhanu Charan Reddy';
    const patronPhone = phoneInput?.value?.trim() || patronUser?.phone || '+91 94402 09898';
    const patronEmail = patronUser?.email || 'kmbhanucharanreddy@gmail.com';
    const patronAddress = `${addressInput?.value || 'Villa 14, Royal Palm Residences, Road 36'}, ${cityInput?.value || 'Hyderabad'} - ${pinInput?.value || '500033'}`;

    const items = CartStore.get();
    const amount = CartStore.subtotal();

    // 1.4s luxury animation handshake
    await new Promise(r => setTimeout(r, 1400));

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          amount,
          paymentMethod,
          patronEmail,
          patronId: patronUser?.uid || 'patron_bhanu_001',
          customerDetails: {
            name: patronName,
            phone: patronPhone,
            email: patronEmail,
            address: patronAddress
          }
        })
      });

      const data = await response.json();
      const order = data.order || {
        orderId: `VAS-ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        transactionId: `TXN-${paymentMethod.toUpperCase().replace(/\s+/g, '-')}-${Date.now().toString(36).toUpperCase()}`,
        amount,
        estimatedDelivery: '4-6 Business Days'
      };

      // Reset loading state
      if (actionsBox) actionsBox.style.display = 'flex';
      if (loadingState) loadingState.style.display = 'none';
      closeCheckout();

      // Show Order Success Receipt
      showOrderSuccess(order, patronName, items);
      CartStore.clear();
      renderCartDrawer();
    } catch (err) {
      console.error('Order submission error:', err);
      // Fallback display
      if (actionsBox) actionsBox.style.display = 'flex';
      if (loadingState) loadingState.style.display = 'none';
      closeCheckout();
      showOrderSuccess({
        orderId: `VAS-ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        transactionId: `TXN-SIMULATED-${Date.now().toString(36).toUpperCase()}`,
        amount,
        estimatedDelivery: '4-6 Business Days'
      }, patronName, items);
      CartStore.clear();
      renderCartDrawer();
    }
  }

  function showOrderSuccess(order, customerName, items) {
    const modal = document.getElementById('orderSuccessModal');
    const greetingEl = document.getElementById('receiptGreeting');
    const orderIdEl = document.getElementById('receiptOrderId');
    const txnIdEl = document.getElementById('receiptTxnId');
    const deliveryEl = document.getElementById('receiptDeliveryDate');
    const amountEl = document.getElementById('receiptAmountPaid');
    const itemsEl = document.getElementById('receiptItemsContainer');
    const waLinkEl = document.getElementById('receiptWhatsAppLink');

    if (greetingEl) greetingEl.textContent = `Honored ${customerName}, your payment has been approved and your order is reserved.`;
    if (orderIdEl) orderIdEl.textContent = order.orderId;
    if (txnIdEl) txnIdEl.textContent = order.transactionId;
    if (deliveryEl) deliveryEl.textContent = order.estimatedDelivery || '4-6 Business Days';
    if (amountEl) amountEl.textContent = formatINR(order.amount);

    if (itemsEl) {
      itemsEl.innerHTML = items.map(it => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(241,234,219,0.06); font-size:0.8rem;">
          <div>
            <strong style="color:var(--ivory, #F1EADB)">${it.name}</strong>
            <span style="display:block; color:var(--beige, #A69B86); font-size:0.7rem;">Code: ${it.code} &bull; Size: ${it.selectedSize} &times; ${it.quantity}</span>
          </div>
          <span style="color:var(--champagne, #D9C7A3)">${formatINR(it.price * it.quantity)}</span>
        </div>
      `).join('');
    }

    if (waLinkEl) {
      const summaryText = encodeURIComponent(`Hello Vastra Atelier, I have just completed my order ${order.orderId} (Amount: ${formatINR(order.amount)}) via simulated checkout. Kindly share the dispatch tracking.`);
      waLinkEl.href = `https://wa.me/${WHATSAPP_PHONE}?text=${summaryText}`;
    }

    if (modal) modal.showModal();
  }

  // --- WhatsApp Cart Inquiry ---
  function dispatchWhatsAppCart() {
    const items = CartStore.get();
    if (!items.length) {
      alert('Your shopping bag is empty.');
      return;
    }
    const total = CartStore.subtotal();
    let msg = `Hello Vastra Atelier,\nI would like to place an order for the following bespoke ensembles:\n\n`;
    items.forEach((it, idx) => {
      msg += `${idx + 1}. ${it.name} (${it.code})\n   Size: ${it.selectedSize} | Qty: ${it.quantity} | Price: ${formatINR(it.price * it.quantity)}\n`;
    });
    msg += `\n*Total Payable: ${formatINR(total)}*\nPlease confirm availability and delivery timeframe.`;

    const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  // --- Bind Event Listeners ---
  function bindCartEvents() {
    // Backdrop click
    const backdrop = document.getElementById('cartBackdrop');
    if (backdrop) backdrop.addEventListener('click', closeCart);

    // Close button
    const closeBtn = document.getElementById('closeCartBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeCart);

    // Floating cart pill
    const floatingPill = document.getElementById('floatingCartPill');
    if (floatingPill) floatingPill.addEventListener('click', openCart);

    // Checkout button
    const startCheckout = document.getElementById('startCheckoutBtn');
    if (startCheckout) startCheckout.addEventListener('click', openCheckout);

    // WhatsApp Cart button
    const waCartBtn = document.getElementById('cartWhatsAppBtn');
    if (waCartBtn) waCartBtn.addEventListener('click', dispatchWhatsAppCart);

    // Close checkout button
    const closeChkBtn = document.getElementById('closeCheckoutBtn');
    if (closeChkBtn) closeChkBtn.addEventListener('click', closeCheckout);

    // Finish order button
    const finishOrderBtn = document.getElementById('finishOrderBtn');
    if (finishOrderBtn) {
      finishOrderBtn.addEventListener('click', () => {
        const modal = document.getElementById('orderSuccessModal');
        if (modal) modal.close();
      });
    }

    // Payment tab switcher
    const tabs = document.querySelectorAll('.pay-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const target = e.currentTarget.dataset.tab;

        const pUpi = document.getElementById('tabPanelUpi');
        const pCard = document.getElementById('tabPanelCard');
        const pNb = document.getElementById('tabPanelNetbanking');

        if (pUpi) pUpi.style.display = target === 'upi' ? 'flex' : 'none';
        if (pCard) pCard.style.display = target === 'card' ? 'flex' : 'none';
        if (pNb) pNb.style.display = target === 'netbanking' ? 'flex' : 'none';
      });
    });

    // 1-Click UPI App buttons
    document.querySelectorAll('[data-simulate-app]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const appName = e.currentTarget.dataset.simulateApp || 'UPI App';
        executePayment(`Instant UPI (${appName})`);
      });
    });

    // Authorize payment button
    const processBtn = document.getElementById('processPaymentBtn');
    if (processBtn) {
      processBtn.addEventListener('click', () => {
        const activeTab = document.querySelector('.pay-tab.active');
        const method = activeTab?.dataset.tab === 'card' ? 'Credit / Debit Card' : (activeTab?.dataset.tab === 'netbanking' ? 'Net Banking' : 'Instant UPI');
        executePayment(method);
      });
    }

    // Auto-bind any page buttons with data-open-cart
    document.querySelectorAll('[data-open-cart], #openCartBtn').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openCart();
      });
    });

    // Listen for custom cart update events
    window.addEventListener('vastra-cart-updated', () => {
      renderCartDrawer();
    });

    // Render initially
    renderCartDrawer();
  }

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartDOM);
  } else {
    initCartDOM();
  }

})();
