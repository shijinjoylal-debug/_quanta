// Environment Auto-Detection for API Base URL
// - When running locally via Live Server or file://, routes to local Express server on port 5000.
// - When running on Vercel (or production domains like quanta-amber.vercel.app), uses relative path ''
//   so requests hit /api/* on the same domain, handled by server.js via vercel.json.
(function () {
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.protocol === 'file:';
    
    // If accessing from another local port (e.g. Live Server on 5500), point to Express backend on 5000
    const isDifferentLocalPort = isLocal && window.location.port !== '5000';

    const CONFIG = {
        API_BASE_URL: isDifferentLocalPort ? 'http://localhost:5000' : ''
    };

    console.log('🚀 API Base URL configured:', CONFIG.API_BASE_URL || window.location.origin);
    window.CONFIG = CONFIG;
})();

