// ==UserScript==
// @name         X Tweaks: Block Users + Remove Promo + Grok Cleaner + Analytics Blocker
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Hides tweets from blocked users, removes promo items, eliminates Grok/profile junk, and blocks analytics on Twitter/X.
// @author       LillyPK
// @match        https://twitter.com/*
// @match        https://x.com/*
// @icon         https://abs.twimg.com/favicons/twitter.2.ico
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // ========== ANALYTICS BLOCKER ==========
    (function() {
        const blockedEndpoints = [
            '/analytics/',
            '/event.json',
            '/impression',
            '/telemetry/',
            '/metrics/',
            't.co'
        ];

        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(body) {
            const url = this.url || (this._url || '');
            if (blockedEndpoints.some(endpoint => url.includes(endpoint))) {
                return;
            }
            return originalSend.apply(this, arguments);
        };

        const originalFetch = window.fetch;
        window.fetch = function(input, init) {
            const url = typeof input === 'string' ? input : input.url;
            if (url && blockedEndpoints.some(endpoint => url.includes(endpoint))) {
                return Promise.reject(new Error('Blocked by analytics blocker'));
            }
            return originalFetch(input, init);
        };
    })();

    // ========== CONTENT CLEANER ==========
    // Convert to Set for faster lookups
    const blockedUsers = new Set(['elonmuskppdy', 'doge', 'elonmuskemp', 'TrumpDailyPosts', 'realDonaldTrump', 'cb_doge', 'iAnonPatriot']);

    function hideBlockedUsersPosts() {
        const tweets = document.querySelectorAll('article[data-testid="tweet"]');
        tweets.forEach(tweet => {
            const userLink = tweet.querySelector('a[role="link"][href^="/"][href*="/status"]');
            if (userLink) {
                const username = userLink.getAttribute('href').split('/')[1].toLowerCase();
                if (blockedUsers.has(username)) {
                    tweet.style.display = 'none';
                }
            }
        });
    }

    // Combine selectors into single query
    const promoSelectors = [
        '[data-testid="verified_profile_upsell"]',
        '[data-testid="vo-signup-tab"]',
        '[data-testid="premium-signup-tab"]',
        'a[href="/i/verified-orgs-signup"]',
        'a[href="/i/premium_sign_up"]'
    ].join(',');

    function removePromoElements() {
        document.querySelectorAll(promoSelectors).forEach(el => el.remove());
    }

    const GROK_PATH_D = "M12.745 20.54l10.97-8.19c.539-.4 1.307-.244 1.564.38 1.349 3.288.746 7.241-1.938 9.955-2.683 2.714-6.417 3.31-9.83 1.954l-3.728 1.745c5.347 3.697 11.84 2.782 15.898-1.324 3.219-3.255 4.216-7.692 3.284-11.693l.008.009c-1.351-5.878.332-8.227 3.782-13.031L33 0l-4.54 4.59v-.014L12.743 20.544m-2.263 1.987c-3.837-3.707-3.175-9.446.1-12.755 2.42-2.449 6.388-3.448 9.852-1.979l3.72-1.737c-.67-.49-1.53-1.017-2.515-1.387-4.455-1.854-9.789-.931-13.41 2.728-3.483 3.523-4.579 8.94-2.697 13.561 1.405 3.454-.899 5.898-3.22 8.364C1.49 30.2.666 31.074 0 32l10.478-9.466";

    function removeGrokElements() {
        const grokButtons = [];

        document.querySelectorAll('a[href="/i/grok"]').forEach(el => grokButtons.push(el));

        document.querySelectorAll('button svg path[d]').forEach(path => {
            if (path.getAttribute('d') === GROK_PATH_D) {
                const button = path.closest('button');
                if (button) grokButtons.push(button);
            }
        });

        grokButtons.forEach(el => el.remove());
    }

    // ========== OBSERVER OPTIMIZATIONS ==========
    let processing = false;
    let cleanupScheduled = false;

    function runAllCleanup() {
        if (processing) {
            if (!cleanupScheduled) {
                cleanupScheduled = true;
                setTimeout(runAllCleanup, 100);
            }
            return;
        }

        processing = true;
        cleanupScheduled = false;

        requestAnimationFrame(() => {
            hideBlockedUsersPosts();
            removePromoElements();
            removeGrokElements();
            processing = false;
        });
    }

    const observer = new MutationObserver(mutations => {
        if (!mutations.length) return;
        runAllCleanup();
    });

    const mainContent = document.querySelector('main') || document.body;
    observer.observe(mainContent, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });

    // Initial run after slight delay to ensure DOM is ready
    setTimeout(runAllCleanup, 300);
})();
