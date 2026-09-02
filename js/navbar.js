document.addEventListener("DOMContentLoaded", function () {

    // Check if navbar already exists
    if (document.querySelector('.navbar') && document.querySelector('#navMenu')) return;

    // Determine path to home
    const path = window.location.pathname;

    const isInsidePages =
        path.includes('/pages/') ||
        (path.split('/').pop() !== 'index.html' && path.includes('calc%20pnl') || ('formulas.html'));

    // Detect if script uses ../js/navbar.js
    const scripts = document.getElementsByTagName('script');

    let useParentPath = isInsidePages;

    for (let s of scripts) {
        if (s.src.includes('../js/navbar.js')) {
            useParentPath = true;
            break;
        }
    }

    const homePath = useParentPath ? '../index.html' : 'index.html';

    const keyExpPath = useParentPath
        ? 'calc pnl.html'
        : 'pages/calc pnl.html';
    const formulaspath = useParentPath
        ? 'formulas.html'
        : 'pages/formulas.html';
    const isBhome = path.includes('bhome.html');
    const isFormulas = path.includes('formulas.html');

    const keyExpLink = isBhome
        ? `<li><a href="${keyExpPath}">Key Experiments</a></li>`
        : '';
    /* const formulaslink = isBhome
         ? `<li><a href="${formulaspath}">Formulas</a></li>`
         : '';*/

    /*
    const subPath = useParentPath ? 'subscription.html' : 'pages/subscription.html';
    const subPagePath = useParentPath ? 'subpage.html' : 'pages/subpage.html';

    const isSubscribed = localStorage.getItem('em_subscribed') === 'true';
    const hubLink = isSubscribed
        ? `<li><a href="${subPagePath}" style="color: #00ffc8; font-weight: 700;">🚀 Premium Hub</a></li>`
        : `<li><a href="${subPath}" style="color: #00ffc8; font-weight: 600;">✨ Premium</a></li>`;
    */
    const hubLink = '';

    // Create Navbar
    const header = document.createElement('header');

    header.className = 'navbar';

    header.innerHTML = `
        <div class="nav-brand">EmerTezora</div>

        <nav id="navMenu">
            <ul>
                <li><a href="${homePath}">Home</a></li>
                ${hubLink}
                ${keyExpLink}
               
                <li>
                    <a href="#" onclick="history.back(); return false;">
                        &larr; Back
                    </a>
                </li>
            </ul>
        </nav>

        <button class="menu-btn" id="menuBtn">&#9776;</button>
    `;

    // Add navbar to page
    document.body.prepend(header);

    // Mobile Menu Toggle
    const menuBtn = document.getElementById('menuBtn');
    const navMenu = document.getElementById('navMenu');

    if (menuBtn && navMenu) {

        // Open / Close Menu
        menuBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            navMenu.classList.toggle('open');
        });

        // Close when clicking outside
        document.addEventListener('click', function (e) {

            if (
                navMenu.classList.contains('open') &&
                !navMenu.contains(e.target) &&
                !menuBtn.contains(e.target)
            ) {
                navMenu.classList.remove('open');
            }

        });
    }

});