// ==UserScript==
// @name         PureRender: Instant-Web
// @namespace    https://github.com/wandersons13/PureRender
// @version      0.5
// @description  Instantly accelerate websites by blocking trackers, removing render blockers and reducing background CPU usage.
// @author       wandersons13
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=speedtest.net
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      GNU
// ==/UserScript==

(function () {
    "use strict";

    /* -- CONFIG -- */
    const host = location.hostname;
    const path = location.pathname.toLowerCase();

    const excludedHosts = /^(gemini\.google\.com|.*\.youtube\..*|youtube\..*|.*\.mega\..*|mega\..*)$/;

    const directMedia = /\.(jpg|jpeg|png|gif|webp|avif|mp4|webm|svg)($|\?)/;

    const trackerRegex = /(analytics|doubleclick|tracker|pixel|mixpanel|amplitude|hotjar|sentry|newrelic|segment)/i;

    /* -- USER EXCLUSIONS -- */
    const userExcluded = GM_getValue("excluded_sites", []);

    const excluded = directMedia.test(path) || excludedHosts.test(host) || userExcluded.some(site => host === site || host.endsWith("." + site));

    if (excluded) return;

    /* -- UTIL -- */
    const noop = () => {};

    const isTrackerURL = url => {
        if (!url || typeof url !== "string") return false;

        const searchKeywords = /(search|suggest|autocomplete|query|api)/i;
        if (searchKeywords.test(url)) return false;

        if (url.startsWith("/") || url.includes(host) || url.startsWith(location.origin)) return false;

        return trackerRegex.test(url);
    };

    /* -- TELEMETRY NEUTRALIZATION -- */
    (function () {

        const trackers = [
            "ga", "gaGlobal", "GoogleAnalyticsObject", "dataLayer", "fbq",
            "_gaq", "_gat", "monitoring", "newrelic",
            "amplitude", "mixpanel", "intercom", "hubspot"
        ];

        trackers.forEach(t => {
            if (window[t]) window[t] = undefined;
        });

        try {
            navigator.sendBeacon = () => false;
        } catch (e) {}

        console.clear = noop;
    })();

    /* -- NETWORK INTERCEPTION -- */
    window.fetch = new Proxy(window.fetch, {
        apply(target, thisArg, args) {

            const url = typeof args[0] === "string" ? args[0] : args[0] ?.url;

            if (isTrackerURL(url)) return Promise.resolve(new Response("", { status: 204}));

            return Reflect.apply(target, thisArg, args);
        }
    });

    const nativeXHR = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function (method, url) {

        if (isTrackerURL(url)) {
            this.send = noop;
            return;
        }

        return nativeXHR.apply(this, arguments);
    };

    /* -- SCRIPT FILTER -- */
    document.addEventListener('beforescriptexecute', (e) => {
        const script = e.target;
        if (script.src && isTrackerURL(script.src)) {
            e.preventDefault();
            e.stopPropagation();
            script.remove();
        }
    }, true);

    /* -- PERFORMANCE MITIGATIONS -- */

    /* slow abusive intervals */
    const nativeSetInterval = window.setInterval;

    window.setInterval = function (fn, delay, ...args) {

        if (delay && delay < 200) delay = 200;

        return nativeSetInterval(fn, delay, ...args);
    };

    /* requestIdleCallback throttle */
    try {
        window.requestIdleCallback = fn => setTimeout(fn, 50);
    } catch (e) {}

    /* disable sendBeacon */
    try {
        navigator.sendBeacon = () => false;
    } catch (e) {}

    /* -- TRACKER DOM CLEANUP -- */
    document.addEventListener("DOMContentLoaded", () => {

        /* remove ping tracking */
        document.querySelectorAll("a[ping]")
            .forEach(a => a.removeAttribute("ping"));

        /* remove external preconnect */
        document.querySelectorAll(
            'link[rel="preconnect"],link[rel="dns-prefetch"],link[rel="prefetch"]'
        ).forEach(link => {
            try {
                const u = new URL(link.href);

                if (u.hostname !== location.hostname) link.remove();

            } catch (e) {}
        });
    });

    /* -- IFRAME TRACKER BLOCK -- */
    const iframeObserver = new MutationObserver(mutations => {
        for (const m of mutations) {
            m.addedNodes.forEach(node => {
                if (node.tagName === "IFRAME" && node.src) {
                    try {
                        const r = node.getBoundingClientRect();

                        if (r.width <= 2 && r.height <= 2) node.remove();
                    } catch (e) {}
                }
            });
        }
    });

    iframeObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    /* -- WINDOW.OPEN FILTER -- */
    try {
        const nativeOpen = window.open;

        window.open = function (url, ...rest) {
            if (url && trackerRegex.test(url)) return null;
            return nativeOpen.call(this, url, ...rest);
        };
    } catch (e) {}

    /* -- VISIBILITY TRACKING MITIGATION -- */
    try {
        document.addEventListener(
            "visibilitychange",
            e => e.stopImmediatePropagation(),
            true
        );

    } catch (e) {}

    /* -- UI ACCELERATION -- */
    GM_addStyle(`
        html,body{
            display:block !important;
            visibility:visible !important;
            opacity:1 !important;
            scroll-behavior:auto !important;
        }

        *{
            scroll-behavior:auto !important;
        }

        #preloader,.preloader,#loader,.loader,#loading,.loading,[class*="spinner"],[id*="spinner"],.loading-overlay,[class*="preloader-"],[id*="preloader-"],.overlay-fixed,#overlay-fixed {
            display:none !important;
            opacity:0 !important;
            visibility:hidden !important;
            pointer-events:none !important;
        }
    `);

    const unlock = () => {
        try {

            document.body.style.setProperty(
                "overflow", "auto", "important");

            document.documentElement.style.setProperty(
                "overflow", "auto", "important");

        } catch (e) {}
    };

    window.addEventListener("load", unlock, {
        once: true
    });
    setTimeout(unlock, 2000);

    /* -- MENU -- */
    GM_registerMenuCommand("🚫 Exclude this site", () => {

        if (!userExcluded.includes(host)) {
            userExcluded.push(host);

            GM_setValue("excluded_sites", userExcluded);

            location.reload();
        }
    });

    GM_registerMenuCommand("🔄 Reset exclusions", () => {
        GM_setValue("excluded_sites", []);

        location.reload();
    });
})();
