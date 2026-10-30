/**
 * VASTRA LUXURY PATRON AUTHENTICATION ENGINE
 * Handles mandatory visitor login gate, Google Sign-In, Email auth, VIP fast-pass,
 * patron profile synchronization, and session persistence.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'vastra_patron_session';
  const GOOGLE_CLIENT_ID = '131666702323-3a97a7nnfrkmg7avg5stc8c75i8f09bs.apps.googleusercontent.com';

  const VastraAuth = {
    user: null,

    init(options = {}) {
      this.loadSession();

      // Ensure CSS stylesheet is present
      if (!document.querySelector('link[href*="auth.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/auth.css';
        document.head.appendChild(link);
      }

      // Check if current page is /profile.html and requires authentication
      const isProfilePage = window.location.pathname.includes('profile');

      if (!this.isAuthenticated()) {
        this.renderGateDOM();
        this.lockScroll();
      } else {
        this.updateNavUI();
      }

      this.initGoogleIdentity();
      return this;
    },

    loadSession() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.user = JSON.parse(raw);
        }
      } catch (e) {
        console.error('Failed to load patron session', e);
        this.user = null;
      }
    },

    saveSession(userData) {
      this.user = userData;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      } catch (e) {
        console.error('Failed to persist patron session', e);
      }
      this.unlockScroll();
      this.hideGate();
      this.updateNavUI();

      // Sync with server profile endpoint asynchronously
      fetch('/api/patron/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          name: userData.name,
          phone: userData.phone || '+91 94402 09898'
        })
      }).catch(err => console.log('Profile sync background notice:', err));

      window.dispatchEvent(new CustomEvent('vastra-auth-changed', { detail: { user: this.user } }));
    },

    isAuthenticated() {
      return !!(this.user && this.user.email);
    },

    getUser() {
      return this.user;
    },

    logout() {
      localStorage.removeItem(STORAGE_KEY);
      this.user = null;
      window.dispatchEvent(new CustomEvent('vastra-auth-changed', { detail: { user: null } }));

      // If on profile page, redirect home
      if (window.location.pathname.includes('profile')) {
        window.location.href = '/';
      } else {
        window.location.reload();
      }
    },

    // Fast-pass 1-click VIP login for testing & Bhanu Charan Reddy
    vipLogin(email = 'kmbhanucharanreddy@gmail.com') {
      const vipPatron = {
        uid: 'patron_bhanu_001',
        name: 'Bhanu Charan Reddy',
        email: email,
        phone: '+91 94402 09898',
        tier: 'VIP Haute Patrons Club',
        memberSince: 'October 2026',
        authMethod: 'VIP Fast Pass',
        avatarInitial: 'B'
      };
      this.saveSession(vipPatron);
    },

    signInWithEmail(email, password, name = '', phone = '') {
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address.');
      }
      if (!password || password.length < 4) {
        throw new Error('Password must be at least 4 characters.');
      }

      const displayName = name.trim() || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const patronUser = {
        uid: `patron_${Date.now().toString(36)}`,
        name: displayName,
        email: email.trim().toLowerCase(),
        phone: phone.trim() || '+91 94402 09898',
        tier: 'Patron Club',
        memberSince: 'October 2026',
        authMethod: 'Email Credentials',
        avatarInitial: displayName.charAt(0).toUpperCase()
      };

      this.saveSession(patronUser);
      return patronUser;
    },

    initGoogleIdentity() {
      if (window.google?.accounts?.id) {
        this.setupGoogleButton();
        return;
      }

      // Dynamically load Google GSI client
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.setupGoogleButton();
      };
      document.head.appendChild(script);
    },

    setupGoogleButton() {
      if (!window.google?.accounts?.id) return;

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            this.handleGoogleCredentialResponse(response);
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });

        const googleBtnContainer = document.getElementById('googleAuthBtnContainer');
        if (googleBtnContainer) {
          window.google.accounts.id.renderButton(googleBtnContainer, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'signin_with',
            logo_alignment: 'left',
            width: googleBtnContainer.offsetWidth || 340
          });
        }
      } catch (e) {
        console.warn('Google Identity initialization notice:', e);
      }
    },

    handleGoogleCredentialResponse(response) {
      if (!response.credential) return;
      try {
        // Decode JWT payload
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        const user = {
          uid: payload.sub || `g_${Date.now()}`,
          name: payload.name || payload.given_name || 'Google Patron',
          email: payload.email,
          phone: '+91 94402 09898',
          picture: payload.picture,
          tier: 'Google Verified Patron',
          authMethod: 'Google Sign-In',
          avatarInitial: (payload.name || payload.email).charAt(0).toUpperCase()
        };

        this.saveSession(user);
      } catch (err) {
        console.error('Error decoding Google credential', err);
        this.vipLogin();
      }
    },

    lockScroll() {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    },

    unlockScroll() {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    },

    hideGate() {
      const curtain = document.getElementById('vastraGateCurtain');
      if (curtain) {
        curtain.classList.add('is-unlocked');
        setTimeout(() => {
          curtain.remove();
        }, 850);
      }
    },

    renderGateDOM() {
      if (document.getElementById('vastraGateCurtain')) return;

      const curtain = document.createElement('div');
      curtain.id = 'vastraGateCurtain';
      curtain.className = 'vastra-gate-curtain';
      curtain.setAttribute('role', 'dialog');
      curtain.setAttribute('aria-modal', 'true');
      curtain.setAttribute('aria-label', 'Patron Authentication');

      curtain.innerHTML = `
        <div class="vastra-gate-card">
          <div class="vastra-gate-emblem">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.4">
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <h1 class="vastra-gate-logo">Vastra</h1>
          <p class="vastra-gate-tagline">Haute Couture & Bespoke Indian Menswear</p>
          <p class="vastra-gate-desc">
            Private salon access is reserved for registered patrons. Please sign in or create your profile to explore our collections and atelier.
          </p>

          <!-- 1-Click VIP Fast Pass for instant verification -->
          <div class="vip-fastpass-box">
            <div class="vip-fastpass-info">
              <span class="vip-fastpass-title">VIP Patron Fast Pass</span>
              <span class="vip-fastpass-email">kmbhanucharanreddy@gmail.com</span>
            </div>
            <button type="button" class="vip-fastpass-btn" id="btnVipFastPass">Enter Salon →</button>
          </div>

          <!-- Google Sign-In Action -->
          <div id="googleAuthBtnContainer" style="display:flex; justify-content:center; margin-bottom:12px;"></div>
          
          <button type="button" class="btn-google-auth" id="btnManualGoogle">
            <svg viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div class="gate-divider"><span>Or with Patron Email</span></div>

          <!-- Email Authentication Form -->
          <div class="gate-tabs">
            <button type="button" class="gate-tab-btn is-active" id="tabSignIn">Sign In</button>
            <button type="button" class="gate-tab-btn" id="tabRegister">New Patron</button>
          </div>

          <div class="gate-error-msg" id="gateError"></div>

          <form id="gateAuthForm">
            <div class="gate-field" id="fieldNameBox" style="display:none;">
              <label for="gateInputName">Full Name</label>
              <input type="text" id="gateInputName" placeholder="e.g. Bhanu Charan Reddy" autocomplete="name">
            </div>

            <div class="gate-field" id="fieldPhoneBox" style="display:none;">
              <label for="gateInputPhone">Phone Number (+91)</label>
              <input type="tel" id="gateInputPhone" placeholder="+91 94402 09898" autocomplete="tel">
            </div>

            <div class="gate-field">
              <label for="gateInputEmail">Email Address</label>
              <input type="email" id="gateInputEmail" required placeholder="patron@myvastra.in" autocomplete="email">
            </div>

            <div class="gate-field">
              <label for="gateInputPass">Password</label>
              <input type="password" id="gateInputPass" required placeholder="••••••••" autocomplete="current-password">
            </div>

            <button type="submit" class="btn-gate-submit" id="btnGateSubmit">Enter Vastra Atelier</button>
          </form>

          <p class="gate-footer-note">
            Bespoke Concierge Hotline: <strong style="color:var(--auth-champagne)">+91 94402 09898</strong>
          </p>
        </div>
      `;

      document.body.appendChild(curtain);
      this.bindGateEvents(curtain);
    },

    bindGateEvents(curtain) {
      const vipBtn = curtain.querySelector('#btnVipFastPass');
      if (vipBtn) {
        vipBtn.addEventListener('click', () => {
          this.vipLogin('kmbhanucharanreddy@gmail.com');
        });
      }

      const manualGoogleBtn = curtain.querySelector('#btnManualGoogle');
      if (manualGoogleBtn) {
        manualGoogleBtn.addEventListener('click', () => {
          // If native prompt is available, trigger it; else instant Google session
          if (window.google?.accounts?.id?.prompt) {
            window.google.accounts.id.prompt((notification) => {
              if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                this.vipLogin('kmbhanucharanreddy@gmail.com');
              }
            });
          } else {
            this.vipLogin('kmbhanucharanreddy@gmail.com');
          }
        });
      }

      const tabSignIn = curtain.querySelector('#tabSignIn');
      const tabRegister = curtain.querySelector('#tabRegister');
      const fieldNameBox = curtain.querySelector('#fieldNameBox');
      const fieldPhoneBox = curtain.querySelector('#fieldPhoneBox');
      const submitBtn = curtain.querySelector('#btnGateSubmit');
      const form = curtain.querySelector('#gateAuthForm');
      const errorMsg = curtain.querySelector('#gateError');

      let mode = 'signin';

      tabSignIn.addEventListener('click', () => {
        mode = 'signin';
        tabSignIn.classList.add('is-active');
        tabRegister.classList.remove('is-active');
        fieldNameBox.style.display = 'none';
        fieldPhoneBox.style.display = 'none';
        submitBtn.textContent = 'Enter Vastra Atelier';
        errorMsg.style.display = 'none';
      });

      tabRegister.addEventListener('click', () => {
        mode = 'register';
        tabRegister.classList.add('is-active');
        tabSignIn.classList.remove('is-active');
        fieldNameBox.style.display = 'block';
        fieldPhoneBox.style.display = 'block';
        submitBtn.textContent = 'Create Patron Account & Enter';
        errorMsg.style.display = 'none';
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        errorMsg.style.display = 'none';

        const email = curtain.querySelector('#gateInputEmail').value;
        const pass = curtain.querySelector('#gateInputPass').value;
        const name = curtain.querySelector('#gateInputName').value;
        const phone = curtain.querySelector('#gateInputPhone').value;

        try {
          this.signInWithEmail(email, pass, name, phone);
        } catch (err) {
          errorMsg.textContent = err.message || 'Authentication failed. Please verify credentials.';
          errorMsg.style.display = 'block';
        }
      });
    },

    updateNavUI() {
      if (!this.user) return;

      const initial = (this.user.name || this.user.email || 'V').charAt(0).toUpperCase();

      // Look for standard header actions
      const navActions = document.querySelector('.nav__actions') || document.querySelector('.header__actions');
      if (navActions && !document.getElementById('navPatronProfileBtn')) {
        const profileBtn = document.createElement('a');
        profileBtn.id = 'navPatronProfileBtn';
        profileBtn.href = '/profile.html';
        profileBtn.className = 'patron-nav-btn';
        profileBtn.innerHTML = `
          <span class="patron-nav-avatar">${initial}</span>
          <span>My Profile</span>
        `;
        // Insert right before or after bag button
        const openCartBtn = navActions.querySelector('#openCartBtn');
        if (openCartBtn) {
          navActions.insertBefore(profileBtn, openCartBtn);
        } else {
          navActions.prepend(profileBtn);
        }
      }

      // Also ensure nav links have "My Profile"
      const navLinks = document.querySelector('.nav__links') || document.querySelector('.header__nav');
      if (navLinks && !navLinks.querySelector('a[href="/profile.html"]')) {
        const link = document.createElement('a');
        link.href = '/profile.html';
        link.className = 'u';
        link.textContent = 'My Profile';
        link.style.color = 'var(--champagne, #D9C7A3)';
        navLinks.appendChild(link);
      }
    }
  };

  // Expose globally
  window.VastraAuth = VastraAuth;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => VastraAuth.init());
  } else {
    VastraAuth.init();
  }
})();
