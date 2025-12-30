"use strict";

/**
 * DARAH · Shared script (Storefront + Admin)
 *
 * IMPORTANT:
 * - The storefront (index.html) and admin (admin.html) both load main.js.
 * - We auto-detect which page is running by checking for admin sections.
 * - Storefront code must run when admin sections are NOT present.
 * - Admin code must run when admin sections ARE present.
 */

document.addEventListener("DOMContentLoaded", () => {
  const hasAdminLoginSection = !!document.getElementById("adminLoginSection");
  const hasAdminPanelSection = !!document.getElementById("adminPanelSection");

  if (hasAdminLoginSection || hasAdminPanelSection) {
    initAdminApp();
  } else {
    initStorefrontApp();
  }
});

/* =========================================================
   STORE
   ========================================================= */

function initStorefrontApp() {
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

    // Only clone the tabs marked as "mobile extra" into the dropdown
    const extraTabs = Array.from(navLeftContainer.querySelectorAll(".nav-link"))
      .filter((btn) => btn.getAttribute("data-mobile-extra") === "true");

    extraTabs.forEach((btn) => {
      const viewId = btn.getAttribute("data-view");
      if (!viewId || !views[viewId]) return;

      const clone = btn.cloneNode(true);
      clone.classList.remove("active");

      clone.addEventListener("click", () => {
        switchView(viewId);

        // Visual active state inside dropdown is optional; keep consistent anyway
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
        // Keep empty grid clean (no placeholders)
        return;
      }

      const frag = document.createDocumentFragment();
      items.forEach((p) => frag.appendChild(createProductCard(p)));
      container.appendChild(frag);
    });
  }

  // Homepage rendering
  function renderHomepage() {
    // Notices
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

    // Hero about text
    if (aboutTextEl) aboutTextEl.textContent = homepageState.aboutText || "";

    // Hero images collage
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

    // About page long text
    if (aboutLongTextEl) {
      const text = homepageState.aboutLongText || homepageState.aboutText || "";
      aboutLongTextEl.textContent = text;
    }

    // About collage
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
      // Check for server-side bootstrap data first (instant loading)
      if (window.__DARAH_BOOTSTRAP__ && window.__DARAH_BOOTSTRAP__.homepage) {
        const hp = window.__DARAH_BOOTSTRAP__.homepage;

        // Load text content immediately from bootstrap
        homepageState.aboutText = typeof hp.aboutText === "string" ? hp.aboutText : "";
        homepageState.aboutLongText = typeof hp.aboutLongText === "string" ? hp.aboutLongText : "";
        homepageState.notices = normalizeList(hp.notices || [], 10);
        homepageState.theme = typeof hp.theme === "string" ? hp.theme : "default";
        homepageState.heroImages = [];
        homepageState.aboutImages = [];

        // Render immediately with text (no images yet)
        renderHomepage();

        // Defer image loading until browser is truly idle (not blocking initial render)
        if (window.__DARAH_BOOTSTRAP__.imagesDeferred) {
          if (window.requestIdleCallback) {
            requestIdleCallback(() => {
              setTimeout(loadHomepageImages, 300); // Extra delay for smooth UX
            }, { timeout: 2000 });
          } else {
            setTimeout(loadHomepageImages, 800);
          }
        }
        return;
      }

      // Fallback to API call if no bootstrap
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
      // Render safe defaults so layout still works
      renderHomepage();
    }
  }

  // Load images separately in background for fast initial render
  async function loadHomepageImages() {
    try {
      const res = await fetch("/api/homepage", { cache: "default" });
      if (!res.ok) return;
      const hp = await res.json();

      homepageState.heroImages = normalizeList(hp.heroImages || [], 12);
      homepageState.aboutImages = normalizeList(hp.aboutImages || [], 4);

      // Re-render to show images
      renderHomepage();
    } catch (err) {
      console.error("Failed to load images:", err);
    }
  }

  async function loadProducts() {
    try {
      // Check for server-side bootstrap data first (instant loading)
      if (window.__DARAH_BOOTSTRAP__ && window.__DARAH_BOOTSTRAP__.products) {
        const products = window.__DARAH_BOOTSTRAP__.products;

        // Load product data structure immediately (without images)
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

        // Render product cards immediately (images will show placeholders)
        renderProducts();

        // Defer image loading until browser is truly idle (not blocking initial render)
        if (window.__DARAH_BOOTSTRAP__.imagesDeferred) {
          if (window.requestIdleCallback) {
            requestIdleCallback(() => {
              setTimeout(loadProductImages, 500); // Extra delay for smooth UX
            }, { timeout: 2000 });
          } else {
            setTimeout(loadProductImages, 1000);
          }
        }
        return;
      }

      // Fallback to API call if no bootstrap
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

  // Load product images separately in background
  async function loadProductImages() {
    try {
      const res = await fetch("/api/products", { cache: "default" });
      if (!res.ok) return;
      const products = await res.json();

      // Update products with images
      if (Array.isArray(products)) {
        allProducts = products;
      } else if (products && typeof products === "object") {
        const flat = [];
        ["specials", "sets", "rings", "necklaces", "bracelets", "earrings"].forEach((key) => {
          if (Array.isArray(products[key])) products[key].forEach((p) => flat.push(p));
        });
        allProducts = flat;
      }

      // Re-render with images
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
    checkoutButton.addEventListener("click", async () => {
      try {
        // Get cart from localStorage
        const cartObj = loadCart();

        if (!cartObj || Object.keys(cartObj).length === 0) {
          alert("Seu carrinho está vazio. Adicione itens antes de finalizar o pedido.");
          return;
        }

        // Convert cart object to array format with product details
        // Cart structure is { [productId]: { qty: number, product: object } }
        const cartItems = [];
        for (const [productId, cartItem] of Object.entries(cartObj)) {
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
          return;
        }

        // Send cart to server for WhatsApp message generation
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
          // Use direct navigation to open WhatsApp app (not window.open)
          window.location.href = data.url;
        } else {
          alert("Erro ao gerar link do WhatsApp. Tente novamente.");
        }
      } catch (err) {
        console.error("Checkout error:", err);
        alert("Erro ao finalizar pedido: " + err.message);
      }
    });
  }

  // Initial view and load - prioritize homepage for instant display
  switchView("home");
  loadHomepage();
  renderCheckout();

  // Load products immediately (needed for cart/checkout functionality)
  // Products without images load instantly, images come in background
  loadProducts();
}

/* =========================================================
   ADMIN
   ========================================================= */

function initAdminApp() {
  /**
   * The entire block below is your existing admin script with one key change:
   * - We removed the old "exit early" guard, because that was breaking the storefront.
   * - This function is only called on admin pages now.
   */

  // Limits
  const MAX_PRODUCT_IMAGES = 5; // até 5 imagens por produto
  const MAX_HOMEPAGE_IMAGES = 12; // até 12 imagens no collage da página inicial
  const MAX_ABOUT_IMAGES = 4; // até 4 imagens no collage da aba Sobre

  // Basic layout
  const bodyEl = document.body;
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

  function setLoginError(message) {
    if (!loginErrorEl) return;
    loginErrorEl.textContent = message || "";
    if (!message) {
      loginErrorEl.style.display = "none";
      loginErrorEl.classList.remove("error");
    } else {
      loginErrorEl.style.display = "block";
      loginErrorEl.classList.add("error");
    }
  }

  function setHomepageStatus(message, type) {
    if (!homepageStatusEl) return;
    homepageStatusEl.textContent = message || "";
    homepageStatusEl.classList.remove("ok", "error");
    if (type === "ok") homepageStatusEl.classList.add("ok");
    if (type === "error") homepageStatusEl.classList.add("error");
  }

  function setNoticeStatus(message, type) {
    if (!noticeStatusEl) return;
    noticeStatusEl.textContent = message || "";
    noticeStatusEl.classList.remove("ok", "error");
    if (type === "ok") noticeStatusEl.classList.add("ok");
    if (type === "error") noticeStatusEl.classList.add("error");
  }

  function setAboutStatus(message, type) {
    if (!aboutSaveStatusEl) return;
    aboutSaveStatusEl.textContent = message || "";
    aboutSaveStatusEl.classList.remove("ok", "error");
    if (type === "ok") aboutSaveStatusEl.classList.add("ok");
    if (type === "error") aboutSaveStatusEl.classList.add("error");
  }

  function setFormStatus(message, type) {
    const el = hiddenForm.status;
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("ok", "error");
    if (type === "ok") el.classList.add("ok");
    if (type === "error") el.classList.add("error");
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

  // Compress image to reduce file size while maintaining quality
  function compressImage(file, maxWidth = 1200, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions maintaining aspect ratio
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          // Create canvas and compress
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to compressed data URL
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Falha ao comprimir imagem'));
                return;
              }
              const compressedReader = new FileReader();
              compressedReader.onload = () => resolve(compressedReader.result);
              compressedReader.onerror = () => reject(new Error('Falha ao ler imagem comprimida'));
              compressedReader.readAsDataURL(blob);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => reject(new Error('Falha ao carregar imagem'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  }

  function fileToDataUrl(file) {
    // Use compression for images
    if (file.type.startsWith('image/')) {
      return compressImage(file);
    }

    // Fallback for non-images
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : String(reader.result));
      reader.onerror = () =>
        reject(reader.error || new Error("Falha ao ler arquivo de imagem."));
      reader.readAsDataURL(file);
    });
  }

  function applyThemeVariant(variant) {
    const root = document.documentElement;
    const trimmed = typeof variant === "string" ? variant.trim() : "";
    const value = trimmed || "default";
    if (root) {
      root.dataset.themeVariant = value;
      root.setAttribute("data-theme-variant", value);
    }
    if (themeSelect && themeSelect.value !== value) {
      const hasOption = Array.from(themeSelect.options).some((opt) => opt.value === value);
      if (hasOption) themeSelect.value = value;
    }
  }

  function normalizeList(list, max) {
    if (!Array.isArray(list)) return [];
    const cleaned = list
      .map((u) => String(u || "").trim())
      .filter((u, index, arr) => u && arr.indexOf(u) === index);
    return typeof max === "number" && max > 0 ? cleaned.slice(0, max) : cleaned;
  }

  function switchView(id) {
    Object.values(views).forEach((v) => v && v.classList.remove("active-view"));
    const el = views[id];
    if (el) el.classList.add("active-view");
    navLinks.forEach((b) => b.classList.toggle("active", b.dataset.view === id));
  }

  navLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.view;
      if (id && views[id]) switchView(id);
    });
  });

  function buildMobileDropdown() {
    if (!navDropdown || !navLeftContainer) return;
    navDropdown.innerHTML = "";
    const allTabs = navLeftContainer.querySelectorAll(".nav-link");
    allTabs.forEach((btn) => {
      const viewId = btn.getAttribute("data-view");
      if (!viewId || !views[viewId]) return;
      const clone = btn.cloneNode(true);
      clone.classList.remove("active");
      clone.dataset.view = viewId;
      clone.addEventListener("click", () => {
        switchView(viewId);
        const dropdownLinks = navDropdown.querySelectorAll(".nav-link");
        dropdownLinks.forEach((linkEl) => linkEl.classList.toggle("active", linkEl === clone));
        closeMobileMenu();
      });
      navDropdown.appendChild(clone);
    });
  }

  buildMobileDropdown();

  if (navMobileToggle && navDropdown) {
    navMobileToggle.addEventListener("click", () => {
      const isOpen = navDropdown.classList.contains("open");
      if (isOpen) closeMobileMenu();
      else openMobileMenu();
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!target || !(target instanceof Node)) return;
      if (navDropdown && navMobileToggle && !navDropdown.contains(target) && !navMobileToggle.contains(target)) {
        closeMobileMenu();
      }
    });
  }

  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      const value = (themeSelect.value || "default").trim() || "default";
      homepageState.theme = value;
      applyThemeVariant(value);
      setHomepageStatus("Tema atualizado. Clique em salvar para aplicar no site.", "ok");
    });
  }

  async function loadHomepageAdmin() {
    try {
      const res = await fetch("/api/homepage");
      if (!res.ok) throw new Error("Erro ao carregar conteúdo da homepage");
      const hp = await res.json();

      homepageState.aboutText = typeof hp.aboutText === "string" ? hp.aboutText : "";
      homepageState.aboutLongText = typeof hp.aboutLongText === "string" ? hp.aboutLongText : "";
      homepageState.heroImages = normalizeList(hp.heroImages || [], MAX_HOMEPAGE_IMAGES);
      homepageState.notices = normalizeList(hp.notices || [], 10);
      homepageState.theme = typeof hp.theme === "string" ? hp.theme : "default";
      homepageState.aboutImages = normalizeList(hp.aboutImages || [], MAX_ABOUT_IMAGES);

      if (aboutTextEl) aboutTextEl.value = homepageState.aboutText;

      if (aboutLongTextEl) {
        if (homepageState.aboutLongText && homepageState.aboutLongText.trim().length) {
          aboutLongTextEl.value = homepageState.aboutLongText;
        } else if (typeof hp.aboutText === "string") {
          aboutLongTextEl.value = hp.aboutText;
        } else {
          aboutLongTextEl.value = "";
        }
      }

      if (heroImagesTextarea) heroImagesTextarea.value = homepageState.heroImages.join("\n");
      if (aboutImagesTextarea) aboutImagesTextarea.value = homepageState.aboutImages.join("\n");

      applyThemeVariant(homepageState.theme);
      renderHeroGallery();
      renderAboutGallery();
      renderNotices();
      setHomepageStatus("Conteúdo carregado com sucesso.", "ok");
    } catch (err) {
      console.error(err);
      setHomepageStatus("Não foi possível carregar a homepage.", "error");
    }
  }

  function syncHeroImagesFromTextarea() {
    if (!heroImagesTextarea) return;
    const raw = heroImagesTextarea.value || "";
    const fromTextarea = raw
      .split(/\r?\n/)
      .map((u) => String(u || "").trim())
      .filter((u, index, arr) => u && arr.indexOf(u) === index)
      .slice(0, MAX_HOMEPAGE_IMAGES);
    homepageState.heroImages = fromTextarea;
    heroImagesTextarea.value = homepageState.heroImages.join("\n");
    renderHeroGallery();
  }

  function syncAboutImagesFromTextarea() {
    if (!aboutImagesTextarea) return;
    const raw = aboutImagesTextarea.value || "";
    const fromTextarea = raw
      .split(/\r?\n/)
      .map((u) => String(u || "").trim())
      .filter((u, index, arr) => u && arr.indexOf(u) === index)
      .slice(0, MAX_ABOUT_IMAGES);
    homepageState.aboutImages = fromTextarea;
    aboutImagesTextarea.value = homepageState.aboutImages.join("\n");
    renderAboutGallery();
  }

  function renderHeroGallery() {
    if (!heroGalleryEl) return;
    heroGalleryEl.innerHTML = "";

    heroGalleryEl.style.display = "grid";
    heroGalleryEl.style.gridTemplateColumns = "repeat(auto-fit, minmax(140px, 1fr))";
    heroGalleryEl.style.gap = "10px";
    heroGalleryEl.style.minHeight = "140px";

    if (!homepageState.heroImages.length) {
      const ph = document.createElement("div");
      ph.style.borderRadius = "14px";
      ph.style.background = "#dcdcdc";
      ph.style.minHeight = "150px";
      heroGalleryEl.appendChild(ph);
    } else {
      homepageState.heroImages.forEach((url, idx) => {
        const wrap = document.createElement("div");
        wrap.style.position = "relative";
        wrap.style.overflow = "hidden";
        wrap.style.borderRadius = "14px";

        const img = document.createElement("img");
        img.src = url;
        img.alt = "Imagem da homepage";
        img.loading = "lazy";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.display = "block";

        const del = document.createElement("button");
        del.type = "button";
        del.textContent = "×";
        del.title = "Remover";
        del.style.position = "absolute";
        del.style.top = "6px";
        del.style.right = "6px";
        del.style.border = "none";
        del.style.borderRadius = "999px";
        del.style.width = "28px";
        del.style.height = "28px";
        del.style.cursor = "pointer";
        del.style.background = "rgba(0,0,0,0.55)";
        del.style.color = "#fff";
        del.addEventListener("click", () => {
          homepageState.heroImages.splice(idx, 1);
          homepageState.heroImages = normalizeList(homepageState.heroImages, MAX_HOMEPAGE_IMAGES);
          if (heroImagesTextarea) heroImagesTextarea.value = homepageState.heroImages.join("\n");
          renderHeroGallery();
        });

        wrap.appendChild(img);
        wrap.appendChild(del);
        heroGalleryEl.appendChild(wrap);
      });
    }
  }

  function renderAboutGallery() {
    if (!aboutCollageEl) return;
    aboutCollageEl.innerHTML = "";

    aboutCollageEl.style.display = "grid";
    aboutCollageEl.style.gridTemplateColumns = "repeat(auto-fit, minmax(120px, 1fr))";
    aboutCollageEl.style.gap = "8px";
    aboutCollageEl.style.minHeight = "120px";

    const images = Array.isArray(homepageState.aboutImages) ? homepageState.aboutImages : [];

    if (!images.length) {
      const ph = document.createElement("div");
      ph.style.borderRadius = "14px";
      ph.style.background = "#dcdcdc";
      ph.style.minHeight = "120px";
      aboutCollageEl.appendChild(ph);

      if (aboutImagePreviewEl) {
        aboutImagePreviewEl.src = "";
        aboutImagePreviewEl.style.display = "none";
      }
      if (aboutImagePlaceholderEl) aboutImagePlaceholderEl.style.display = "flex";
      return;
    }

    if (aboutImagePreviewEl) {
      aboutImagePreviewEl.src = images[0];
      aboutImagePreviewEl.loading = "lazy";
      aboutImagePreviewEl.style.display = "block";
      aboutImagePreviewEl.style.width = "100%";
      aboutImagePreviewEl.style.height = "100%";
      aboutImagePreviewEl.style.objectFit = "cover";
    }
    if (aboutImagePlaceholderEl) aboutImagePlaceholderEl.style.display = "none";

    images.forEach((url, idx) => {
      const wrap = document.createElement("div");
      wrap.style.position = "relative";
      wrap.style.overflow = "hidden";
      wrap.style.borderRadius = "14px";

      const img = document.createElement("img");
      img.src = url;
      img.alt = "Imagem da página Sobre";
      img.loading = "lazy";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.display = "block";

      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "×";
      del.title = "Remover";
      del.style.position = "absolute";
      del.style.top = "6px";
      del.style.right = "6px";
      del.style.border = "none";
      del.style.borderRadius = "999px";
      del.style.width = "24px";
      del.style.height = "24px";
      del.style.cursor = "pointer";
      del.style.background = "rgba(0,0,0,0.55)";
      del.style.color = "#fff";
      del.addEventListener("click", () => {
        homepageState.aboutImages.splice(idx, 1);
        homepageState.aboutImages = normalizeList(homepageState.aboutImages, MAX_ABOUT_IMAGES);
        if (aboutImagesTextarea) aboutImagesTextarea.value = homepageState.aboutImages.join("\n");
        renderAboutGallery();
      });

      wrap.appendChild(img);
      wrap.appendChild(del);
      aboutCollageEl.appendChild(wrap);
    });
  }

  if (heroImagesTextarea) heroImagesTextarea.addEventListener("blur", syncHeroImagesFromTextarea);
  if (aboutImagesTextarea) aboutImagesTextarea.addEventListener("blur", syncAboutImagesFromTextarea);

  function renderNotices() {
    if (!noticeListEl) return;
    noticeListEl.innerHTML = "";
    setNoticeStatus("", "");

    if (!homepageState.notices || !homepageState.notices.length) {
      const p = document.createElement("p");
      p.className = "home-highlight-text";
      p.textContent = "Nenhum aviso no momento.";
      noticeListEl.appendChild(p);
      return;
    }

    homepageState.notices.forEach((text, idx) => {
      const value = typeof text === "string" ? text : "";

      if (noticeItemTemplate && "content" in noticeItemTemplate) {
        const fragment = document.importNode(noticeItemTemplate.content, true);
        const itemEl = fragment.querySelector(".admin-notice-item");
        const textSpan = fragment.querySelector(".admin-notice-text");
        const editBtn = fragment.querySelector(".admin-notice-edit");
        const deleteBtn = fragment.querySelector(".admin-notice-delete");

        if (!itemEl) return;

        if (textSpan) textSpan.textContent = value;

        if (editBtn) {
          editBtn.addEventListener("click", () => {
            const current = homepageState.notices[idx] || "";
            const updated = window.prompt("Editar aviso", current);
            if (updated == null) return;
            const trimmed = updated.trim();
            if (!trimmed) {
              homepageState.notices.splice(idx, 1);
              renderNotices();
              setNoticeStatus("Aviso removido. Clique em salvar para atualizar o site.", "ok");
              return;
            }
            homepageState.notices[idx] = trimmed;
            renderNotices();
            setNoticeStatus("Aviso atualizado. Clique em salvar para publicar.", "ok");
          });
        }

        if (deleteBtn) {
          deleteBtn.addEventListener("click", () => {
            if (!window.confirm("Remover este aviso?")) return;
            homepageState.notices.splice(idx, 1);
            renderNotices();
            setNoticeStatus("Aviso removido. Clique em salvar para atualizar o site.", "ok");
          });
        }

        noticeListEl.appendChild(fragment);
      }
    });
  }

  if (addNoticeBtn) {
    addNoticeBtn.addEventListener("click", () => {
      const text = window.prompt("Novo aviso");
      if (!text || !text.trim()) return;
      homepageState.notices.push(text.trim());
      homepageState.notices = normalizeList(homepageState.notices, 10);
      renderNotices();
      setNoticeStatus("Aviso adicionado. Clique em salvar para publicar no site.", "ok");
    });
  }

  if (heroImagesFileButton && heroImagesFileInput) {
    heroImagesFileButton.addEventListener("click", () => heroImagesFileInput.click());
    heroImagesFileInput.addEventListener("change", async () => {
      const files = Array.from(heroImagesFileInput.files || []);
      if (!files.length) return;
      try {
        setHomepageStatus("Processando imagens selecionadas...", "");
        for (const f of files) {
          const url = await fileToDataUrl(f);
          homepageState.heroImages.push(url);
        }
        homepageState.heroImages = normalizeList(homepageState.heroImages, MAX_HOMEPAGE_IMAGES);
        if (heroImagesTextarea) heroImagesTextarea.value = homepageState.heroImages.join("\n");
        renderHeroGallery();
        setHomepageStatus("Imagens adicionadas. Clique em salvar.", "ok");
      } catch (err) {
        console.error(err);
        setHomepageStatus("Não foi possível processar as imagens.", "error");
      } finally {
        heroImagesFileInput.value = "";
      }
    });
  }

  if (aboutImagesFileButton && aboutImagesFileInput) {
    aboutImagesFileButton.addEventListener("click", () => aboutImagesFileInput.click());
    aboutImagesFileInput.addEventListener("change", async () => {
      const files = Array.from(aboutImagesFileInput.files || []);
      if (!files.length) return;
      try {
        setAboutStatus("Processando imagens selecionadas...", "");
        for (const f of files) {
          const url = await fileToDataUrl(f);
          homepageState.aboutImages.push(url);
        }
        homepageState.aboutImages = normalizeList(homepageState.aboutImages, MAX_ABOUT_IMAGES);
        if (aboutImagesTextarea) aboutImagesTextarea.value = homepageState.aboutImages.join("\n");
        renderAboutGallery();
        setAboutStatus("Imagens adicionadas. Clique em salvar.", "ok");
      } catch (err) {
        console.error(err);
        setAboutStatus("Não foi possível processar as imagens.", "error");
      } finally {
        aboutImagesFileInput.value = "";
      }
    });
  }

  async function saveHomepage() {
    try {
      setHomepageStatus("Salvando...", "");
      setAboutStatus("Salvando...", "");

      const aboutText = aboutTextEl ? aboutTextEl.value.trim() : "";
      const aboutLongText = aboutLongTextEl ? aboutLongTextEl.value.trim() : "";

      if (heroImagesTextarea) syncHeroImagesFromTextarea();
      if (aboutImagesTextarea) syncAboutImagesFromTextarea();

      const heroImages = normalizeList(homepageState.heroImages, MAX_HOMEPAGE_IMAGES);
      const aboutImages = normalizeList(homepageState.aboutImages, MAX_ABOUT_IMAGES);
      const notices = normalizeList(homepageState.notices.filter((n) => n && n.trim().length), 10);
      const theme = homepageState.theme || "default";

      const res = await fetch("/api/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aboutText, aboutLongText, heroImages, aboutImages, notices, theme })
      });

      if (!res.ok) throw new Error("Falha ao salvar a homepage.");
      await res.json();

      homepageState.aboutText = aboutText;
      homepageState.aboutLongText = aboutLongText;
      homepageState.heroImages = heroImages;
      homepageState.aboutImages = aboutImages;
      homepageState.notices = notices;

      if (heroImagesTextarea) heroImagesTextarea.value = heroImages.join("\n");
      if (aboutImagesTextarea) aboutImagesTextarea.value = aboutImages.join("\n");

      setHomepageStatus("Homepage atualizada com sucesso.", "ok");
      setNoticeStatus("Avisos publicados na vitrine.", "ok");
      setAboutStatus('Colagem e texto da página "Sobre nós" atualizados.', "ok");

      await loadHomepageAdmin();
    } catch (err) {
      console.error(err);
      setHomepageStatus("Não foi possível salvar a homepage.", "error");
      setAboutStatus('Não foi possível salvar a página "Sobre nós".', "error");
    }
  }

  if (saveHomepageBtn) {
    saveHomepageBtn.addEventListener("click", (e) => {
      e.preventDefault();
      saveHomepage();
    });
  }

  if (saveAboutPageBtn) {
    saveAboutPageBtn.addEventListener("click", (e) => {
      e.preventDefault();
      saveHomepage();
    });
  }

  async function loadProducts() {
    try {
      let res = await fetch("/api/admin/products");
      if (!res.ok && res.status === 404) res = await fetch("/api/products");
      if (!res.ok) throw new Error("Erro ao carregar produtos");
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

      renderAllCategoryGrids();
      setFormStatus("", "");
    } catch (err) {
      console.error(err);
      setFormStatus("Não foi possível carregar os produtos.", "error");
      renderAllCategoryGrids();
    }
  }

  function renderAllCategoryGrids() {
    Object.keys(grids).forEach((catKey) => renderCategoryGrid(catKey));
  }

  function renderCategoryGrid(categoryKey) {
    const container = grids[categoryKey];
    if (!container) return;
    container.innerHTML = "";

    const items = allProducts.filter((p) => p.category === categoryKey);
    items.sort((a, b) => {
      if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (a.id && b.id) return String(b.id).localeCompare(String(a.id));
      return 0;
    });

    const fragment = document.createDocumentFragment();
    const addCardFragment = createAddProductCardFragment(categoryKey);

    if (items.length) {
      const firstCard = createProductCardFragment(items[0]);
      if (firstCard) fragment.appendChild(firstCard);
      if (addCardFragment) fragment.appendChild(addCardFragment);
      for (let i = 1; i < items.length; i += 1) {
        const card = createProductCardFragment(items[i]);
        if (card) fragment.appendChild(card);
      }
    } else if (addCardFragment) {
      fragment.appendChild(addCardFragment);
    }

    container.appendChild(fragment);
  }

  function createAddProductCardFragment(categoryKey) {
    if (!addCardTemplate || !("content" in addCardTemplate)) return null;
    const fragment = document.importNode(addCardTemplate.content, true);
    const button = fragment.querySelector(".admin-add-product-button");
    if (button) button.addEventListener("click", () => openProductModal(categoryKey, null));
    return fragment;
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

  function createProductCardFragment(product) {
    if (!productCardTemplate || !("content" in productCardTemplate)) return null;
    const fragment = document.importNode(productCardTemplate.content, true);
    const article = fragment.querySelector("article");
    if (!article) return null;

    article.dataset.productId = product.id || "";

    const wrapper = fragment.querySelector(".admin-product-image-wrapper");
    const imgEl = fragment.querySelector(".admin-product-image");
    const images = normalizeProductImages(product);

    if (wrapper) {
      if (!images.length) {
        if (imgEl) {
          imgEl.alt = product.name || "Imagem do produto";
          imgEl.style.display = "none";
        }
      } else if (images.length === 1) {
        if (imgEl) {
          imgEl.src = images[0];
          imgEl.alt = product.name || "Imagem do produto";
          imgEl.loading = "lazy";
          imgEl.style.display = "block";
        }
      } else {
        wrapper.innerHTML = "";

        const viewport = document.createElement("div");
        viewport.className = "product-image-viewport";

        const track = document.createElement("div");
        track.className = "product-image-track";

        images.forEach((src) => {
          const img = document.createElement("img");
          img.src = src;
          img.alt = product.name || "Imagem do produto";
          img.loading = "lazy";
          track.appendChild(img);
        });

        viewport.appendChild(track);
        wrapper.appendChild(viewport);

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
    }

    const titleEl = fragment.querySelector(".admin-product-title");
    if (titleEl) titleEl.textContent = product.name || "Produto";

    const descEl = fragment.querySelector(".admin-product-description");
    if (descEl) descEl.textContent = product.description || "Peça da coleção DARAH.";

    const priceEl = fragment.querySelector(".admin-product-price");
    if (priceEl) priceEl.textContent = formatBRL(product.price);

    const stockEl = fragment.querySelector(".admin-product-stock");
    if (stockEl) {
      if (typeof product.stock === "number") stockEl.textContent = "Estoque: " + product.stock;
      else stockEl.textContent = "Estoque: -";
    }

    const editBtn = fragment.querySelector(".admin-edit-product-button");
    if (editBtn) editBtn.addEventListener("click", () => openProductModal(product.category, product));

    return fragment;
  }

  function renderProductImagesUI() {
    if (!productImagePreview || !productImagePlaceholder || !productImageThumbs) return;
    productImageThumbs.innerHTML = "";

    if (!Array.isArray(currentProductImages) || !currentProductImages.length) {
      productImagePreview.src = "";
      productImagePreview.style.display = "none";
      productImagePlaceholder.style.display = "flex";
      if (hiddenForm.imageUrl) hiddenForm.imageUrl.value = "";
      return;
    }

    const cover = currentProductImages[0];
    productImagePreview.src = cover;
    productImagePreview.loading = "lazy";
    productImagePreview.style.display = "block";
    productImagePlaceholder.style.display = "none";

    if (hiddenForm.imageUrl) hiddenForm.imageUrl.value = cover;

    currentProductImages.forEach((url, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "admin-image-thumb" + (idx === 0 ? " active" : "");
      btn.style.position = "relative";

      const img = document.createElement("img");
      img.src = url;
      img.alt = "Imagem " + (idx + 1);
      img.loading = "lazy";
      btn.appendChild(img);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "×";
      removeBtn.style.position = "absolute";
      removeBtn.style.top = "0";
      removeBtn.style.right = "0";
      removeBtn.style.width = "16px";
      removeBtn.style.height = "16px";
      removeBtn.style.border = "none";
      removeBtn.style.borderRadius = "999px";
      removeBtn.style.cursor = "pointer";
      removeBtn.style.fontSize = "11px";
      removeBtn.style.lineHeight = "1";
      removeBtn.style.background = "rgba(0,0,0,0.65)";
      removeBtn.style.color = "#fff";
      removeBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        currentProductImages.splice(idx, 1);
        currentProductImages = normalizeList(currentProductImages, MAX_PRODUCT_IMAGES);
        renderProductImagesUI();
      });

      btn.addEventListener("click", () => {
        if (idx === 0) return;
        const copy = currentProductImages.slice();
        const tmp = copy[0];
        copy[0] = copy[idx];
        copy[idx] = tmp;
        currentProductImages = copy;
        renderProductImagesUI();
      });

      btn.appendChild(removeBtn);
      productImageThumbs.appendChild(btn);
    });
  }

  function openProductModal(categoryKey, productOrNull) {
    if (!hiddenForm.el || !productModalBackdrop) return;

    currentProductEditing = productOrNull || null;
    currentProductImages = productOrNull ? normalizeProductImages(productOrNull) : [];

    hiddenForm.el.reset();
    setFormStatus("", "");

    if (hiddenForm.category) hiddenForm.category.value = productOrNull?.category || categoryKey;
    if (hiddenForm.name) hiddenForm.name.value = productOrNull?.name || "";
    if (hiddenForm.description) hiddenForm.description.value = productOrNull?.description || "";
    if (hiddenForm.price) hiddenForm.price.value = typeof productOrNull?.price === "number" ? String(productOrNull.price) : "";
    if (hiddenForm.originalPrice) {
      hiddenForm.originalPrice.value = typeof productOrNull?.originalPrice === "number" ? String(productOrNull.originalPrice) : "";
    }
    if (hiddenForm.discountLabel) hiddenForm.discountLabel.value = typeof productOrNull?.discountLabel === "string" ? productOrNull.discountLabel : "";
    if (hiddenForm.stock) hiddenForm.stock.value = typeof productOrNull?.stock === "number" ? String(productOrNull.stock) : "";

    renderProductImagesUI();

    if (productDeleteButton) productDeleteButton.style.display = productOrNull?.id ? "inline-flex" : "none";
    if (productModalTitle) productModalTitle.textContent = productOrNull ? "Editar produto" : "Novo produto";

    productModalBackdrop.style.display = "flex";
  }

  function closeProductModal() {
    if (productModalBackdrop) productModalBackdrop.style.display = "none";
    currentProductEditing = null;
    currentProductImages = [];
    setFormStatus("", "");
    if (hiddenForm.el) hiddenForm.el.reset();
    if (productImagePreview && productImagePlaceholder && productImageThumbs) {
      productImagePreview.src = "";
      productImagePreview.style.display = "none";
      productImagePlaceholder.style.display = "flex";
      productImageThumbs.innerHTML = "";
    }
    if (hiddenForm.imageUrl) hiddenForm.imageUrl.value = "";
  }

  if (productModalClose && productModalBackdrop) {
    productModalClose.addEventListener("click", closeProductModal);
    productModalBackdrop.addEventListener("click", (event) => {
      if (event.target === productModalBackdrop) closeProductModal();
    });
  }

  if (productImageFileButton && hiddenForm.imageFile) {
    productImageFileButton.addEventListener("click", () => hiddenForm.imageFile.click());

    hiddenForm.imageFile.addEventListener("change", async () => {
      const files = Array.from(hiddenForm.imageFile.files || []);
      if (!files.length) return;
      try {
        setFormStatus("Carregando imagens selecionadas...", "");
        const newImages = [];
        for (const file of files) newImages.push(await fileToDataUrl(file));
        currentProductImages = normalizeList((currentProductImages || []).concat(newImages), MAX_PRODUCT_IMAGES);
        renderProductImagesUI();
        setFormStatus("Imagens adicionadas. Salve para aplicar.", "ok");
      } catch (err) {
        console.error(err);
        setFormStatus("Não foi possível processar a imagem selecionada.", "error");
      } finally {
        hiddenForm.imageFile.value = "";
      }
    });
  }

  if (hiddenForm.el) {
    hiddenForm.el.addEventListener("submit", async (event) => {
      event.preventDefault();

      const priceRaw = hiddenForm.price ? hiddenForm.price.value : "";
      const stockRaw = hiddenForm.stock ? hiddenForm.stock.value : "";
      const originalPriceRaw = hiddenForm.originalPrice ? hiddenForm.originalPrice.value : "";
      const discountLabelRaw = hiddenForm.discountLabel ? hiddenForm.discountLabel.value.trim() : "";

      const price = priceRaw ? parseFloat(priceRaw) : NaN;
      const stock = stockRaw ? parseInt(stockRaw, 10) : NaN;
      const originalPriceParsed = originalPriceRaw ? parseFloat(originalPriceRaw) : NaN;
      const originalPrice = Number.isNaN(originalPriceParsed) ? null : originalPriceParsed;
      const discountLabel = discountLabelRaw.length ? discountLabelRaw : null;

      const payload = {
        category: hiddenForm.category ? hiddenForm.category.value : "",
        name: hiddenForm.name ? hiddenForm.name.value.trim() : "",
        description: hiddenForm.description ? hiddenForm.description.value.trim() : "",
        price,
        stock,
        imageUrl: Array.isArray(currentProductImages) && currentProductImages.length ? currentProductImages[0] : "",
        images: Array.isArray(currentProductImages) ? currentProductImages.slice(0, MAX_PRODUCT_IMAGES) : [],
        originalPrice,
        discountLabel
      };

      if (!payload.name || Number.isNaN(payload.price) || Number.isNaN(payload.stock)) {
        setFormStatus("Preencha pelo menos nome, preço e quantidade em estoque.", "error");
        return;
      }

      try {
        setFormStatus("Salvando produto...", "");
        if (currentProductEditing && currentProductEditing.id) {
          await updateProduct(currentProductEditing.id, payload);
        } else {
          await createProduct(payload);
        }
        closeProductModal();
      } catch {
        // already handled
      }
    });
  }

  if (productDeleteButton) {
    productDeleteButton.addEventListener("click", async () => {
      if (!currentProductEditing || !currentProductEditing.id) return;
      if (!window.confirm("Excluir este produto?")) return;
      try {
        await deleteProduct(currentProductEditing.id);
        closeProductModal();
      } catch {
        // already handled
      }
    });
  }

  async function createProduct(payload) {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body && body.error ? body.error : "Não foi possível criar o produto.");
      }
      await res.json();
      setFormStatus("Produto criado com sucesso.", "ok");
      await loadProducts();
    } catch (err) {
      console.error(err);
      setFormStatus(err.message, "error");
      throw err;
    }
  }

  async function updateProduct(id, payload) {
    try {
      const res = await fetch("/api/products/" + encodeURIComponent(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body && body.error ? body.error : "Não foi possível atualizar o produto.");
      }
      await res.json();
      setFormStatus("Produto atualizado com sucesso.", "ok");
      await loadProducts();
    } catch (err) {
      console.error(err);
      setFormStatus(err.message, "error");
      throw err;
    }
  }

  async function deleteProduct(id) {
    try {
      const res = await fetch("/api/products/" + encodeURIComponent(id), { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body && body.error ? body.error : "Não foi possível excluir o produto.");
      }
      await res.json();
      setFormStatus("Produto excluído.", "ok");
      await loadProducts();
    } catch (err) {
      console.error(err);
      setFormStatus(err.message, "error");
      throw err;
    }
  }

  function storeAdminUser(username) {
    try {
      sessionStorage.setItem("darahAdminUser", JSON.stringify({ username }));
    } catch {}
  }

  function clearAdminUser() {
    try {
      sessionStorage.removeItem("darahAdminUser");
    } catch {}
  }

  function updateHeaderUser(username) {
    if (userNameLabel) userNameLabel.textContent = username || "";
  }

  function showLoginView() {
    if (panelSection) panelSection.style.display = "none";
    if (loadingSection) loadingSection.style.display = "none";
    if (loginSection) loginSection.style.display = "block";
    if (usernameInput) usernameInput.value = "";
    if (passwordInput) passwordInput.value = "";
    setLoginError("");
    updateHeaderUser("");
    setBodyLoginMode(true);
    closeMobileMenu();
  }

  function startAdminSession(username) {
    const info = VALID_USERS[username];
    if (!info) return;

    storeAdminUser(username);
    updateHeaderUser(username);
    setBodyLoginMode(false);

    if (loginSection) loginSection.style.display = "none";

    if (loadingSection) {
      if (welcomeMessageEl) welcomeMessageEl.textContent = info.welcome;

      const fill = loadingSection.querySelector(".loading-circle-fill");
      if (fill && fill.parentElement) {
        const clone = fill.cloneNode(true);
        fill.parentElement.replaceChild(clone, fill);
      }

      loadingSection.style.display = "flex";

      setTimeout(() => {
        loadingSection.style.display = "none";
        if (panelSection) panelSection.style.display = "block";
        initializeAdminData();
      }, 1800);
    } else {
      if (panelSection) panelSection.style.display = "block";
      initializeAdminData();
    }
  }

  function initializeAdminData() {
    switchView("home");
    renderAllCategoryGrids();
    loadHomepageAdmin();
    loadProducts();
  }

  function handleLoginSubmit() {
    const username = (usernameInput && usernameInput.value.trim()) || "";
    const password = (passwordInput && passwordInput.value) || "";

    const info = VALID_USERS[username];
    if (!info || info.password !== password) {
      setLoginError("Usuário ou senha inválidos.");
      return;
    }

    setLoginError("");
    startAdminSession(username);
  }

  if (loginButton) {
    loginButton.addEventListener("click", (e) => {
      e.preventDefault();
      handleLoginSubmit();
    });
  }

  if (usernameInput) {
    usernameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleLoginSubmit();
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleLoginSubmit();
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", (e) => {
      e.preventDefault();
      clearAdminUser();
      showLoginView();
    });
  }

  // Restore prior session
  try {
    const stored = sessionStorage.getItem("darahAdminUser");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.username && VALID_USERS[parsed.username]) {
        if (loginSection) loginSection.style.display = "none";
        if (loadingSection) loadingSection.style.display = "none";
        if (panelSection) panelSection.style.display = "block";

        const info = VALID_USERS[parsed.username];
        if (welcomeMessageEl && info) welcomeMessageEl.textContent = info.welcome;

        updateHeaderUser(parsed.username);
        setBodyLoginMode(false);
        initializeAdminData();
      }
    }
  } catch {}
}
