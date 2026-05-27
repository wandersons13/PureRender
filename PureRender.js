// ==UserScript==
// @name         PureRender: Instant-Web
// @namespace    https://github.com/wandersons13/PureRender
// @version      0.8
// @description  Clean, stable, and fast. PureRender accelerates your web experience by removing render-blocking elements, overlays, and layout-lagging effects for a seamless browsing experience.
// @author       wandersons13
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=speedtest.net
// @run-at       document-start
// @noframes
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      GNU
// ==/UserScript==

(function () {
    "use strict";

    const host = location.hostname.toLowerCase();
    const href = location.href.toLowerCase();
    const referrer = (document.referrer || "").toLowerCase();

    const isYouTubeHost = (value) => /(^|\.)((youtube\.com)|(youtu\.be)|(youtube-nocookie\.com))$/.test(value);

    if (
        isYouTubeHost(host) ||
        href.includes("youtube.com/embed/") ||
        href.includes("youtube.com/live_embed") ||
        href.includes("youtube-nocookie.com") ||
        referrer.includes("youtube.com") ||
        referrer.includes("youtu.be") ||
        referrer.includes("youtube-nocookie.com")
    ) {
        return;
    }

    const userExcluded = GM_getValue("excluded_sites", []) || [];
    if (userExcluded.includes(host)) return;

    GM_addStyle(`
        html, body {
            scroll-behavior: auto !important;
            visibility: visible !important;
            opacity: 1 !important;
        }

        img {
            image-rendering: -webkit-optimize-contrast;
        }

        [class*="preloader"], [id*="preloader"], [class*="loading-overlay"],
        [class*="skeleton"], [class*="spinner"], .loader, #loader {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }

        * {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }

        *:not(input):not(textarea):not(select) {
            text-shadow: none !important;
        }
    `);

    const quickUnlock = () => {
        if (!document.body) return;

        const style = getComputedStyle(document.body);

        if (style.overflow === "hidden" || style.position === "fixed") {
            document.body.style.setProperty("overflow", "auto", "important");
            document.body.style.setProperty("position", "static", "important");
            document.documentElement.style.setProperty("overflow", "auto", "important");
        }

        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            img.setAttribute("loading", "eager");
        });
    };

    window.addEventListener("DOMContentLoaded", quickUnlock, { once: true });
    window.addEventListener("load", quickUnlock, { once: true });

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
