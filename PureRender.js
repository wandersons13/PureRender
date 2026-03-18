// ==UserScript==
// @name         PureRender: Instant-Web
// @namespace    https://github.com/wandersons13/PureRender
// @version      0.7
// @description  Clean, stable, and fast. PureRender accelerates your web experience by removing render-blocking elements, overlays, and layout-lagging effects for a seamless browsing experience.
// @author       wandersons13
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=speedtest.net
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    "use strict";

    const host = location.hostname;

    /* -- 1. AUTO-EXCLUSION FOR YOUTUBE -- */
    // Ensures zero conflicts with PureYouTube
    if (host.includes("youtube.com") || host.includes("youtu.be")) return;

    /* -- 2. USER EXCLUSIONS -- */
    const userExcluded = GM_getValue("excluded_sites", []) || [];
    if (userExcluded.includes(host)) return;

    /* -- 3. STABLE SPEED OPTIMIZATION (CSS) -- */
    GM_addStyle(`
        /* Disable smooth scroll for instant response */
        html, body {
            scroll-behavior: auto !important;
        }

        /* Ensure content is visible immediately */
        html, body {
            visibility: visible !important;
            opacity: 1 !important;
        }

        /* Speed up image rendering natively */
        img {
            image-rendering: -webkit-optimize-contrast;
        }

        /* Remove common blocking elements (spinners, skeletons) */
        [class*="preloader"], [id*="preloader"], [class*="loading-overlay"], 
        [class*="skeleton"], .loading, .spinner, #loader {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }

        /* Remove heavy GPU effects that cause scroll lag */
        * {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            text-shadow: none !important;
            box-shadow: none !important;
        }
    `);

    /* -- 4. PASSIVE ACTIONS -- */
    const quickUnlock = () => {
        // Unlock scroll only if it is explicitly blocked
        const style = getComputedStyle(document.body);
        if (style.overflow === 'hidden' || style.position === 'fixed') {
            document.body.style.setProperty("overflow", "auto", "important");
            document.body.style.setProperty("position", "static", "important");
            document.documentElement.style.setProperty("overflow", "auto", "important");
        }

        // Set lazy images to eager to start downloading earlier
        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            img.setAttribute('loading', 'eager');
        });
    };

    window.addEventListener('DOMContentLoaded', quickUnlock, { once: true });
    window.addEventListener('load', quickUnlock, { once: true });

    /* -- 5. MENU COMMANDS -- */
    GM_registerMenuCommand("🚫 Exclude this site", () => {
        const currentExcluded = GM_getValue("excluded_sites", []);
        if (!currentExcluded.includes(host)) {
            currentExcluded.push(host);
            GM_setValue("excluded_sites", currentExcluded);
            location.reload();
        }
    });

    GM_registerMenuCommand("🔄 Clear exclusion list", () => {
        if (confirm("Clear all exclusions?")) {
            GM_setValue("excluded_sites", []);
            location.reload();
        }
    });
})();
