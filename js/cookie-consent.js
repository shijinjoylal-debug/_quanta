document.addEventListener("DOMContentLoaded", function() {
    // Check if user has already made a choice
    if (!localStorage.getItem("cookieConsent")) {
        // Create the popup container
        const popup = document.createElement("div");
        popup.id = "cookie-consent-popup";
        popup.style.cssText = "position: fixed; bottom: 0; left: 0; width: 100%; background: #0a2822; color: #fff; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 999999; box-shadow: 0 -4px 15px rgba(0,0,0,0.5); font-family: 'Segoe UI', Arial, sans-serif; transition: transform 0.5s ease-in-out; transform: translateY(100%);";
        
        // Popup inner HTML
        popup.innerHTML = `
            <div style="max-width: 900px; text-align: center; line-height: 1.6; font-size: 1rem; margin-bottom: 15px;">
                <strong style="color: #00ffc8; font-size: 1.1rem;">We value your privacy!</strong><br>
                We use essential cookies to enable secure login and core features. We also use third-party advertising services (like Google AdSense) to serve personalized ads and analyze traffic. By clicking "Accept All", you consent to all cookies. Clicking "Decline" will only block non-essential tracking cookies.
                <br>Read our <a href="/privacy.html" style="color: #00ffc8; text-decoration: underline;">Privacy Policy</a> for more information.
            </div>
            <div style="display: flex; gap: 20px; flex-wrap: wrap; justify-content: center;">
                <button id="accept-cookies" style="background: #00ffc8; color: #000; border: none; padding: 12px 30px; border-radius: 30px; font-weight: bold; cursor: pointer; transition: background 0.3s, transform 0.2s; font-size: 1rem;">Accept All</button>
                <button id="decline-cookies" style="background: transparent; color: #fff; border: 2px solid #00ffc8; padding: 12px 30px; border-radius: 30px; font-weight: bold; cursor: pointer; transition: background 0.3s, color 0.3s; font-size: 1rem;">Decline</button>
            </div>
        `;
        
        document.body.appendChild(popup);

        // Slide up animation
        setTimeout(() => {
            popup.style.transform = "translateY(0)";
        }, 100);

        // Accept button logic
        document.getElementById("accept-cookies").addEventListener("click", function() {
            localStorage.setItem("cookieConsent", "accepted");
            popup.style.transform = "translateY(100%)";
            setTimeout(() => popup.remove(), 500);
            
            // Push a consent update to Google tag:
            if(typeof gtag === 'function') {
                gtag('consent', 'update', {
                    'ad_storage': 'granted',
                    'analytics_storage': 'granted',
                    'personalization_storage': 'granted'
                });
            }
        });

        // Decline button logic
        document.getElementById("decline-cookies").addEventListener("click", function() {
            localStorage.setItem("cookieConsent", "declined");
            popup.style.transform = "translateY(100%)";
            setTimeout(() => popup.remove(), 500);
            
            // Push a consent update to Google tag:
            if(typeof gtag === 'function') {
                gtag('consent', 'update', {
                    'ad_storage': 'denied',
                    'analytics_storage': 'denied',
                    'personalization_storage': 'denied'
                });
            }
        });
        
        // Hover effects for buttons
        const acceptBtn = document.getElementById("accept-cookies");
        acceptBtn.addEventListener('mouseenter', () => { acceptBtn.style.transform = 'scale(1.05)'; });
        acceptBtn.addEventListener('mouseleave', () => { acceptBtn.style.transform = 'scale(1)'; });
        
        const declineBtn = document.getElementById("decline-cookies");
        declineBtn.addEventListener('mouseenter', () => { declineBtn.style.background = '#00ffc8'; declineBtn.style.color = '#000'; });
        declineBtn.addEventListener('mouseleave', () => { declineBtn.style.background = 'transparent'; declineBtn.style.color = '#fff'; });
    }

    // Expose function to open consent popup manually (for CCPA)
    window.showCookieConsent = function() {
        if (document.getElementById("cookie-consent-popup")) return;
        localStorage.removeItem("cookieConsent");
        location.reload(); // Simplest way to re-trigger the logic
    };

    // Add global listener for any "Do Not Sell" links
    document.addEventListener('click', function(e) {
        if (e.target && (e.target.id === 'ccpa-opt-out' || e.target.classList.contains('ccpa-opt-out'))) {
            e.preventDefault();
            window.showCookieConsent();
        }
    });
});
