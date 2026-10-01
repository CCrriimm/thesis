/**
 * Tom's Chicken - Unified Session Guard & Zero-Flicker Preloader
 * 
 * Runs synchronously in <head> to determine user authorization
 * and pre-render navigation elements before the browser paints the DOM.
 */
(function() {
    'use strict';

    // Prevent modal open layout shift caused by Bootstrap injecting inline padding-right to body/navbar
    try {
        const noShiftStyle = document.createElement("style");
        noShiftStyle.id = "toms-no-layout-shift";
        noShiftStyle.textContent = `
            html {
                scrollbar-gutter: stable;
            }
            body.modal-open,
            body[style*="padding-right"] {
                padding-right: 0px !important;
            }
            .modal-open .fixed-top,
            .modal-open .sticky-top,
            .modal-open .navbar {
                padding-right: 0px !important;
            }
        `;
        if (document.head) {
            document.head.appendChild(noShiftStyle);
        } else {
            document.addEventListener("DOMContentLoaded", () => {
                if (document.head && !document.getElementById("toms-no-layout-shift")) {
                    document.head.appendChild(noShiftStyle);
                }
            });
        }
    } catch (e) {}

    function getSessionVal(key) {
        try {
            return sessionStorage.getItem(key) || localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function setSessionVal(key, val) {
        try {
            sessionStorage.setItem(key, val);
            localStorage.setItem(key, val);
        } catch (e) {}
    }

    function removeSessionVal(key) {
        try {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        } catch (e) {}
    }

    // Expose session caching helper globally
    window.cacheUserSession = function(user, userData) {
        if (!user) return;
        const email = user.email || "";
        const role = (userData && userData.role) || "customer";
        const fullName = userData 
            ? ((userData.firstName || "") + " " + (userData.lastName || "")).trim() || email
            : email;
        const initial = (fullName.charAt(0) || email.charAt(0) || "U").toUpperCase();

        setSessionVal("toms_user_logged_in", "true");
        setSessionVal("toms_user_email", email);
        setSessionVal("toms_user_role", role);
        setSessionVal("toms_user_name", fullName);
        setSessionVal("toms_user_initial", initial);
    };

    window.clearUserSession = function() {
        try {
            sessionStorage.clear();
        } catch (e) {}
        removeSessionVal("toms_user_logged_in");
        removeSessionVal("toms_user_email");
        removeSessionVal("toms_user_role");
        removeSessionVal("toms_user_name");
        removeSessionVal("toms_user_initial");
    };

    // Global customer logout handler
    window.handleCustomerLogout = async function() {
        window.clearUserSession();
        try {
            if (window._firebaseAuth && window._firebaseSignOut) {
                await window._firebaseSignOut(window._firebaseAuth);
            }
        } catch (err) {
            console.warn("Sign out background note:", err);
        }
        window.location.replace("login.html");
    };

    // Read cached state
    const isLoggedIn = getSessionVal("toms_user_logged_in") === "true";
    const role = getSessionVal("toms_user_role");

    // Sync session across storages if active
    if (isLoggedIn) {
        const email = getSessionVal("toms_user_email");
        const name = getSessionVal("toms_user_name");
        const initial = getSessionVal("toms_user_initial");
        if (email) setSessionVal("toms_user_email", email);
        if (role) setSessionVal("toms_user_role", role);
        if (name) setSessionVal("toms_user_name", name);
        if (initial) setSessionVal("toms_user_initial", initial);
    }

    // Detect current route
    const rawPath = window.location.pathname.toLowerCase();
    const page = rawPath.substring(rawPath.lastIndexOf("/") + 1) || "index.html";

    const isAdminPage = page.startsWith("admin") || page.includes("kitchen");
    const isCustomerProtected = !isAdminPage && (page.includes("profile") || page.includes("reservation") || page.includes("menu"));
    const isAuthPage = page.includes("login") || page.includes("signup");
    const isCustomerPublic = !isAdminPage && (page === "index.html" || page === "" || page.includes("about") || page.includes("contact"));

    // 1. Admin Pages Guard (0ms pre-paint)
    if (isAdminPage) {
        if (!isLoggedIn) {
            window.location.replace("login.html");
            return;
        }
        if (role !== "admin") {
            window.location.replace("index.html");
            return;
        }
        // Valid admin on admin page -> allow immediately and ensure body is visible
        if (document.body) {
            document.body.style.display = "";
        } else {
            document.addEventListener("DOMContentLoaded", () => {
                if (document.body) document.body.style.display = "";
            });
        }
        return;
    }

    // 2. Customer Protected Pages Guard (0ms pre-paint)
    if (isCustomerProtected) {
        if (role === "admin") {
            window.location.replace("admin.html");
            return;
        }
        if (!isLoggedIn) {
            window.location.replace("login.html");
            return;
        }
        if (document.body) {
            document.body.style.display = "";
        } else {
            document.addEventListener("DOMContentLoaded", () => {
                if (document.body) document.body.style.display = "";
            });
        }
        return;
    }

    // 3. Auth Pages Guard (login.html, Signup.html)
    // Instant bounce when user clicks browser back button
    if (isAuthPage) {
        if (isLoggedIn) {
            if (role === "admin") {
                window.location.replace("admin.html");
            } else {
                window.location.replace("index.html");
            }
            return;
        }
        return;
    }

    // 4. Customer Public Pages: Keep Admins in their portal
    if (isCustomerPublic && isLoggedIn && role === "admin") {
        window.location.replace("admin.html");
        return;
    }

    // 5. Zero-Flicker Navbar Pre-Renderer
    // Called synchronously during HTML parsing right after #authSection in the markup
    window.renderPreloadedNavbar = function(desktopId, mobileId) {
        try {
            const sec = document.getElementById(desktopId || "authSection");
            const secMob = document.getElementById(mobileId || "authSectionMobile");
            if (!sec && !secMob) return;

            const loggedIn = getSessionVal("toms_user_logged_in") === "true";
            const userRole = getSessionVal("toms_user_role");

            if (!loggedIn || userRole === "admin") {
                if (sec) sec.innerHTML = '<a href="login.html" class="btn-orange">Login</a>';
                if (secMob) secMob.innerHTML = '<a href="login.html" class="btn-orange text-decoration-none">Login / Sign Up</a>';
                return;
            }

            const email = getSessionVal("toms_user_email") || "";
            const name = getSessionVal("toms_user_name") || email || "Valued Customer";
            const initial = getSessionVal("toms_user_initial") || (email ? email.charAt(0).toUpperCase() : "U");

            if (sec) {
                sec.innerHTML = `
                    <div class="dropdown">
                        <button class="profile-circle dropdown-toggle border-0" type="button" id="customerMenuBtn" data-bs-toggle="dropdown" aria-expanded="false" title="${name}">
                            ${initial}
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow border-0 rounded-3 mt-2" aria-labelledby="customerMenuBtn" style="min-width: 220px;">
                            <li class="px-3 py-2 border-bottom bg-light rounded-top">
                                <div class="fw-bold text-dark text-truncate" style="max-width: 190px;">${name}</div>
                                <small class="text-muted text-truncate d-block" style="max-width: 190px;">${email}</small>
                            </li>
                            <li>
                                <a class="dropdown-item py-2" href="profile.html">
                                    <i class="fa-solid fa-user me-2 text-warning"></i> My Profile & Orders
                                </a>
                            </li>
                            <li><hr class="dropdown-divider my-1"></li>
                            <li>
                                <a class="dropdown-item py-2 text-danger fw-bold customer-logout-btn" href="#" onclick="window.handleCustomerLogout(); return false;">
                                    <i class="fa-solid fa-right-from-bracket me-2"></i> Log Out
                                </a>
                            </li>
                        </ul>
                    </div>
                `;
            }

            if (secMob) {
                secMob.innerHTML = `
                    <div class="p-3 bg-light rounded-3 shadow-sm border mt-2">
                        <div class="d-flex align-items-center gap-3 mb-3">
                            <div class="profile-circle flex-shrink-0">${initial}</div>
                            <div class="text-start overflow-hidden">
                                <div class="fw-bold text-dark text-truncate">${name}</div>
                                <small class="text-muted text-truncate d-block">${email}</small>
                            </div>
                        </div>
                        <div class="d-grid gap-2">
                            <a href="profile.html" class="btn btn-outline-dark btn-sm rounded-pill py-2 fw-bold">
                                <i class="fa-solid fa-user me-1 text-warning"></i> My Profile & Orders
                            </a>
                            <button class="btn btn-dark btn-sm rounded-pill py-2 fw-bold customer-logout-btn" type="button" onclick="window.handleCustomerLogout(); return false;">
                                <i class="fa-solid fa-right-from-bracket me-1"></i> Log Out
                            </button>
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            console.warn("Navbar preloader execution note:", e);
        }
    };
})();
