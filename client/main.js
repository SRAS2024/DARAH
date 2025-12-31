"use strict";

/**
 * DARAH · Shared script (Storefront + Admin)
 *
 * IMPORTANT:
 * - The storefront (index.html) and admin (admin.html) both load main.js.
 * - We auto-detect which page is running.
 * - Storefront code must run when admin sections are NOT present.
 * - Admin code must run when admin sections ARE present.
 */

/**
 * Prefer route-based detection first because it is stable.
 * Fallback to DOM detection only if the route is ambiguous.
 */
function isAdminRoute() {
  const path = String(window.location.pathname || "");
  const file = path.split("/").pop() || "";

  if (path === "/admin") return true;
  if (path.startsWith("/admin/")) return true;
  if (file.toLowerCase() === "admin.html") return true;

  return false;
}

document.addEventListener("DOMContentLoaded", () => {
  const hasAdminLoginSection = !!document.getElementById("adminLoginSection");
  const hasAdminPanelSection = !!document.getElementById("adminPanelSection");
  const domLooksAdmin = hasAdminLoginSection || hasAdminPanelSection;

  const shouldRunAdmin = isAdminRoute() || domLooksAdmin;

  try {
    if (shouldRunAdmin) {
      initAdminApp();
    } else {
      initStorefrontApp();
    }
  } catch (err) {
    console.error("Boot error:", err);

    // Safety: if admin boot partially ran on storefront, undo the classes and try storefront.
    try {
      document.body.classList.remove("admin-page", "is-admin-login");
    } catch {
      // ignore
    }

    try {
      initStorefrontApp();
    } catch (err2) {
      console.error("Storefront fallback failed:", err2);
    }
  }
});

/* =========================================================
   RESPONSIVE MODE (shared helper)
   ========================================================= */

/**
 * Heuristic for "phone and small devices" versus "desktop/tablet".
 * Goal: devices larger than about 8 inches should behave like desktop.
 * We approximate this by:
 * - Treating small if the shortest viewport side is <= 700 CSS px
 * - Also treating small if it looks phone like (coarse pointer, touch, and smaller max side)
 */
function computeIsSmallDevice() {
  const w = Number(window.innerWidth || 0);
  const h = Number(window.innerHeight || 0);
  const minSide = Math.min(w, h);
  const maxSide = Math.max(w, h);

  const coarse =
    !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
    !!(window.matchMedia && window.matchMedia("(hover: none)").matches);

  const touch = "ontouchstart" in window || (navigator && navigator.maxTouchPoints > 0);

  const smallByViewport = minSide <= 700;
  const smallPhoneLike = coarse && touch && maxSide <= 900 && minSide <= 820;

  return smallByViewport || smallPhoneLike;
}

function applyDeviceModeClass(bodyEl, isSmall) {
  if (!bodyEl) return;
  bodyEl.classList.toggle("is-small-device", !!isSmall);
  bodyEl.classList.toggle("is-large-device", !isSmall);
}

/**
 * Keeps a local isSmallDevice boolean in sync, updates body classes,
 * and calls onChange when the mode flips.
 */
function attachResponsiveMode(bodyEl, onChange) {
  let isSmallDevice = computeIsSmallDevice();
  applyDeviceModeClass(bodyEl, isSmallDevice);

  function sync() {
    const next = computeIsSmallDevice();
    if (next !== isSmallDevice) {
      isSmallDevice = next;
      applyDeviceModeClass(bodyEl, isSmallDevice);
      if (typeof onChange === "function") onChange(isSmallDevice);
    } else {
      applyDeviceModeClass(bodyEl, isSmallDevice);
    }
  }

  window.addEventListener("resize", sync, { passive: true });
  window.addEventListener("orientationchange", sync, { passive: true });

  return {
    isSmall: () => isSmallDevice,
    sync
  };
}

/* =========================================================
   STORE
   ========================================================= */

function initStorefrontApp() {
  // Safety: if admin code ever ran, these classes will break the storefront nav.
  try {
    document.body.classList.remove("admin-page", "is-admin-login");
  } catch {
    // ignore
  }

  // Elements
  const bodyEl = document.body;
  const navMobileToggle = document.querySelector(".nav-mobile-toggle");
  const navDropdown = document.getElementById("navDropdown");
  const navLeftContainer = document.querySelector(".nav-left");
  const navLinks = Array.from(document.querySelectorAll(".main-nav .nav-link"));

  const views = {
    home: document.getElementById("view-home"),
    about: document.getElementById("view-about"),
    specials: document.getElementById("view-specials"),
    sets: document.getElementById("view-sets"),
    rings: document.getElementById("view-rings"),
    necklaces: document.getElementById("view-necklaces"),
    bracelets: document.getElementById("view-bracelets"),
    earrings: document.getElementById("view-earrings"),
    checkout: document.getElementById("view-checkout")
  };

  // Homepage areas
  const heroImagesEl = document.getElementById("heroImages");
  const aboutTextEl = document.getElementById("aboutText");
  const aboutLongTextEl = document.getElementById("aboutLongText");
  const aboutCollageEl = document.getElementById("aboutCollage");

  const siteNoticesEl = document.getElementById("siteNotices");
  const siteNoticesListEl = document.getElementById("siteNoticesList");

  // Product grids
  const productLists = {
    specials: document.getElementById("specialsList"),
    sets: document.getElementById("setsList"),
    rings: document.getElementById("ringsList"),
    necklaces: document.getElementById("necklacesList"),
    bracelets: document.getElementById("braceletsList"),
    earrings: document.getElementById("earringsList")
  };

  // Cart
  const cartButton = document.getElementById("cartButton");
  const cartCountEl = document.getElementById("cartCount");
  const checkoutItemsEl = document.getElementById("checkoutItems");
  const summarySubtotalEl = document.getElementById("summarySubtotal");
  const summaryTaxesEl = document.getElementById("summaryTaxes");
  const summaryTotalEl = document.getElementById("summaryTotal");
  const checkoutButton = document.getElementById("checkoutButton");

  // Year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // State
  const MAX_PRODUCT_IMAGES = 5;
  let allProducts = [];
  let homepageState = {
    aboutText: "",
    aboutLongText: "",
    heroImages: [],
    aboutImages: [],
    notices: [],
    theme: "default"
  };

  // Cart state
  const CART_STORAGE_KEY = "darahCartV1";
  /** @type {{[productId: string]: {qty:number, product:any}}} */
  let cart = loadCart();

  // Responsive mode state
  let isSmallDevice = false;

  // Helpers
  function applyThemeVariant(variant) {
    const root = document.documentElement;
    const trimmed = typeof variant === "string" ? variant.trim() : "";
    const value = trimmed || "default";
    if (root) {
      root.dataset.themeVariant = value;
      root.setAttribute("data-theme-variant", value);
    }
  }

  function normalizeList(list, max) {
    if (!Array.isArray(list)) return [];
    const cleaned = list
      .map((u) => String(u || "").trim())
      .filter((u, index, arr) => u && arr.indexOf(u) === index);
    return typeof max === "number" && max > 0 ? cleaned.slice(0, max) : cleaned;
  }

  function formatBRL(value) {
    if (value == null || Number.isNaN(Number(value))) return "R$ 0,00";
    try {
      return Number(value).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      });
    } catch {
      return "R$ " + Number(value || 0).toFixed(2).replace(".", ",");
    }
  }

  function normalizeProductImages(product) {
    const primary = typeof product.imageUrl === "string" ? product.imageUrl : "";
    const fromImageUrls = Array.isArray(product.imageUrls) ? product.imageUrls : [];
    const fromImages = Array.isArray(product.images) ? product.images : [];
    const merged = [...fromImageUrls, ...fromImages];
    const cleaned = merged
      .map((u) => String(u || "").trim())
      .filter((u, index, arr) => u && arr.indexOf(u) === index);
    if (primary && !cleaned.includes(primary)) cleaned.unshift(primary);
    return cleaned.slice(0, MAX_PRODUCT_IMAGES);
  }

  // Views
  function switchView(id) {
    Object.values(views).forEach((v) => v && v.classList.remove("active-view"));
    const el = views[id];
    if (el) el.classList.add("active-view");

    navLinks.forEach((b) => {
      const viewId = b.dataset.view;
      b.classList.toggle("active", viewId === id);
    });

    closeMobileMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Mobile menu
  function openMobileMenu() {
    if (!navDropdown || !navMobileToggle) return;
    if (!isSmallDevice) return;
    navDropdown.classList.add("open");
    navMobileToggle.classList.add("is-open");
    navMobileToggle.setAttribute("aria-expanded", "true");
    navDropdown.setAttribute("aria-hidden", "false");
  }

  function closeMobileMenu() {
    if (!navDropdown || !navMobileToggle) return;
    navDropdown.classList.remove("open");
    navMobileToggle.classList.remove("is-open");
    navMobileToggle.setAttribute("aria-expanded", "false");
    navDropdown.setAttribute("aria-hidden", "true");
  }

  function buildMobileDropdown() {
    if (!navDropdown || !navLeftContainer) return;

    navDropdown.innerHTML = "";

    const allTabs = Array.from(navLeftContainer.querySelectorAll(".nav-link"));

    allTabs.forEach((btn) => {
      const viewId = btn.getAttribute("data-view");
      if (!viewId || !views[viewId]) return;

      const clone = btn.cloneNode(true);
      clone.classList.remove("active");

      clone.addEventListener("click", () => {
        switchView(viewId);

        const dropdownLinks = navDropdown.querySelectorAll(".nav-link");
        dropdownLinks.forEach((linkEl) => {
          linkEl.classList.toggle("active", linkEl === clone);
        });
      });

      navDropdown.appendChild(clone);
    });
  }

  // Wire nav clicks
  navLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.view;
      if (id && views[id]) switchView(id);
    });
  });

  // Wire hamburger
  buildMobileDropdown();

  if (navMobileToggle && navDropdown) {
    navMobileToggle.addEventListener("click", () => {
      if (!isSmallDevice) {
        closeMobileMenu();
        return;
      }
      const isOpen = navDropdown.classList.contains("open");
      if (isOpen) closeMobileMenu();
      else openMobileMenu();
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!target || !(target instanceof Node)) return;
      if (!navDropdown.contains(target) && !navMobileToggle.contains(target)) {
        closeMobileMenu();
      }
    });
  }

  // Keep responsive mode synced, and force close mobile menu when switching to desktop mode
  const responsive = attachResponsiveMode(bodyEl, (nextIsSmall) => {
    isSmallDevice = nextIsSmall;
    if (!isSmallDevice) closeMobileMenu();
  });
  isSmallDevice = responsive.isSmall();

  // Cart helpers
  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      return parsed;
    } catch {
      return {};
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }

  function getCartCount() {
    return Object.values(cart).reduce((sum, item) => sum + (item.qty || 0), 0);
  }

  function updateCartBadge() {
    if (!cartCountEl) return;
    cartCountEl.textContent = String(getCartCount());
  }

  function addToCart(product, qty) {
    const id = String(product.id || "");
    if (!id) return;

    const safeQty = Math.max(1, Number(qty || 1));
    if (!cart[id]) cart[id] = { qty: 0, product };
    cart[id].qty += safeQty;
    cart[id].product = product;

    saveCart();
    updateCartBadge();
  }

  function setCartQty(productId, qty) {
    const id = String(productId || "");
    if (!id || !cart[id]) return;

    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) {
      delete cart[id];
    } else {
      cart[id].qty = Math.floor(n);
    }

    saveCart();
    updateCartBadge();
    renderCheckout();
  }

  // Checkout rendering
  function renderCheckout() {
    if (!checkoutItemsEl || !summarySubtotalEl || !summaryTaxesEl || !summaryTotalEl) return;

    checkoutItemsEl.innerHTML = "";

    const items = Object.entries(cart)
      .map(([id, row]) => ({ id, qty: row.qty, product: row.product }))
      .filter((x) => x.product && x.qty > 0);

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "checkout-empty";
      empty.textContent = "Seu carrinho está vazio.";
      checkoutItemsEl.appendChild(empty);

      summarySubtotalEl.textContent = "R$ 0,00";
      summaryTaxesEl.textContent = "R$ 0,00";
      summaryTotalEl.textContent = "R$ 0,00";
      if (checkoutButton) checkoutButton.disabled = true;
      return;
    }

    let subtotal = 0;

    items.forEach(({ id, qty, product }) => {
      const price = Number(product.price || 0);
      const lineTotal = price * qty;
      subtotal += lineTotal;

      const row = document.createElement("div");
      row.className = "checkout-item";

      const imgBox = document.createElement("div");
      imgBox.className = "checkout-item-image";
      const images = normalizeProductImages(product);
      if (images.length) {
        const img = document.createElement("img");
        img.src = images[0];
        img.alt = product.name || "Produto";
        img.loading = "lazy";
        imgBox.appendChild(img);
      }
      row.appendChild(imgBox);

      const info = document.createElement("div");
      info.className = "checkout-item-info";

      const name = document.createElement("div");
      name.className = "checkout-item-name";
      name.textContent = product.name || "Produto";
      info.appendChild(name);

      const unit = document.createElement("div");
      unit.className = "checkout-item-unit";
      unit.textContent = "Unitário: " + formatBRL(price);
      info.appendChild(unit);

      const total = document.createElement("div");
      total.className = "checkout-item-total";
      total.textContent = "Total: " + formatBRL(lineTotal);
      info.appendChild(total);

      row.appendChild(info);

      const controls = document.createElement("div");
      controls.className = "checkout-item-controls";

      const qtyControls = document.createElement("div");
      qtyControls.className = "quantity-controls";

      const minus = document.createElement("button");
      minus.type = "button";
      minus.className = "quantity-button";
      minus.textContent = "−";
      minus.addEventListener("click", () => setCartQty(id, qty - 1));

      const qtyValue = document.createElement("div");
      qtyValue.className = "quantity-value";
      qtyValue.textContent = String(qty);

      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "quantity-button";
      plus.textContent = "+";
      plus.addEventListener("click", () => setCartQty(id, qty + 1));

      qtyControls.appendChild(minus);
      qtyControls.appendChild(qtyValue);
      qtyControls.appendChild(plus);

      controls.appendChild(qtyControls);
      row.appendChild(controls);

      checkoutItemsEl.appendChild(row);
    });

    const taxes = 0;
    const total = subtotal + taxes;

    summarySubtotalEl.textContent = formatBRL(subtotal);
    summaryTaxesEl.textContent = formatBRL(taxes);
    summaryTotalEl.textContent = formatBRL(total);

    if (checkoutButton) checkoutButton.disabled = false;
  }

  // Product cards
  function createProductCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.productId = String(product.id || "");

    const images = normalizeProductImages(product);

    const imageWrapper = document.createElement("div");
    imageWrapper.className = "product-image-wrapper";

    if (images.length <= 1) {
      if (images.length === 1) {
        const img = document.createElement("img");
        img.src = images[0];
        img.alt = product.name || "Produto";
        img.loading = "lazy";
        imageWrapper.appendChild(img);
      }
    } else {
      const viewport = document.createElement("div");
      viewport.className = "product-image-viewport";

      const track = document.createElement("div");
      track.className = "product-image-track";

      images.forEach((src) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = product.name || "Produto";
        img.loading = "lazy";
        track.appendChild(img);
      });

      viewport.appendChild(track);
      imageWrapper.appendChild(viewport);

      const controls = document.createElement("div");
      controls.className = "product-carousel-controls";

      const leftBtn = document.createElement("button");
      leftBtn.type = "button";
      leftBtn.className = "product-carousel-arrow product-carousel-arrow-left";
      leftBtn.textContent = "‹";

      const indicator = document.createElement("div");
      indicator.className = "product-carousel-indicator";

      const rightBtn = document.createElement("button");
      rightBtn.type = "button";
      rightBtn.className = "product-carousel-arrow product-carousel-arrow-right";
      rightBtn.textContent = "›";

      controls.appendChild(leftBtn);
      controls.appendChild(indicator);
      controls.appendChild(rightBtn);
      viewport.appendChild(controls);

      let currentIndex = 0;
      function updateCarousel() {
        const index = Math.max(0, Math.min(images.length - 1, currentIndex));
        currentIndex = index;
        track.style.transform = "translateX(" + String(-index * 100) + "%)";
        indicator.textContent = String(index + 1) + "/" + String(images.length);
        leftBtn.disabled = index === 0;
        rightBtn.disabled = index === images.length - 1;
      }

      leftBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (currentIndex > 0) {
          currentIndex -= 1;
          updateCarousel();
        }
      });

      rightBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (currentIndex < images.length - 1) {
          currentIndex += 1;
          updateCarousel();
        }
      });

      updateCarousel();
    }

    card.appendChild(imageWrapper);

    const content = document.createElement("div");
    content.className = "product-content";

    const name = document.createElement("div");
    name.className = "product-name";
    name.textContent = product.name || "Produto";
    content.appendChild(name);

    const desc = document.createElement("div");
    desc.className = "product-description";
    desc.textContent = product.description || "Peça da coleção DARAH.";
    content.appendChild(desc);

    const meta = document.createElement("div");
    meta.className = "product-meta";

    const priceBlock = document.createElement("div");
    priceBlock.className = "product-price-block";

    const hasOffer =
      typeof product.originalPrice === "number" &&
      typeof product.price === "number" &&
      product.originalPrice > product.price;

    if (hasOffer) {
      const original = document.createElement("span");
      original.className = "product-price-original";
      original.textContent = formatBRL(product.originalPrice);
      priceBlock.appendChild(original);

      const current = document.createElement("span");
      current.className = "product-price-current";
      current.textContent = formatBRL(product.price);
      priceBlock.appendChild(current);

      if (product.discountLabel) {
        const lbl = document.createElement("span");
        lbl.className = "product-discount-label";
        lbl.textContent = String(product.discountLabel);
        priceBlock.appendChild(lbl);
      }
    } else {
      const price = document.createElement("span");
      price.className = "product-price";
      price.textContent = formatBRL(product.price);
      priceBlock.appendChild(price);
    }

    meta.appendChild(priceBlock);

    const stock = document.createElement("div");
    stock.className = "product-stock";
    if (typeof product.stock === "number") {
      stock.textContent = product.stock > 0 ? "Estoque: " + product.stock : "Sem estoque";
    } else {
      stock.textContent = "Estoque: -";
    }
    meta.appendChild(stock);

    content.appendChild(meta);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "primary-button";
    addBtn.textContent = "Adicionar ao carrinho";

    const outOfStock = typeof product.stock === "number" && product.stock <= 0;
    addBtn.disabled = outOfStock;

    addBtn.addEventListener("click", () => {
      addToCart(product, 1);
    });

    content.appendChild(addBtn);

    card.appendChild(content);

    return card;
  }

  function renderProducts() {
    Object.keys(productLists).forEach((cat) => {
      const container = productLists[cat];
      if (!container) return;
      container.innerHTML = "";

      const items = allProducts.filter((p) => p && p.category === cat);
      items.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (a.id && b.id) return String(b.id).localeCompare(String(a.id));
        return 0;
      });

      if (!items.length) {
        return;
      }

      const frag = document.createDocumentFragment();
      items.forEach((p) => frag.appendChild(createProductCard(p)));
      container.appendChild(frag);
    });
  }

  // Homepage rendering
  function renderHomepage() {
    const notices = Array.isArray(homepageState.notices) ? homepageState.notices : [];
    if (siteNoticesEl && siteNoticesListEl) {
      if (notices.length) {
        siteNoticesEl.style.display = "";
        siteNoticesListEl.innerHTML = "";
        const frag = document.createDocumentFragment();
        notices.forEach((n) => {
          const p = document.createElement("p");
          p.className = "home-highlight-text";
          p.style.margin = "0 0 10px 0";
          p.textContent = String(n || "").trim();
          frag.appendChild(p);
        });
        siteNoticesListEl.appendChild(frag);
      } else {
        siteNoticesEl.style.display = "none";
        siteNoticesListEl.innerHTML = "";
      }
    }

    if (aboutTextEl) aboutTextEl.textContent = homepageState.aboutText || "";

    if (heroImagesEl) {
      heroImagesEl.innerHTML = "";
      const heroImages = normalizeList(homepageState.heroImages || [], 12);
      const heroSection = heroImagesEl.closest(".hero");

      if (!heroImages.length) {
        if (heroSection) heroSection.classList.add("hero-no-images");
      } else {
        if (heroSection) heroSection.classList.remove("hero-no-images");
        const frag = document.createDocumentFragment();
        heroImages.forEach((src) => {
          const img = document.createElement("img");
          img.src = src;
          img.alt = "Imagem da homepage";
          img.loading = "lazy";
          frag.appendChild(img);
        });
        heroImagesEl.appendChild(frag);
      }
    }

    if (aboutLongTextEl) {
      const text = homepageState.aboutLongText || homepageState.aboutText || "";
      aboutLongTextEl.textContent = text;
    }

    if (aboutCollageEl) {
      aboutCollageEl.innerHTML = "";
      const aboutImages = normalizeList(homepageState.aboutImages || [], 4);

      if (!aboutImages.length) {
        aboutCollageEl.style.display = "none";
      } else {
        aboutCollageEl.style.display = "grid";
        const frag = document.createDocumentFragment();
        aboutImages.forEach((src) => {
          const img = document.createElement("img");
          img.src = src;
          img.alt = "Imagem da página Sobre";
          img.loading = "lazy";
          frag.appendChild(img);
        });
        aboutCollageEl.appendChild(frag);
      }
    }

    applyThemeVariant(homepageState.theme || "default");
  }

  // Data loading with bootstrap support for instant loading
  async function loadHomepage() {
    try {
      if (window.__DARAH_BOOTSTRAP__ && window.__DARAH_BOOTSTRAP__.homepage) {
        const hp = window.__DARAH_BOOTSTRAP__.homepage;

        homepageState.aboutText = typeof hp.aboutText === "string" ? hp.aboutText : "";
        homepageState.aboutLongText = typeof hp.aboutLongText === "string" ? hp.aboutLongText : "";
        homepageState.notices = normalizeList(hp.notices || [], 10);
        homepageState.theme = typeof hp.theme === "string" ? hp.theme : "default";
        homepageState.heroImages = [];
        homepageState.aboutImages = [];

        renderHomepage();

        if (window.__DARAH_BOOTSTRAP__.imagesDeferred) {
          if (window.requestIdleCallback) {
            requestIdleCallback(
              () => {
                setTimeout(loadHomepageImages, 300);
              },
              { timeout: 2000 }
            );
          } else {
            setTimeout(loadHomepageImages, 800);
          }
        }
        return;
      }

      const res = await fetch("/api/homepage", { cache: "no-store" });
      if (!res.ok) throw new Error("homepage fetch failed");
      const hp = await res.json();

      homepageState.aboutText = typeof hp.aboutText === "string" ? hp.aboutText : "";
      homepageState.aboutLongText = typeof hp.aboutLongText === "string" ? hp.aboutLongText : "";
      homepageState.heroImages = normalizeList(hp.heroImages || [], 12);
      homepageState.aboutImages = normalizeList(hp.aboutImages || [], 4);
      homepageState.notices = normalizeList(hp.notices || [], 10);
      homepageState.theme = typeof hp.theme === "string" ? hp.theme : "default";

      renderHomepage();
    } catch (err) {
      console.error(err);
      renderHomepage();
    }
  }

  async function loadHomepageImages() {
    try {
      const res = await fetch("/api/homepage", { cache: "default" });
      if (!res.ok) return;
      const hp = await res.json();

      homepageState.heroImages = normalizeList(hp.heroImages || [], 12);
      homepageState.aboutImages = normalizeList(hp.aboutImages || [], 4);

      renderHomepage();
    } catch (err) {
      console.error("Failed to load images:", err);
    }
  }

  async function loadProducts() {
    try {
      if (window.__DARAH_BOOTSTRAP__ && window.__DARAH_BOOTSTRAP__.products) {
        const products = window.__DARAH_BOOTSTRAP__.products;

        if (Array.isArray(products)) {
          allProducts = products;
        } else if (products && typeof products === "object") {
          const flat = [];
          ["specials", "sets", "rings", "necklaces", "bracelets", "earrings"].forEach((key) => {
            if (Array.isArray(products[key])) products[key].forEach((p) => flat.push(p));
          });
          allProducts = flat;
        } else {
          allProducts = [];
        }

        renderProducts();

        if (window.__DARAH_BOOTSTRAP__.imagesDeferred) {
          if (window.requestIdleCallback) {
            requestIdleCallback(
              () => {
                setTimeout(loadProductImages, 500);
              },
              { timeout: 2000 }
            );
          } else {
            setTimeout(loadProductImages, 1000);
          }
        }
        return;
      }

      const res = await fetch("/api/products", { cache: "no-store" });
      if (!res.ok) throw new Error("products fetch failed");
      const products = await res.json();

      if (Array.isArray(products)) {
        allProducts = products;
      } else if (products && typeof products === "object") {
        const flat = [];
        ["specials", "sets", "rings", "necklaces", "bracelets", "earrings"].forEach((key) => {
          if (Array.isArray(products[key])) products[key].forEach((p) => flat.push(p));
        });
        allProducts = flat;
      } else {
        allProducts = [];
      }

      renderProducts();
    } catch (err) {
      console.error(err);
      allProducts = [];
      renderProducts();
    }
  }

  async function loadProductImages() {
    try {
      const res = await fetch("/api/products", { cache: "default" });
      if (!res.ok) return;
      const products = await res.json();

      if (Array.isArray(products)) {
        allProducts = products;
      } else if (products && typeof products === "object") {
        const flat = [];
        ["specials", "sets", "rings", "necklaces", "bracelets", "earrings"].forEach((key) => {
          if (Array.isArray(products[key])) products[key].forEach((p) => flat.push(p));
        });
        allProducts = flat;
      }

      renderProducts();
    } catch (err) {
      console.error("Failed to load product images:", err);
    }
  }

  // Cart UI wiring
  updateCartBadge();

  if (cartButton) {
    cartButton.addEventListener("click", () => {
      renderCheckout();
      switchView("checkout");
    });
  }

  if (checkoutButton) {
    checkoutButton.addEventListener("click", () => {
      const popup = window.open("about:blank", "_blank");

      (async () => {
        let wasDisabled = false;
        try {
          if (checkoutButton && !checkoutButton.disabled) {
            checkoutButton.disabled = true;
            wasDisabled = true;
          }

          const cartObj = loadCart();

          if (!cartObj || Object.keys(cartObj).length === 0) {
            alert("Seu carrinho está vazio. Adicione itens antes de finalizar o pedido.");
            if (popup && !popup.closed) popup.close();
            return;
          }

          const cartItems = [];
          for (const [, cartItem] of Object.entries(cartObj)) {
            if (cartItem && cartItem.qty > 0 && cartItem.product) {
              cartItems.push({
                id: cartItem.product.id,
                name: cartItem.product.name,
                price: cartItem.product.price,
                quantity: cartItem.qty
              });
            }
          }

          if (cartItems.length === 0) {
            alert("Seu carrinho está vazio. Adicione itens antes de finalizar o pedido.");
            if (popup && !popup.closed) popup.close();
            return;
          }

          const res = await fetch("/api/checkout-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: cartItems })
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || "Falha ao gerar link de checkout");
          }

          const data = await res.json();

          if (data.url) {
            if (popup && !popup.closed) {
              popup.location.href = data.url;
            } else {
              window.location.href = data.url;
            }
          } else {
            if (popup && !popup.closed) popup.close();
            alert("Erro ao gerar link do WhatsApp. Tente novamente.");
          }
        } catch (err) {
          console.error("Checkout error:", err);
          if (popup && !popup.closed) popup.close();
          alert("Erro ao finalizar pedido: " + err.message);
        } finally {
          if (checkoutButton && wasDisabled) checkoutButton.disabled = false;
        }
      })();
    });
  }

  // Initial view and load
  switchView("home");
  loadHomepage();
  renderCheckout();
  loadProducts();
}

/* =========================================================
   ADMIN
   ========================================================= */

function initAdminApp() {
  /**
   * The entire block below is your existing admin script with one key change:
   * - We ensure admin-only body class is set here.
   */

  // Limits
  const MAX_PRODUCT_IMAGES = 5; // até 5 imagens por produto
  const MAX_HOMEPAGE_IMAGES = 12; // até 12 imagens no collage da página inicial
  const MAX_ABOUT_IMAGES = 4; // até 4 imagens no collage da aba Sobre

  // Basic layout
  const bodyEl = document.body;

  // Mark admin page so admin-only CSS can be scoped safely
  if (bodyEl) bodyEl.classList.add("admin-page");

  const navMobileToggle = document.querySelector(".nav-mobile-toggle");
  const navDropdown = document.getElementById("navDropdown");
  const navLeftContainer = document.querySelector(".nav-left");

  // Top navigation inside Admin (mirrors storefront)
  const navLinks = Array.from(document.querySelectorAll(".main-nav .nav-link"));
  const views = {
    home: document.getElementById("view-home"),
    about: document.getElementById("view-about"),
    specials: document.getElementById("view-specials"),
    sets: document.getElementById("view-sets"),
    rings: document.getElementById("view-rings"),
    necklaces: document.getElementById("view-necklaces"),
    bracelets: document.getElementById("view-bracelets"),
    earrings: document.getElementById("view-earrings")
  };

  // Auth and panel sections
  const loginSection = document.getElementById("adminLoginSection");
  const loginButton = document.getElementById("adminLoginButton");
  const usernameInput = document.getElementById("adminUsername");
  const passwordInput = document.getElementById("adminPassword");
  const loginErrorEl = document.getElementById("adminLoginError");
  const loadingSection = document.getElementById("adminLoadingSection");
  const welcomeMessageEl = document.getElementById("adminWelcomeMessage");
  const panelSection = document.getElementById("adminPanelSection");

  // Header user info and logout
  const logoutButton = document.getElementById("adminLogoutButton");
  const userNameLabel = document.getElementById("adminUserNameLabel");

  // Theme
  const themeSelect = document.getElementById("adminThemeSelect");

  // Homepage admin controls (Início)
  const aboutTextEl = document.getElementById("adminAboutText");
  const heroGalleryEl = document.getElementById("adminHeroGallery");
  const heroImagesTextarea = document.getElementById("adminHeroImages");
  const heroImagesFileInput = document.getElementById("adminHeroImagesFile");
  const heroImagesFileButton = document.getElementById("adminHeroImagesFileButton");
  const saveHomepageBtn = document.getElementById("saveHomepageBtn");
  const homepageStatusEl = document.getElementById("adminHomepageStatus");

  // About page long text
  const aboutLongTextEl = document.getElementById("adminAboutLongText");

  // Optional site notices
  const addNoticeBtn = document.getElementById("adminAddNoticeBtn");
  const noticeListEl = document.getElementById("adminNoticeList");
  const noticeStatusEl = document.getElementById("adminNoticeStatus");
  const noticeItemTemplate = document.getElementById("noticeItemTemplate");

  // About page collage controls (matching admin.html)
  const aboutCollageEl = document.getElementById("adminAboutCollagePreview");
  const aboutImagePreviewEl = document.getElementById("adminAboutImagePreview");
  const aboutImagePlaceholderEl = document.getElementById("adminAboutImagePlaceholder");
  const aboutImagesTextarea = document.getElementById("adminAboutImages");
  const aboutImagesFileInput = document.getElementById("adminAboutImagesFile");
  const aboutImagesFileButton = document.getElementById("adminAboutImagesFileButton");
  const aboutSaveStatusEl = document.getElementById("adminAboutSaveStatus");
  const saveAboutPageBtn = document.getElementById("saveAboutPageBtn");

  // Product modal and templates
  const productModalBackdrop = document.getElementById("adminProductModalBackdrop");
  const productModalTitle = document.getElementById("adminProductModalTitle");
  const productModalClose = document.getElementById("adminProductModalClose");
  const productDeleteButton = document.getElementById("productDeleteButton");
  const addCardTemplate = document.getElementById("adminAddCardTemplate");
  const productCardTemplate = document.getElementById("adminProductCardTemplate");
  const productImagePreview = document.getElementById("productImagePreview");
  const productImagePlaceholder = document.getElementById("productImagePlaceholder");
  const productImageFileButton = document.getElementById("productImageFileButton");
  const productImageThumbs = document.getElementById("productImageThumbs");

  // Product form (in modal)
  const hiddenForm = {
    el: document.getElementById("productForm"),
    category: document.getElementById("productCategory"),
    name: document.getElementById("productName"),
    description: document.getElementById("productDescription"),
    price: document.getElementById("productPrice"),
    originalPrice: document.getElementById("productOriginalPrice"),
    discountLabel: document.getElementById("productDiscountLabel"),
    stock: document.getElementById("productStock"),
    imageUrl: document.getElementById("productImageUrl"),
    imageFile: document.getElementById("productImageFile"),
    status: document.getElementById("adminProductFormStatus")
  };

  // Category grids (mirror storefront)
  const grids = {
    specials: document.getElementById("grid-specials"),
    sets: document.getElementById("grid-sets"),
    rings: document.getElementById("grid-rings"),
    necklaces: document.getElementById("grid-necklaces"),
    bracelets: document.getElementById("grid-bracelets"),
    earrings: document.getElementById("grid-earrings")
  };

  // State
  let allProducts = [];
  let homepageState = {
    aboutText: "",
    aboutLongText: "",
    heroImages: [],
    notices: [],
    theme: "default",
    aboutImages: []
  };
  let currentProductEditing = null;
  let currentProductImages = [];

  // Responsive mode state
  let isSmallDevice = false;

  // Allowed users and welcome messages
  const VALID_USERS = {
    "Maria Eduarda": {
      password: "Maria123@",
      welcome: "Bem vinda, Maria Eduarda!"
    },
    "Danielle Almeida": {
      password: "Dani123@",
      welcome: "Bem vinda, Danielle!"
    }
  };

  function setBodyLoginMode(isLogin) {
    if (!bodyEl) return;
    if (isLogin) bodyEl.classList.add("is-admin-login");
    else bodyEl.classList.remove("is-admin-login");
  }

  function openMobileMenu() {
    if (!navDropdown || !navMobileToggle) return;
    if (!isSmallDevice) return;
    navDropdown.classList.add("open");
    navMobileToggle.classList.add("is-open");
    navMobileToggle.setAttribute("aria-expanded", "true");
  }

  function closeMobileMenu() {
    if (!navDropdown || !navMobileToggle) return;
    navDropdown.classList.remove("open");
    navMobileToggle.classList.remove("is-open");
    navMobileToggle.setAttribute("aria-expanded", "false");
  }

  setBodyLoginMode(true);

  // Keep responsive mode synced, and force close mobile menu when switching to desktop mode
  const responsive = attachResponsiveMode(bodyEl, (nextIsSmall) => {
    isSmallDevice = nextIsSmall;
    if (!isSmallDevice) closeMobileMenu();
  });
  isSmallDevice = responsive.isSmall();

  // ... everything else in your admin code stays the same after this point ...
}
