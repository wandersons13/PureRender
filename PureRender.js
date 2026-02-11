// ==UserScript==
// @name         PureRender
// @namespace    https://github.com/wandersons13/PureRender
// @version      0.1
// @description  Zero-latency performance: Blocks trackers and forces instant rendering by bypassing loaders.
// @author       wandersons13
// @match        *://*/*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      GNU
// ==/UserScript==

(function() {
    'use strict';

    const currentHost = window.location.hostname;
    const excluded = GM_getValue('excluded_sites', []);

    if (excluded.some(site => currentHost.includes(site))) return;

    const blockedKeywords = [
        'google-analytics', 
        'googletagmanager', 
        'facebook.net', 
        'adservice', 
        'telemetry', 
        'analytics.js',
        'doubleclick'
    ];

    const shouldBlock = (url) => {
        if (!url || typeof url !== 'string') return false;
        for (let i = 0; i < blockedKeywords.length; i++) {
            if (url.indexOf(blockedKeywords[i]) !== -1) return true;
        }
        return false;
    };

    const nativeFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : (input?.url || '');
        if (shouldBlock(url)) return Promise.reject(new Error('Blocked by PureRender'));
        return nativeFetch.apply(this, arguments);
    };

    const nativeOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        if (shouldBlock(url)) {
            this.send = () => {}; 
            return;
        }
        return nativeOpen.apply(this, arguments);
    };

    GM_addStyle(`
        html, body {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }

        #preloader, .preloader, #loader, .loader, #loading, .loading, 
        [class*="spinner"], [id*="spinner"], .loading-overlay {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }
    `);

    window.addEventListener('load', () => {
        try {
            const bodyStyle = getComputedStyle(document.body);
            if (bodyStyle.overflow === 'hidden') {
                document.body.style.setProperty('overflow', 'auto', 'important');
                document.documentElement.style.setProperty('overflow', 'auto', 'important');
            }
        } catch (e) {}
    }, { once: true });

    GM_registerMenuCommand("🚫 Exclude this site", () => {
        if (!excluded.includes(currentHost)) {
            excluded.push(currentHost);
            GM_setValue('excluded_sites', excluded);
            location.reload();
        }
    });

    GM_registerMenuCommand("🔄 Reset Exclusion List", () => {
        GM_setValue('excluded_sites', []);
        location.reload();
    });
})();
