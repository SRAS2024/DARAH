"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // Limits (mirror admin)
  const MAX_HOMEPAGE_IMAGES = 12;
  const MAX_ABOUT_IMAGES = 4;
  const MAX_PRODUCT_IMAGES = 5;

  // Client side cache keys
  const HOMEPAGE_CACHE_KEY = "darah-homepage-v1";
  const PRODUCTS_CACHE_KEY = "darah-products-v1";

  const HAS_LOCAL_STORAGE =
    typeof window !== "undefined" && typeof window.localStorage !== "undefined";

  // =========================
  // Admin users, login and welcome
  // =========================
  const ADMIN_USERS = [
    {
      username: "Maria Eduarda",
      password: "Maria123@",
      displayName: "Maria Eduarda",
      gender: "f"
    },
    {
      username: "Danielle Almeida",
      password: "Dani123@",
      displayName: "Danielle Almeida",
      gender: "f"
    },
    {
      username: "Ryan Simonds",
      password: "Minhalinda",
      displayName: "Ryan",
      gender: "m"
    }
  ];

  function findAdminUser(username, password) {
    if (!username || !password) return null;
    return ADMIN_USERS.find(
      (u) => u.username === username && u.password === password
    );
  }

  const adminLoginSection = document.getElementById("adminLoginSection");
  const adminLoadingSection = document.getElementById("adminLoadingSection");
  const adminPanelSection = document.getElementById("adminPanelSection");

  const adminLoginButton = document.getElementById("adminLoginButton");
  const adminUsernameInput = document.getElementById("adminUsername");
  const adminPasswordInput = document.getElementById("adminPassword");
  const adminLoginError = document.getElementById("adminLoginError");
  const adminWelcomeMessage = document.getElementById("adminWelcomeMessage");

  const adminUserNameLabel = document.getElementById("adminUserNameLabel");
  const adminLogoutButton = document.getElementById("adminLogoutButton");

  const adminThemeSelect = document.getElementById("adminThemeSelect");

  let currentAdminUser = null;

  function showLoginError(message) {
    if (!adminLoginError) return;
    adminLoginError.textContent = message || "Usuário ou senha inválidos.";
    adminLoginError.classList.add("error");
    adminLoginError.style.display = "block";
  }

  function clearLoginError() {
    if (!adminLoginError) return;
    adminLoginError.textContent = "";
    adminLoginError.style.display = "none";
  }

  function setLoggedInUserLabel(user) {
    if (!adminUserNameLabel) return;
    if (!user) {
      adminUserNameLabel.textContent = "";
      return;
    }
    adminUserNameLabel.textContent = user.displayName;
  }

  function setWelcomeMessageForUser(user) {
    if (!adminWelcomeMessage || !user) return;

    if (user.displayName === "Ryan" || user.username === "Ryan Simonds") {
      adminWelcomeMessage.textContent = "Bem-vindo, Ryan!";
      return;
    }

    if (user.gender === "f") {
      adminWelcomeMessage.textContent = "Bem-vinda, " + user.displayName + "!";
    } else {
      adminWelcomeMessage.textContent = "Bem-vindo, " + user.displayName + "!";
    }
  }

  function showAdminLoading(user) {
    if (adminLoginSection) {
      adminLoginSection.style.display = "none";
    }
    if (adminPanelSection) {
      adminPanelSection.style.display = "none";
    }
    if (adminLoadingSection) {
      adminLoadingSection.style.display = "flex";
      setWelcomeMessageForUser(user);
    }
    setLoggedInUserLabel(user);

    setTimeout(() => {
      if (adminLoadingSection) {
        adminLoadingSection.style.display = "none";
      }
      if (adminPanelSection) {
        adminPanelSection.style.display = "block";
      }
    }, 4000);
  }

  function resetAdminToLoggedOut() {
    currentAdminUser = null;
    if (adminPanelSection) {
      adminPanelSection.style.display = "none";
    }
    if (adminLoadingSection) {
      adminLoadingSection.style.display = "none";
    }
    if (adminLoginSection) {
      adminLoginSection.style.display = "block";
    }
    if (adminUserNameLabel) {
      adminUserNameLabel.textContent = "";
    }
    if (adminUsernameInput) {
      adminUsernameInput.value = "";
    }
    if (adminPasswordInput) {
      adminPasswordInput.value = "";
    }
    clearLoginError();
  }

  function handleAdminLogin() {
    if (!adminUsernameInput || !adminPasswordInput) return;

    const username = adminUsernameInput.value.trim();
    const password = adminPasswordInput.value;

    const user = findAdminUser(username, password);
    if (!user) {
      showLoginError("Usuário ou senha inválidos.");
      return;
    }

    clearLoginError();
    currentAdminUser = user;
    showAdminLoading(user);
  }

  if (adminLoginButton && adminUsernameInput && adminPasswordInput) {
    adminLoginButton.addEventListener("click", handleAdminLogin);

    adminPasswordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAdminLogin();
      }
    });

    adminUsernameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAdminLogin();
      }
    });
  }

  if (adminLogoutButton) {
    adminLogoutButton.addEventListener("click", () => {
      resetAdminToLoggedOut();
    });
  }

  // Navigation and common UI
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const cartButton = document.getElementById("cartButton");
  const cartCountEl = document.getElementById("cartCount");
  const yearEl = document.getElementById("year");
  const checkoutButton = document.getElementById("checkoutButton");
  const rootEl = document.documentElement;

  // Mobile nav controls
  const mobileToggle = document.querySelector(".nav-mobile-toggle");
  const navDropdown = document.getElementById("navDropdown");
  let mobileMenuOpen = false;

  // Views mirror
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

  // Homepage elements
  const aboutTextEl = document.getElementById("aboutText");
  const aboutLongTextEl = document.getElementById("aboutLongText");
  const heroImagesEl = document.getElementById("heroImages");
  const heroEl =
    document.querySelector("#view-home .hero") || document.querySelector(".hero");
  const siteNoticesEl = document.getElementById("siteNotices");
  const siteNoticesListEl = document.getElementById("siteNoticesList");

  // About tab collage (public site)
  const aboutCollageEl = document.getElementById("aboutCollage");

  // Lightweight client side state
  let homepageLoadedOnce = false;
  let cartLoading = false;

  // =========================
  // Helpers
  // =========================
  function formatBRL(value) {
    if (value == null || Number.isNaN(Number(value))) return "R$ 0,00";
    try {
      return Number(value).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      });
    } catch {
      return "R$ " + Number(value).toFixed(2).replace(".", ",");
    }
  }

  function normalizeImageList(input, max) {
    if (!Array.isArray(input)) return [];
    const cleaned = input
      .map((s) => String(s || "").trim())
      .filter((s, index, arr) => s.length && arr.indexOf(s) === index);
    if (typeof max === "number" && max > 0) {
      return cleaned.slice(0, max);
    }
    return cleaned;
  }

  function normalizeProductImages(product) {
    if (!product || typeof product !== "object") {
      return [];
    }

    const primary =
      typeof product.imageUrl === "string" ? product.imageUrl.trim() : "";

    const fromImages = Array.isArray(product.images) ? product.images : [];
    const fromImageUrls = Array.isArray(product.imageUrls) ? product.imageUrls : [];

    const merged = [...fromImages, ...fromImageUrls];

    const cleaned = merged
      .map((u) => String(u || "").trim())
      .filter((u, index, arr) => u && arr.indexOf(u) === index);

    if (primary && !cleaned.includes(primary)) {
      cleaned.unshift(primary);
    }

    return normalizeImageList(cleaned, MAX_PRODUCT_IMAGES);
  }

  // Generic theme variants (supports more than only "natal")
  function applyThemeVariant(theme) {
    const variant = (theme && String(theme).trim()) || "default";
    if (rootEl) {
      rootEl.setAttribute("data-theme-variant", variant);
      rootEl.dataset.themeVariant = variant;
    }
    if (adminThemeSelect) {
      adminThemeSelect.value = variant;
    }
  }

  if (adminThemeSelect) {
    adminThemeSelect.addEventListener("change", () => {
      const newVariant = adminThemeSelect.value || "default";
      applyThemeVariant(newVariant);
    });
  }

  function setActiveView(key) {
    Object.entries(views).forEach(([name, el]) => {
      if (!el) return;
      if (name === key) el.classList.add("active-view");
      else el.classList.remove("active-view");
    });

    // Highlight nav except on checkout
    navLinks.forEach((btn) => {
      const viewKey = btn.dataset.view;
      btn.classList.toggle("active", key !== "checkout" && viewKey === key);
    });

    // Lazy load when we switch to checkout
    if (key === "checkout") loadCartView();
  }

  function updateCartCountFromCartData(cartData) {
    if (!cartData || !Array.isArray(cartData.items)) {
      if (cartCountEl) cartCountEl.textContent = "0";
      return;
    }
    const total = cartData.items.reduce((sum, it) => sum + (it.quantity || 0), 0);
    if (cartCountEl) cartCountEl.textContent = String(total);
  }

  async function refreshCartCount() {
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) throw new Error();
      const cartData = await res.json();
      updateCartCountFromCartData(cartData);
    } catch {
      if (cartCountEl) cartCountEl.textContent = "0";
    }
  }

  // =========================
  // Homepage
  // =========================
  function renderNotices(notices) {
    if (!siteNoticesEl || !siteNoticesListEl) return;

    siteNoticesListEl.innerHTML = "";
    const list = Array.isArray(notices)
      ? notices.filter((n) => n && n.trim().length)
      : [];
    if (!list.length) {
      siteNoticesEl.style.display = "none";
      return;
    }

    siteNoticesEl.style.display = "block";

    list.forEach((text) => {
      const p = document.createElement("p");
      p.className = "home-highlight-text";
      p.textContent = text;
      siteNoticesListEl.appendChild(p);
    });
  }

  function renderHeroImages(srcs) {
    if (!heroImagesEl) return;
    heroImagesEl.innerHTML = "";

    const imgs = normalizeImageList(srcs, MAX_HOMEPAGE_IMAGES);

    if (!imgs.length) {
      heroImagesEl.style.display = "none";
      if (heroEl) heroEl.classList.add("hero-no-images");
      return;
    }

    heroImagesEl.style.display = "grid";
    if (heroEl) heroEl.classList.remove("hero-no-images");

    imgs.forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Joia DARAH";
      img.loading = "lazy";
      img.decoding = "async";
      heroImagesEl.appendChild(img);
    });
  }

  function renderAboutImages(srcs) {
    if (!aboutCollageEl) return;
    aboutCollageEl.innerHTML = "";

    const imgs = normalizeImageList(srcs, MAX_ABOUT_IMAGES);

    if (!imgs.length) {
      aboutCollageEl.style.display = "none";
      return;
    }

    aboutCollageEl.style.display = "grid";

    imgs.forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Sobre a DARAH";
      img.loading = "lazy";
      img.decoding = "async";
      aboutCollageEl.appendChild(img);
    });
  }

  // Pure render function for homepage payload
  function renderHomepagePayload(hp) {
    if (!hp || typeof hp !== "object") {
      applyThemeVariant("default");
      renderHeroImages([]);
      renderAboutImages([]);
      renderNotices([]);
      if (aboutTextEl) aboutTextEl.textContent = "";
      if (aboutLongTextEl) aboutLongTextEl.textContent = "";
      return;
    }

    if (aboutTextEl && typeof hp.aboutText === "string") {
      aboutTextEl.textContent = hp.aboutText;
    }

    if (aboutLongTextEl) {
      if (typeof hp.aboutLongText === "string" && hp.aboutLongText.trim().length) {
        aboutLongTextEl.textContent = hp.aboutLongText;
      } else if (typeof hp.aboutText === "string") {
        aboutLongTextEl.textContent = hp.aboutText;
      } else {
        aboutLongTextEl.textContent = "";
      }
    }

    if (hp && typeof hp.theme === "string") {
      applyThemeVariant(hp.theme);
    } else {
      applyThemeVariant("default");
    }

    renderHeroImages(hp.heroImages);
    renderAboutImages(hp.aboutImages);
    renderNotices(hp.notices);

    homepageLoadedOnce = true;
  }

  // Try to hydrate homepage from localStorage before hitting the network
  function primeHomepageFromCache() {
    if (!HAS_LOCAL_STORAGE) return;
    try {
      const raw = window.localStorage.getItem(HOMEPAGE_CACHE_KEY);
      if (!raw) return;
      const cached = JSON.parse(raw);
      renderHomepagePayload(cached);
    } catch (err) {
      console.warn("Falha ao carregar homepage do cache local:", err);
    }
  }

  async function loadHomepage(options) {
    const force = options && options.force;
    if (homepageLoadedOnce && !force) return;

    try {
      const res = await fetch("/api/homepage");
      if (!res.ok) throw new Error("Erro ao carregar conteúdo da página inicial");
      const hp = await res.json();

      renderHomepagePayload(hp);

      // Persist into localStorage for instant future reloads
      if (HAS_LOCAL_STORAGE) {
        try {
          window.localStorage.setItem(HOMEPAGE_CACHE_KEY, JSON.stringify(hp));
        } catch {
          // Ignore storage errors
        }
      }
    } catch (err) {
      console.error(err);
      renderHomepagePayload(null);
    }
  }

  // =========================
  // Product image carousel
  // =========================
  function setupImageCarousel(imageWrapper, images) {
    const cleanImages = normalizeImageList(images, MAX_PRODUCT_IMAGES);

    if (!cleanImages.length) {
      return;
    }

    imageWrapper.innerHTML = "";

    const viewport = document.createElement("div");
    viewport.className = "product-image-viewport";

    const track = document.createElement("div");
    track.className = "product-image-track";

    cleanImages.forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Produto DARAH";
      img.loading = "lazy";
      img.decoding = "async";
      track.appendChild(img);
    });

    viewport.appendChild(track);
    imageWrapper.appendChild(viewport);

    if (cleanImages.length === 1) {
      return;
    }

    let currentIndex = 0;
    const total = cleanImages.length;

    const controls = document.createElement("div");
    controls.className = "product-carousel-controls";

    const leftArrow = document.createElement("button");
    leftArrow.type = "button";
    leftArrow.textContent = "‹";
    leftArrow.className = "product-carousel-arrow product-carousel-arrow-left";

    const rightArrow = document.createElement("button");
    rightArrow.type = "button";
    rightArrow.textContent = "›";
    rightArrow.className = "product-carousel-arrow product-carousel-arrow-right";

    const indicator = document.createElement("div");
    indicator.className = "product-carousel-indicator";

    controls.appendChild(leftArrow);
    controls.appendChild(indicator);
    controls.appendChild(rightArrow);
    viewport.appendChild(controls);

    function updateCarousel() {
      const offsetPercent = currentIndex * 100;
      track.style.transform = "translateX(-" + offsetPercent + "%)";
      indicator.textContent = String(currentIndex + 1) + "/" + String(total);

      if (currentIndex === 0) {
        leftArrow.disabled = true;
      } else {
        leftArrow.disabled = false;
      }

      if (currentIndex === total - 1) {
        rightArrow.disabled = true;
      } else {
        rightArrow.disabled = false;
      }
    }

    function goToNext() {
      if (currentIndex < total - 1) {
        currentIndex += 1;
        updateCarousel();
      }
    }

    function goToPrev() {
      if (currentIndex > 0) {
        currentIndex -= 1;
        updateCarousel();
      }
    }

    leftArrow.addEventListener("click", (e) => {
      e.stopPropagation();
      goToPrev();
    });
    rightArrow.addEventListener("click", (e) => {
      e.stopPropagation();
      goToNext();
    });

    // Touch swipe for mobile
    let touchStartX = null;
    let touchEndX = null;

    viewport.addEventListener(
      "touchstart",
      (e) => {
        if (!e.touches || !e.touches.length) return;
        touchStartX = e.touches[0].clientX;
        touchEndX = null;
      },
      { passive: true }
    );

    viewport.addEventListener(
      "touchmove",
      (e) => {
        if (!e.touches || !e.touches.length) return;
        touchEndX = e.touches[0].clientX;
      },
      { passive: true }
    );

    viewport.addEventListener(
      "touchend",
      () => {
        if (touchStartX == null || touchEndX == null) return;
        const deltaX = touchEndX - touchStartX;
        const threshold = 40;
        if (deltaX > threshold) {
          goToPrev();
        } else if (deltaX < -threshold) {
          goToNext();
        }
        touchStartX = null;
        touchEndX = null;
      },
      { passive: true }
    );

    updateCarousel();
  }

  // =========================
  // Products and categories
  // =========================
  function renderProductList(containerId, products, categoryKey) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    if (!Array.isArray(products) || !products.length) {
      const empty = document.createElement("p");
      empty.className = "checkout-empty";
      empty.textContent = "Ainda não há produtos nesta categoria.";
      container.appendChild(empty);
      return;
    }

    products.forEach((product) => {
      const card = document.createElement("article");
      card.className = "product-card";

      const imageWrapper = document.createElement("div");
      imageWrapper.className = "product-image-wrapper";

      const images = normalizeProductImages(product);
      if (images.length) {
        setupImageCarousel(imageWrapper, images);
      }

      const content = document.createElement("div");
      content.className = "product-content";

      const headerLine = document.createElement("div");
      headerLine.className = "product-meta";

      const nameEl = document.createElement("h3");
      nameEl.className = "product-name";
      nameEl.textContent = product.name || "Produto";
      headerLine.appendChild(nameEl);

      const descEl = document.createElement("p");
      descEl.className = "product-description";
      descEl.textContent = product.description || "Joia exclusiva DARAH.";

      const metaLine = document.createElement("div");
      metaLine.className = "product-meta";

      const priceBlock = document.createElement("div");
      priceBlock.className = "product-price-block";

      const currentPriceEl = document.createElement("span");
      currentPriceEl.className = "product-price";
      currentPriceEl.textContent = formatBRL(product.price);

      const stockEl = document.createElement("span");
      stockEl.className = "product-stock";
      stockEl.textContent =
        typeof product.stock === "number" ? "Estoque: " + product.stock : "";

      const isSpecialsCategory =
        categoryKey === "specials" || product.category === "specials";

      const hasOriginal =
        typeof product.originalPrice === "number" &&
        !Number.isNaN(product.originalPrice) &&
        product.originalPrice > product.price;

      if (isSpecialsCategory && hasOriginal) {
        const oldPriceEl = document.createElement("span");
        oldPriceEl.className = "product-price-original";
        oldPriceEl.textContent = formatBRL(product.originalPrice);

        const currentEl = document.createElement("span");
        currentEl.className = "product-price-current";
        currentEl.textContent = formatBRL(product.price);

        priceBlock.appendChild(oldPriceEl);
        priceBlock.appendChild(currentEl);

        if (product.discountLabel && String(product.discountLabel).trim().length) {
          const discountEl = document.createElement("span");
          discountEl.className = "product-discount-label";
          discountEl.textContent = String(product.discountLabel).trim();
          priceBlock.appendChild(discountEl);
        }
      } else {
        priceBlock.appendChild(currentPriceEl);
      }

      metaLine.appendChild(priceBlock);
      metaLine.appendChild(stockEl);

      const actionsRow = document.createElement("div");
      actionsRow.style.marginTop = "8px";

      const button = document.createElement("button");
      button.className = "primary-button";
      const available = typeof product.stock === "number" && product.stock > 0;

      if (!available) {
        button.disabled = true;
        button.textContent = "Esgotado";
      } else {
        button.textContent = "Adicionar ao carrinho";
        button.addEventListener("click", () => addToCart(product.id));
      }

      actionsRow.appendChild(button);

      content.appendChild(headerLine);
      content.appendChild(descEl);
      content.appendChild(metaLine);
      content.appendChild(actionsRow);

      card.appendChild(imageWrapper);
      card.appendChild(content);

      container.appendChild(card);
    });
  }

  // Helper to infer the base category for specials
  function inferBaseCategory(product) {
    const raw = String(product.category || "").toLowerCase().trim();

    // If already a known base category, just use it
    if (["rings", "necklaces", "bracelets", "earrings", "sets"].includes(raw)) {
      return raw;
    }

    // If the category is "specials" or empty, try to guess from the name
    const name = String(product.name || "").toLowerCase();

    if (name.includes("anel") || name.includes("aliança")) return "rings";
    if (name.includes("colar") || name.includes("gargantilha")) return "necklaces";
    if (name.includes("pulseira") || name.includes("bracelete")) return "bracelets";
    if (name.includes("brinco")) return "earrings";
    if (name.includes("conjunto") || name.includes("combo") || name.includes("kit")) {
      return "sets";
    }

    // Fallback: no clear base category
    return "";
  }

  // Render grouped product payload into all category grids
  function renderGroupedProducts(grouped) {
    if (!grouped || typeof grouped !== "object") {
      // If something goes wrong, just clear the grids
      renderProductList("specialsList", [], "specials");
      renderProductList("setsList", [], "sets");
      renderProductList("ringsList", [], "rings");
      renderProductList("necklacesList", [], "necklaces");
      renderProductList("braceletsList", [], "bracelets");
      renderProductList("earringsList", [], "earrings");
      return;
    }

    const specials = Array.isArray(grouped.specials) ? grouped.specials : [];
    const sets = Array.isArray(grouped.sets) ? grouped.sets.slice() : [];

    let rings = Array.isArray(grouped.rings) ? grouped.rings.slice() : [];
    let necklaces = Array.isArray(grouped.necklaces)
      ? grouped.necklaces.slice()
      : [];
    let bracelets = Array.isArray(grouped.bracelets)
      ? grouped.bracelets.slice()
      : [];
    let earrings = Array.isArray(grouped.earrings)
      ? grouped.earrings.slice()
      : [];

    function addUniqueById(target, product) {
      if (!product || product.id == null) return;
      if (target.some((p) => p && p.id === product.id)) return;
      target.push(product);
    }

    // Any product that appears in "specials" is also added to its base category
    specials.forEach((product) => {
      const cat = inferBaseCategory(product);

      switch (cat) {
        case "rings":
          addUniqueById(rings, product);
          break;
        case "necklaces":
          addUniqueById(necklaces, product);
          break;
        case "bracelets":
          addUniqueById(bracelets, product);
          break;
        case "earrings":
          addUniqueById(earrings, product);
          break;
        case "sets":
          addUniqueById(sets, product);
          break;
        default:
          break;
      }
    });

    // New categories
    renderProductList("specialsList", specials, "specials");
    renderProductList("setsList", sets, "sets");

    // Existing categories, enriched by specials
    renderProductList("ringsList", rings, "rings");
    renderProductList("necklacesList", necklaces, "necklaces");
    renderProductList("braceletsList", bracelets, "bracelets");
    renderProductList("earringsList", earrings, "earrings");
  }

  // Try to hydrate products from localStorage before hitting the network
  function primeProductsFromCache() {
    if (!HAS_LOCAL_STORAGE) return;
    try {
      const raw = window.localStorage.getItem(PRODUCTS_CACHE_KEY);
      if (!raw) return;
      const cached = JSON.parse(raw);
      renderGroupedProducts(cached);
    } catch (err) {
      console.warn("Falha ao carregar produtos do cache local:", err);
    }
  }

  async function loadProducts(options) {
    const force = options && options.force;

    try {
      const res = await fetch("/api/products", {
        cache: force ? "reload" : "default"
      });
      if (!res.ok) throw new Error("Erro ao carregar produtos");
      const grouped = await res.json();

      renderGroupedProducts(grouped);

      // Persist into localStorage for instant future reloads
      if (HAS_LOCAL_STORAGE) {
        try {
          window.localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(grouped));
        } catch {
          // ignore storage errors
        }
      }
    } catch (err) {
      console.error(err);
      // If network fails, do not clear what may be on screen now
    }
  }

  async function addToCart(productId) {
    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          body && body.error
            ? body.error
            : "Não foi possível adicionar o produto ao carrinho.";
        alert(msg);
        return;
      }

      const cartData = await res.json();
      updateCartCountFromCartData(cartData);
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar produto ao carrinho.");
    }
  }

  // =========================
  // Checkout view and cart
  // =========================
  function renderCart(cartData) {
    const itemsContainer = document.getElementById("checkoutItems");
    const subtotalEl = document.getElementById("summarySubtotal");
    const taxesEl = document.getElementById("summaryTaxes");
    const totalEl = document.getElementById("summaryTotal");

    if (!itemsContainer) return;

    itemsContainer.innerHTML = "";

    const emptyAndReset = () => {
      const empty = document.createElement("div");
      empty.className = "checkout-empty";
      empty.textContent = "Seu carrinho está vazio no momento.";
      itemsContainer.appendChild(empty);
      if (subtotalEl) subtotalEl.textContent = "R$ 0,00";
      if (taxesEl) taxesEl.textContent = "R$ 0,00";
      if (totalEl) totalEl.textContent = "R$ 0,00";
      if (checkoutButton) checkoutButton.disabled = true;
    };

    if (!cartData || !Array.isArray(cartData.items) || !cartData.items.length) {
      emptyAndReset();
      return;
    }

    cartData.items.forEach((item) => {
      const row = document.createElement("article");
      row.className = "checkout-item";

      const imageWrapper = document.createElement("div");
      imageWrapper.className = "checkout-item-image";
      if (item.imageUrl) {
        const img = document.createElement("img");
        img.src = item.imageUrl;
        img.alt = item.name || "Produto DARAH";
        img.loading = "lazy";
        img.decoding = "async";
        imageWrapper.appendChild(img);
      }

      const info = document.createElement("div");
      info.className = "checkout-item-info";

      const nameEl = document.createElement("div");
      nameEl.className = "checkout-item-name";
      nameEl.textContent = item.name || "Produto";

      const unitEl = document.createElement("div");
      unitEl.className = "checkout-item-unit";
      unitEl.textContent = `${formatBRL(item.price)} por unidade`;

      const totalElItem = document.createElement("div");
      totalElItem.className = "checkout-item-total";
      totalElItem.textContent = `Total: ${formatBRL(item.lineTotal)}`;

      info.appendChild(nameEl);
      info.appendChild(unitEl);
      info.appendChild(totalElItem);

      const controls = document.createElement("div");
      controls.className = "checkout-item-controls";

      const qtyControls = document.createElement("div");
      qtyControls.className = "quantity-controls";

      const minusBtn = document.createElement("button");
      minusBtn.className = "quantity-button";
      minusBtn.textContent = "−";

      const qtyValue = document.createElement("span");
      qtyValue.className = "quantity-value";
      qtyValue.textContent = String(item.quantity);

      const plusBtn = document.createElement("button");
      plusBtn.className = "quantity-button";
      plusBtn.textContent = "+";

      minusBtn.addEventListener("click", () => {
        const newQty = item.quantity - 1;
        updateCartItem(item.id, newQty);
      });

      plusBtn.addEventListener("click", () => {
        const newQty = item.quantity + 1;
        updateCartItem(item.id, newQty);
      });

      qtyControls.appendChild(minusBtn);
      qtyControls.appendChild(qtyValue);
      qtyControls.appendChild(plusBtn);
      controls.appendChild(qtyControls);

      row.appendChild(imageWrapper);
      row.appendChild(info);
      row.appendChild(controls);

      itemsContainer.appendChild(row);
    });

    if (subtotalEl) subtotalEl.textContent = formatBRL(cartData.subtotal);
    if (taxesEl) taxesEl.textContent = formatBRL(cartData.taxes);
    if (totalEl) totalEl.textContent = formatBRL(cartData.total);
    if (checkoutButton) checkoutButton.disabled = false;
  }

  async function loadCartView() {
    if (cartLoading) return;
    cartLoading = true;

    try {
      const res = await fetch("/api/cart");
      if (!res.ok) throw new Error("Erro ao carregar carrinho");
      const cartData = await res.json();
      renderCart(cartData);
      updateCartCountFromCartData(cartData);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar o carrinho.");
    } finally {
      cartLoading = false;
    }
  }

  async function updateCartItem(productId, quantity) {
    try {
      const res = await fetch("/api/cart/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          body && body.error
            ? body.error
            : "Não foi possível atualizar a quantidade do item.";
        alert(msg);
        return;
      }

      const cartData = await res.json();
      renderCart(cartData);
      updateCartCountFromCartData(cartData);
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar item do carrinho.");
    }
  }

  async function handleCheckout() {
    try {
      const res = await fetch("/api/checkout-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          body && body.error
            ? body.error
            : "Não foi possível gerar o link de checkout.";
        alert(msg);
        return;
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        alert("Não foi possível abrir o WhatsApp.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao finalizar o pedido.");
    }
  }

  // =========================
  // Navigation wiring
  // =========================
  function setMobileMenuOpen(open) {
    mobileMenuOpen = !!open;
    if (!navDropdown || !mobileToggle) return;

    if (mobileMenuOpen) {
      navDropdown.classList.add("open");
      navDropdown.setAttribute("aria-hidden", "false");
      mobileToggle.classList.add("is-open");
      mobileToggle.setAttribute("aria-expanded", "true");
    } else {
      navDropdown.classList.remove("open");
      navDropdown.setAttribute("aria-hidden", "true");
      mobileToggle.classList.remove("is-open");
      mobileToggle.setAttribute("aria-expanded", "false");
    }
  }

  function setupNavButton(btn) {
    if (!btn) return;
    btn.addEventListener("click", () => {
      const key = btn.dataset.view;
      if (!key) return;
      setActiveView(key);
      if (key === "home" || key === "about") {
        // Cached after first successful load or bootstrap
        loadHomepage();
      }
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    });
  }

  // Clone the extra tabs into the dropdown for mobile
  if (navDropdown) {
    const extraNavButtons = navLinks.filter(
      (btn) => btn.dataset.mobileExtra === "true"
    );

    extraNavButtons.forEach((btn) => {
      const clone = btn.cloneNode(true);
      clone.classList.add("nav-dropdown-link");
      navDropdown.appendChild(clone);
      setupNavButton(clone);
    });
  }

  if (mobileToggle && navDropdown) {
    mobileToggle.addEventListener("click", () => {
      setMobileMenuOpen(!mobileMenuOpen);
    });
  }

  // Close mobile menu on resize back to desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth > 640 && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  });

  // Attach navigation to main nav links
  navLinks.forEach(setupNavButton);

  // =========================
  // Events for cart and year
  // =========================
  if (cartButton) {
    cartButton.addEventListener("click", () => setActiveView("checkout"));
  }

  if (checkoutButton) {
    checkoutButton.addEventListener("click", handleCheckout);
  }

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // =========================
  // Initial load
  // =========================
  const initialVariant = rootEl ? rootEl.getAttribute("data-theme-variant") : null;
  applyThemeVariant(initialVariant || "default");

  // Use server injected bootstrap if available for instant paint
  const bootstrap =
    typeof window !== "undefined" ? window.__DARAH_BOOTSTRAP__ || null : null;

  if (bootstrap && bootstrap.homepage) {
    renderHomepagePayload(bootstrap.homepage);
    if (HAS_LOCAL_STORAGE) {
      try {
        window.localStorage.setItem(
          HOMEPAGE_CACHE_KEY,
          JSON.stringify(bootstrap.homepage)
        );
      } catch {
        // ignore
      }
    }
  } else {
    // No bootstrap, fall back to local cache and then network
    primeHomepageFromCache();
  }

  if (bootstrap && bootstrap.products) {
    renderGroupedProducts(bootstrap.products);
    if (HAS_LOCAL_STORAGE) {
      try {
        window.localStorage.setItem(
          PRODUCTS_CACHE_KEY,
          JSON.stringify(bootstrap.products)
        );
      } catch {
        // ignore
      }
    }
  } else {
    // No bootstrap, fall back to local cache and then network
    primeProductsFromCache();
  }

  setActiveView("home");

  // If there was no bootstrap data, fetch from API once
  if (!bootstrap || !bootstrap.homepage) {
    loadHomepage();
  }
  if (!bootstrap || !bootstrap.products) {
    loadProducts();
  }

  // Cart count is tiny, safe to always refresh
  refreshCartCount();
});
