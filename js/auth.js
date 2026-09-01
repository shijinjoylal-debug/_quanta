// EmerTezora Authentication & Subscription Manager
(function () {
  const API_BASE = (window.location.origin.includes('5500') || window.location.protocol === 'file:')
    ? 'http://localhost:3000'
    : '';

  window.EmerAuth = {
    API_BASE: API_BASE,
    getToken: function () {
      return localStorage.getItem('em_token');
    },
    getUser: function () {
      try {
        return JSON.parse(localStorage.getItem('user'));
      } catch (e) {
        return null;
      }
    },
    isSubscribed: function () {
      return localStorage.getItem('em_subscribed') === 'true';
    },
    logout: function () {
      localStorage.removeItem('em_token');
      localStorage.removeItem('user');
      localStorage.removeItem('em_subscribed');
      window.location.href = window.location.pathname.includes('/pages/')
        ? 'subscription.html'
        : 'pages/subscription.html';
    },
    verifySubscription: async function (options = {}) {
      const token = this.getToken();
      const redirectIfNotSubscribed = options.redirect !== false;

      if (!token) {
        localStorage.setItem('em_subscribed', 'false');
        if (redirectIfNotSubscribed) {
          this.showAccessDeniedModal();
        }
        return false;
      }

      try {
        const res = await fetch(`${API_BASE}/api/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          localStorage.setItem('em_subscribed', 'false');
          if (redirectIfNotSubscribed) {
            this.showAccessDeniedModal();
          }
          return false;
        }

        const data = await res.json();

        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        if (data.subscribed) {
          localStorage.setItem('em_subscribed', 'true');
          this.updateUI(data.user, true);
          return true;
        } else {
          localStorage.setItem('em_subscribed', 'false');
          if (redirectIfNotSubscribed) {
            this.showAccessDeniedModal(data.user);
          }
          return false;
        }
      } catch (err) {
        console.warn('Auth check connection error:', err);
        // Fallback: check cached status if server is unreachable
        if (this.isSubscribed()) {
          const cachedUser = this.getUser();
          this.updateUI(cachedUser, true);
          return true;
        }
        if (redirectIfNotSubscribed) {
          this.showAccessDeniedModal();
        }
        return false;
      }
    },

    updateUI: function (user, isSubscribed) {
      const userAvatar = document.getElementById('userAvatar');
      const userNameDisplay = document.getElementById('userNameDisplay');
      const userEmailDisplay = document.getElementById('userEmailDisplay');
      const userStatusBadge = document.getElementById('userStatusBadge');
      const mainAuthBtn = document.getElementById('mainAuthBtn');

      if (user) {
        const displayName = user.name || user.username || (user.email ? user.email.split('@')[0] : 'Member');
        const displayEmail = user.email || user.username || '';

        if (userAvatar) userAvatar.textContent = displayName.charAt(0).toUpperCase();
        if (userNameDisplay) userNameDisplay.textContent = displayName;
        if (userEmailDisplay) userEmailDisplay.textContent = displayEmail;

        if (mainAuthBtn) {
          mainAuthBtn.textContent = 'Log Out';
          mainAuthBtn.className = 'auth-btn logout';
          mainAuthBtn.onclick = () => window.EmerAuth.logout();
        }
      }

      if (userStatusBadge) {
        if (isSubscribed) {
          userStatusBadge.textContent = '★ PREMIUM ACTIVE';
          userStatusBadge.className = 'badge-status status-premium';
        } else {
          userStatusBadge.textContent = 'FREE MEMBER';
          userStatusBadge.className = 'badge-status status-free';
        }
      }
    },

    showAccessDeniedModal: function (user = null) {
      // Check if modal already exists
      let overlay = document.getElementById('accessDeniedOverlay');
      if (overlay) return;

      const subPath = window.location.pathname.includes('/pages/') ? 'subscription.html' : 'pages/subscription.html';

      overlay = document.createElement('div');
      overlay.id = 'accessDeniedOverlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(8, 13, 26, 0.92);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        color: #f0f6fc;
        font-family: 'Inter', system-ui, sans-serif;
      `;

      overlay.innerHTML = `
        <div style="
          background: rgba(15, 23, 42, 0.95);
          border: 2px solid #00ffc8;
          border-radius: 24px;
          max-width: 480px;
          width: 100%;
          padding: 40px 32px;
          text-align: center;
          box-shadow: 0 25px 50px rgba(0,0,0,0.8), 0 0 30px rgba(0,255,200,0.3);
        ">
          <div style="font-size: 3.5rem; margin-bottom: 16px;">🔒</div>
          <h2 style="font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 800; color: #ffffff; margin-bottom: 12px;">
            Premium Subscription Required
          </h2>
          <p style="color: #8b949e; font-size: 1rem; line-height: 1.6; margin-bottom: 28px;">
            ${user ? `Hello <strong>${user.name || user.email}</strong>, this Premium Research Hub (subpage.html) is exclusively available to EmerTezora Premium members.` : 'Access to the Premium Research Hub (subpage.html) is reserved for EmerTezora active subscribers.'}
          </p>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <a href="${subPath}" style="
              display: block;
              width: 100%;
              padding: 14px;
              border-radius: 12px;
              background: linear-gradient(135deg, #00ffc8, #2a9df4);
              color: #050b14;
              font-weight: 800;
              font-size: 1rem;
              text-decoration: none;
              box-shadow: 0 4px 20px rgba(0, 255, 200, 0.4);
              transition: transform 0.2s ease;
            ">✨ Subscribe / Unlock Premium Pass</a>
            <a href="${subPath}" style="
              display: block;
              width: 100%;
              padding: 12px;
              border-radius: 12px;
              background: rgba(255,255,255,0.08);
              color: #f0f6fc;
              font-weight: 600;
              font-size: 0.95rem;
              text-decoration: none;
              border: 1px solid rgba(255,255,255,0.2);
            ">🔑 Log In to Existing Account</a>
            <a href="../index.html" style="
              display: inline-block;
              margin-top: 8px;
              color: #8b949e;
              font-size: 0.85rem;
              text-decoration: underline;
            ">&larr; Return to Home Page</a>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    // If page is subpage.html, perform subscription verification
    if (window.location.pathname.includes('subpage.html')) {
      window.EmerAuth.verifySubscription({ redirect: true });
    } else {
      // Just check token without blocking overlay
      window.EmerAuth.verifySubscription({ redirect: false });
    }
  });
})();
