document.addEventListener("DOMContentLoaded", function() {
    // Check if navbar already exists in HTML
    if (document.querySelector('.navbar') && document.querySelector('#navMenu')) return;

    // Determine path to home
    // If we're in /pages/, home is ../index.html. Otherwise it's index.html
    const path = window.location.pathname;
    const isInsidePages = path.includes('/pages/') || (path.split('/').pop() !== 'index.html' && path.includes('calc%20pnl'));
    // Fallback check: if the script is loaded with ../ prefix, we are likely in pages
    const scripts = document.getElementsByTagName('script');
    let useParentPath = isInsidePages;
    for(let s of scripts) {
        if(s.src.includes('../js/navbar.js')) {
            useParentPath = true;
            break;
        }
    }
    
    const homePath = useParentPath ? '../index.html' : 'index.html';

    // Create Navbar HTML
    const header = document.createElement('header');
    header.className = 'navbar';
    header.innerHTML = `
        <div class="nav-brand">EmerTezora</div>
        <nav id="navMenu">
            <ul>
                <li><a href="${homePath}">Home</a></li>
                <li><a href="#" onclick="history.back(); return false;">&larr; Back</a></li>
            </ul>
        </nav>
        <button class="menu-btn" id="menuBtn">&#9776;</button>
    `;

    // Append to body
    document.body.prepend(header);

    // Mobile Menu Toggle
    const menuBtn = document.getElementById('menuBtn');
    const navMenu = document.getElementById('navMenu');

    if (menuBtn && navMenu) {
        menuBtn.addEventListener('click', function() {
            navMenu.classList.toggle('open');
        });
    }
});
