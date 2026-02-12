// ==UserScript==
// @name         PureRender
// @namespace    https://github.com/wandersons13/PureRender
// @version      0.3
// @description  Instant loading by preventing web bloat, forcing content display and neutralizing telemetry.
// @author       wandersons13
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=web.dev
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
    const isExcludedHost = /^(gemini\.google\.com|.*\.youtube\..*|youtube\..*)$/.test(currentHost);
    const userExcluded = GM_getValue('excluded_sites', []);

    if (userExcluded.some(site => currentHost.includes(site))) return;

    const noop = () => {};

    const killTelemetry = () => {
const trackers = [
            'ga', 'gaGlobal', 'GoogleAnalyticsObject', 'dataLayer', 'fbq',
            '_gaq', '_gat', 'monitoring', 'newrelic', 'StackExchange',
            'amplitude', 'mixpanel', 'intercom', 'hubspot'
        ];
        trackers.forEach(t => { if (window[t]) window[t] = undefined; });
        if (navigator.sendBeacon) navigator.sendBeacon = () => true;
        console.clear = noop;
    };
    killTelemetry();

    const blockedKeywords = [
        'google-analytics', 'googletagmanager', 'facebook.net', 'adservice',
        'telemetry', 'analytics', 'doubleclick', 'hotjar', 'scorecardresearch',
        'pixel', 'metrics', 'log-event', 'segment.io', 'amplitude.com',
        'sentry.io', 'newrelic.com', 'crashlytics', 'mixpanel.com', 'stats.g.doubleclick.net',
        'browser-update.org', 'cloudfront.net/ad', 'inspectlet.com', 'mouseflow.com'
    ];

    const shouldBlock = (url) => {
        if (!url || typeof url !== 'string') return false;
        const lowUrl = url.toLowerCase();
        return blockedKeywords.some(keyword => lowUrl.includes(keyword));
    };

    window.fetch = new Proxy(window.fetch, {
        apply(target, thisArg, args) {
            const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
            if (shouldBlock(url)) return Promise.reject(new Error('Blocked by PureRender'));
            return Reflect.apply(target, thisArg, args);
        }
    });

    const nativeOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        if (shouldBlock(url)) { this.send = noop; return; }
        return nativeOpen.apply(this, arguments);
    };

    if (!isExcludedHost) {
        GM_addStyle(`
            html, body {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                scroll-behavior: auto !important;
            }
            #preloader, .preloader, #loader, .loader, #loading, .loading,
            [class*="spinner"], [id*="spinner"], .loading-overlay,
            [class*="preloader-"], [id*="preloader-"],
            .overlay-fixed, #overlay-fixed {
                display: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }
        `);

        const unlock = () => {
            try {
                document.body.style.setProperty('overflow', 'auto', 'important');
                document.body.style.setProperty('position', 'relative', 'important');
                document.documentElement.style.setProperty('overflow', 'auto', 'important');
                window.addEventListener('wheel', (e) => e.stopPropagation(), { capture: true });
                window.addEventListener('touchmove', (e) => e.stopPropagation(), { capture: true });
            } catch (e) {}
        };

        window.addEventListener('load', unlock, { once: true });
        setTimeout(unlock, 2000);
    }

    GM_registerMenuCommand("🚫 Exclude this site", () => {
        if (!userExcluded.includes(currentHost)) {
            userExcluded.push(currentHost);
            GM_setValue('excluded_sites', userExcluded);
            location.reload();
        }
    });

    GM_registerMenuCommand("🔄 Reset Exclusion List", () => {
        GM_setValue('excluded_sites', []);
        location.reload();
    });
})();