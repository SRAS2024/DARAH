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

  const rootEl = document.documentElement;

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

  // Navigation
  const navLinks = Array.from(
    document.querySelectorAll(".main-nav .nav-link")
  );
  const mobileToggle = document.querySelector(".nav-mobile-toggle");
  const navDropdown = document.getElementById("navDropdown");
  let mobileMenuOpen = false;

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

  // Homepage admin elements
  const adminHeroGallery = document.getElementById("adminHeroGallery");
  const adminAboutTextInput = document.getElementById("adminAboutText");
  const adminAboutLongTextInput = document.getElementById("adminAboutLongText");

  const adminHeroImagesTextarea = document.getElementById("adminHeroImages");
  const adminHeroImagesFileInput = document.getElementById("adminHeroImagesFile");
  const adminHeroImagesFileButton = document.getElementById(
    "adminHeroImagesFileButton"
  );

  const adminHomepageStatus = document.getElementById("adminHomepageStatus");

  // Notices
  const adminNoticeList = document.getElementById("adminNoticeList");
  const adminNoticeStatus = document.getElementById("adminNoticeStatus");
  const adminAddNoticeBtn = document.getElementById("adminAddNoticeBtn");
  const noticeItemTemplate = document.getElementById("noticeItemTemplate");

  // About images
  const adminAboutImagesTextarea = document.getElementById("adminAboutImages");
  const adminAboutImagesFileInput = document.getElementById(
    "adminAboutImagesFile"
  );
  const adminAboutImagesFileButton = document.getElementById(
    "adminAboutImagesFileButton"
  );
  const adminAboutCollagePreview = document.getElementById(
    "adminAboutCollagePreview"
  );
  const adminAboutImagePlaceholder = document.getElementById(
    "adminAboutImagePlaceholder"
  );
  const adminAboutImagePreview = document.getElementById(
    "adminAboutImagePreview"
  );
  const adminAboutSaveStatus = document.getElementById("adminAboutSaveStatus");

  const saveHomepageBtn = document.getElementById("saveHomepageBtn");
  const saveAboutPageBtn = document.getElementById("saveAboutPageBtn");

  // Product grid containers
  const productGridIds = {
    specials: "grid-specials",
    sets: "grid-sets",
    rings: "grid-rings",
    necklaces: "grid-necklaces",
    bracelets: "grid-bracelets",
    earrings: "grid-earrings"
  };

  // Product modal elements
  const productModalBackdrop = document.getElementById(
    "adminProductModalBackdrop"
  );
  const productModalTitle = document.getElementById("adminProductModalTitle");
  const productModalClose = document.getElementById("adminProductModalClose");
  const productForm = document.getElementById("productForm");
  const productCategorySelect = document.getElementById("productCategory");
  const productNameInput = document.getElementById("productName");
  const productDescriptionInput = document.getElementById("productDescription");
  const productImageFileButton = document.getElementById(
    "productImageFileButton"
  );
  const productImageFileInput = document.getElementById("productImageFile");
  const productImagePlaceholder = document.getElementById(
    "productImagePlaceholder"
  );
  const productImagePreview = document.getElementById("productImagePreview");
  const productImageThumbs = document.getElementById("productImageThumbs");
  const productImageUrlHidden = document.getElementById("productImageUrl");
  const productPriceInput = document.getElementById("productPrice");
  const productOriginalPriceInput = document.getElementById(
    "productOriginalPrice"
  );
  const productDiscountLabelInput = document.getElementById(
    "productDiscountLabel"
  );
  const productStockInput = document.getElementById("productStock");
  const adminProductFormStatus = document.getElementById(
    "adminProductFormStatus"
  );
  const productDeleteButton = document.getElementById("productDeleteButton");
  const adminAddCardTemplate = document.getElementById("adminAddCardTemplate");
  const adminProductCardTemplate = document.getElementById(
    "adminProductCardTemplate"
  );

  // State
  let currentAdminUser = null;
  let adminInitialized = false;

  let homepageData = null;
  let currentNotices = [];

  let productsData = null;
  let productsById = new Map();
  let currentEditingProductId = null;
  let currentProductCategory = "specials";
  let currentProductImages = [];

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
    const fromImageUrls = Array.isArray(product.imageUrls)
      ? product.imageUrls
      : [];

    const merged = [...fromImages, ...fromImageUrls];

    const cleaned = merged
      .map((u) => String(u || "").trim())
      .filter((u, index, arr) => u && arr.indexOf(u) === index);

    if (primary && !cleaned.includes(primary)) {
      cleaned.unshift(primary);
    }

    return normalizeImageList(cleaned, MAX_PRODUCT_IMAGES);
  }

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

  function getLinesFromTextarea(textarea, max) {
    if (!textarea) return [];
    const raw = String(textarea.value || "");
    const lines = raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s, index, arr) => s.length && arr.indexOf(s) === index);
    if (typeof max === "number" && max > 0) {
      return lines.slice(0, max);
    }
    return lines;
  }

  function readFilesAsDataUrls(files) {
    const list = Array.isArray(files) ? files : Array.from(files || []);
    if (!list.length) return Promise.resolve([]);
    return Promise.all(
      list.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () =>
              reject(reader.error || new Error("Erro ao ler arquivo"));
            reader.readAsDataURL(file);
          })
      )
    );
  }

  // =========================
  // Login helpers
  // =========================
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

  // =========================
  // Navigation
  // =========================
  function setActiveView(key) {
    Object.entries(views).forEach(([name, el]) => {
      if (!el) return;
      if (name === key) {
        el.classList.add("active-view");
      } else {
        el.classList.remove("active-view");
      }
    });

    navLinks.forEach((btn) => {
      const viewKey = btn.dataset.view;
      btn.classList.toggle("active", viewKey === key);
    });
  }

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
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      const key = btn.dataset.view;
      if (!key) return;
      setActiveView(key);
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    });
  }

  // Clone all nav buttons into dropdown for mobile
  if (navDropdown && navLinks.length) {
    navLinks.forEach((btn) => {
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
  // Homepage admin rendering
  // =========================
  function renderHeroGalleryFromTextarea() {
    if (!adminHeroGallery || !adminHeroImagesTextarea) return;

    const imgs = normalizeImageList(
      getLinesFromTextarea(adminHeroImagesTextarea, MAX_HOMEPAGE_IMAGES),
      MAX_HOMEPAGE_IMAGES
    );

    adminHeroGallery.innerHTML = "";

    if (!imgs.length) {
      adminHeroGallery.style.display = "none";
      return;
    }

    adminHeroGallery.style.display = "grid";

    imgs.forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Joia DARAH";
      img.loading = "lazy";
      img.decoding = "async";
      adminHeroGallery.appendChild(img);
    });
  }

  function renderAboutCollageFromTextarea() {
    if (!adminAboutCollagePreview || !adminAboutImagesTextarea) return;

    const imgs = normalizeImageList(
      getLinesFromTextarea(adminAboutImagesTextarea, MAX_ABOUT_IMAGES),
      MAX_ABOUT_IMAGES
    );

    adminAboutCollagePreview.innerHTML = "";

    if (!imgs.length) {
      adminAboutCollagePreview.style.display = "none";
      if (adminAboutImagePlaceholder) {
        adminAboutImagePlaceholder.style.display = "flex";
      }
      if (adminAboutImagePreview) {
        adminAboutImagePreview.style.display = "none";
        adminAboutImagePreview.src = "";
      }
      return;
    }

    adminAboutCollagePreview.style.display = "grid";

    imgs.forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Sobre a DARAH";
      img.loading = "lazy";
      img.decoding = "async";
      adminAboutCollagePreview.appendChild(img);
    });

    const first = imgs[0];

    if (adminAboutImagePlaceholder) {
      adminAboutImagePlaceholder.style.display = "none";
    }
    if (adminAboutImagePreview) {
      adminAboutImagePreview.style.display = "block";
      adminAboutImagePreview.src = first;
    }
  }

  function renderNoticeList() {
    if (!adminNoticeList) return;

    adminNoticeList.innerHTML = "";

    const list = Array.isArray(currentNotices)
      ? currentNotices.filter((n) => n && n.trim().length)
      : [];

    if (!list.length) {
      const empty = document.createElement("p");
      empty.className = "admin-status";
      empty.textContent = "Nenhum aviso adicionado ainda.";
      adminNoticeList.appendChild(empty);
      return;
    }

    list.forEach((text, index) => {
      let itemEl = null;
      if (noticeItemTemplate && noticeItemTemplate.content) {
        const base = noticeItemTemplate.content.firstElementChild;
        itemEl = base ? base.cloneNode(true) : null;
      }
      if (!itemEl) {
        itemEl = document.createElement("div");
        itemEl.className = "admin-notice-item";
        const textSpan = document.createElement("span");
        textSpan.className = "admin-notice-text";
        const controls = document.createElement("div");

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "admin-button-ghost admin-notice-edit";
        editBtn.textContent = "Editar";

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "admin-button-ghost admin-notice-delete";
        delBtn.textContent = "Excluir";

        controls.appendChild(editBtn);
        controls.appendChild(delBtn);

        itemEl.appendChild(textSpan);
        itemEl.appendChild(controls);
      }

      const textSpanEl = itemEl.querySelector(".admin-notice-text");
      if (textSpanEl) {
        textSpanEl.textContent = text;
      }

      const editBtnEl = itemEl.querySelector(".admin-notice-edit");
      const delBtnEl = itemEl.querySelector(".admin-notice-delete");

      if (editBtnEl) {
        editBtnEl.addEventListener("click", () => {
          const updated = window.prompt("Editar aviso:", currentNotices[index]);
          if (updated == null) return;
          const trimmed = updated.trim();
          if (!trimmed.length) {
            currentNotices.splice(index, 1);
          } else {
            currentNotices[index] = trimmed;
          }
          renderNoticeList();
        });
      }

      if (delBtnEl) {
        delBtnEl.addEventListener("click", () => {
          const confirmed = window.confirm(
            "Tem certeza que deseja excluir este aviso?"
          );
          if (!confirmed) return;
          currentNotices.splice(index, 1);
          renderNoticeList();
        });
      }

      adminNoticeList.appendChild(itemEl);
    });
  }

  function fillHomepageFormFromData() {
    const hp = homepageData && typeof homepageData === "object" ? homepageData : {};

    const aboutShort =
      typeof hp.aboutText === "string" ? hp.aboutText : "";
    const aboutLong =
      typeof hp.aboutLongText === "string" ? hp.aboutLongText : "";
    const heroImages = Array.isArray(hp.heroImages) ? hp.heroImages : [];
    const aboutImages = Array.isArray(hp.aboutImages) ? hp.aboutImages : [];
    const notices = Array.isArray(hp.notices) ? hp.notices : [];
    const theme = typeof hp.theme === "string" ? hp.theme : "default";

    if (adminAboutTextInput) {
      adminAboutTextInput.value = aboutShort;
    }
    if (adminAboutLongTextInput) {
      adminAboutLongTextInput.value = aboutLong || aboutShort;
    }
    if (adminHeroImagesTextarea) {
      adminHeroImagesTextarea.value = heroImages.join("\n");
    }
    if (adminAboutImagesTextarea) {
      adminAboutImagesTextarea.value = aboutImages.join("\n");
    }

    currentNotices = notices.slice();

    applyThemeVariant(theme);
    renderHeroGalleryFromTextarea();
    renderAboutCollageFromTextarea();
    renderNoticeList();
  }

  function collectHomepageFormValues() {
    const aboutText =
      adminAboutTextInput && adminAboutTextInput.value
        ? adminAboutTextInput.value.trim()
        : "";
    const aboutLongText =
      adminAboutLongTextInput && adminAboutLongTextInput.value
        ? adminAboutLongTextInput.value.trim()
        : "";

    const heroImages = normalizeImageList(
      getLinesFromTextarea(adminHeroImagesTextarea, MAX_HOMEPAGE_IMAGES),
      MAX_HOMEPAGE_IMAGES
    );
    const aboutImages = normalizeImageList(
      getLinesFromTextarea(adminAboutImagesTextarea, MAX_ABOUT_IMAGES),
      MAX_ABOUT_IMAGES
    );
    const notices = Array.isArray(currentNotices)
      ? currentNotices.filter((n) => n && n.trim().length)
      : [];

    const theme =
      adminThemeSelect && adminThemeSelect.value
        ? adminThemeSelect.value
        : "default";

    return {
      aboutText,
      aboutLongText,
      heroImages,
      aboutImages,
      notices,
      theme
    };
  }

  function primeHomepageFromCache() {
    if (!HAS_LOCAL_STORAGE) return;
    try {
      const raw = window.localStorage.getItem(HOMEPAGE_CACHE_KEY);
      if (!raw) return;
      const cached = JSON.parse(raw);
      homepageData = cached;
      fillHomepageFormFromData();
    } catch (err) {
      console.warn("Falha ao carregar homepage do cache local:", err);
    }
  }

  async function loadHomepageFromServer() {
    try {
      const res = await fetch("/api/homepage");
      if (!res.ok) {
        throw new Error("Erro ao carregar conteúdo da página inicial");
      }
      const hp = await res.json();
      homepageData = hp;
      fillHomepageFormFromData();
      if (HAS_LOCAL_STORAGE) {
        try {
          window.localStorage.setItem(
            HOMEPAGE_CACHE_KEY,
            JSON.stringify(homepageData)
          );
        } catch {
          // ignore
        }
      }
      if (adminHomepageStatus) {
        adminHomepageStatus.textContent = "";
        adminHomepageStatus.classList.remove("error", "ok");
      }
    } catch (err) {
      console.error(err);
      if (adminHomepageStatus) {
        adminHomepageStatus.textContent =
          "Erro ao carregar a página inicial. Tente novamente.";
        adminHomepageStatus.classList.add("error");
      }
    }
  }

  async function saveHomepage() {
    const payload = collectHomepageFormValues();

    if (adminHomepageStatus) {
      adminHomepageStatus.textContent = "Salvando...";
      adminHomepageStatus.classList.remove("error", "ok");
    }
    if (adminAboutSaveStatus) {
      adminAboutSaveStatus.textContent = "";
      adminAboutSaveStatus.classList.remove("error", "ok");
    }

    try {
      const res = await fetch("/api/admin/homepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Erro ao salvar página inicial");
      }

      const updated = await res.json().catch(() => null);
      if (updated && typeof updated === "object") {
        homepageData = updated;
      } else {
        homepageData = payload;
      }

      if (HAS_LOCAL_STORAGE) {
        try {
          window.localStorage.setItem(
            HOMEPAGE_CACHE_KEY,
            JSON.stringify(homepageData)
          );
        } catch {
          // ignore
        }
      }

      fillHomepageFormFromData();

      if (adminHomepageStatus) {
        adminHomepageStatus.textContent =
          'Página inicial atualizada com sucesso.';
        adminHomepageStatus.classList.add("ok");
      }
      if (adminAboutSaveStatus) {
        adminAboutSaveStatus.textContent =
          'Conteúdo "Sobre nós" atualizado com sucesso.';
        adminAboutSaveStatus.classList.add("ok");
      }
    } catch (err) {
      console.error(err);
      if (adminHomepageStatus) {
        adminHomepageStatus.textContent =
          "Erro ao salvar a página inicial. Tente novamente.";
        adminHomepageStatus.classList.add("error");
      }
    }
  }

  // =========================
  // Product admin rendering
  // =========================
  function setProductsState(grouped) {
    const safe =
      grouped && typeof grouped === "object" ? grouped : {};

    const categories = [
      "specials",
      "sets",
      "rings",
      "necklaces",
      "bracelets",
      "earrings"
    ];

    productsData = {};
    productsById = new Map();

    categories.forEach((cat) => {
      const arr = Array.isArray(safe[cat]) ? safe[cat] : [];
      productsData[cat] = arr;
      arr.forEach((p) => {
        if (!p || p.id == null) return;
        productsById.set(String(p.id), p);
      });
    });

    categories.forEach((cat) => renderAdminGrid(cat));
  }

  function renderAdminGrid(categoryKey) {
    const containerId = productGridIds[categoryKey];
    if (!containerId) return;
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    // Add card for creating new product
    if (adminAddCardTemplate && adminAddCardTemplate.content) {
      const base = adminAddCardTemplate.content.firstElementChild;
      if (base) {
        const addCard = base.cloneNode(true);
        const addBtn = addCard.querySelector(".admin-add-product-button");
        if (addBtn) {
          addBtn.addEventListener("click", () =>
            openProductModalForNew(categoryKey)
          );
        }
        container.appendChild(addCard);
      }
    }

    const list = Array.isArray(productsData[categoryKey])
      ? productsData[categoryKey]
      : [];

    if (!list.length) {
      const empty = document.createElement("p");
      empty.className = "admin-status";
      empty.style.marginTop = "8px";
      empty.textContent = "Nenhum produto nesta categoria ainda.";
      container.appendChild(empty);
      return;
    }

    list.forEach((product) => {
      let card = null;
      if (adminProductCardTemplate && adminProductCardTemplate.content) {
        const base = adminProductCardTemplate.content.firstElementChild;
        card = base ? base.cloneNode(true) : null;
      }
      if (!card) {
        card = document.createElement("article");
        card.className = "admin-product-card";
      }

      card.dataset.productId = product.id != null ? String(product.id) : "";

      const imageEl = card.querySelector(".admin-product-image");
      const titleEl = card.querySelector(".admin-product-title");
      const descEl = card.querySelector(".admin-product-description");
      const priceEl = card.querySelector(".admin-product-price");
      const stockEl = card.querySelector(".admin-product-stock");
      const editBtn = card.querySelector(".admin-edit-product-button");

      const images = normalizeProductImages(product);
      const firstImage = images[0] || "";

      if (imageEl) {
        if (firstImage) {
          imageEl.src = firstImage;
          imageEl.alt = product.name || "Produto DARAH";
        } else {
          imageEl.removeAttribute("src");
          imageEl.alt = "";
        }
      }

      if (titleEl) {
        titleEl.textContent = product.name || "Produto";
      }
      if (descEl) {
        descEl.textContent =
          product.description || "Joia exclusiva DARAH.";
      }
      if (priceEl) {
        priceEl.textContent = formatBRL(product.price);
      }
      if (stockEl) {
        if (typeof product.stock === "number") {
          stockEl.textContent = "Estoque: " + product.stock;
        } else {
          stockEl.textContent = "";
        }
      }

      if (editBtn) {
        editBtn.addEventListener("click", () =>
          openProductModalForEdit(product.id, categoryKey)
        );
      }

      container.appendChild(card);
    });
  }

  function primeProductsFromCache() {
    if (!HAS_LOCAL_STORAGE) return;
    try {
      const raw = window.localStorage.getItem(PRODUCTS_CACHE_KEY);
      if (!raw) return;
      const cached = JSON.parse(raw);
      setProductsState(cached);
    } catch (err) {
      console.warn("Falha ao carregar produtos do cache local:", err);
    }
  }

  async function loadProductsFromServer() {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) {
        throw new Error("Erro ao carregar produtos");
      }
      const grouped = await res.json();
      setProductsState(grouped);
      if (HAS_LOCAL_STORAGE) {
        try {
          window.localStorage.setItem(
            PRODUCTS_CACHE_KEY,
            JSON.stringify(grouped)
          );
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error(err);
      if (!productsData && HAS_LOCAL_STORAGE) {
        primeProductsFromCache();
      }
    }
  }

  // =========================
  // Product modal behavior
  // =========================
  function renderProductImagesPreview() {
    if (!productImageThumbs || !productImagePlaceholder || !productImagePreview) {
      return;
    }

    productImageThumbs.innerHTML = "";

    const imgs = normalizeImageList(
      currentProductImages,
      MAX_PRODUCT_IMAGES
    );

    currentProductImages = imgs;

    if (!imgs.length) {
      productImagePlaceholder.style.display = "flex";
      productImagePreview.style.display = "none";
      productImagePreview.src = "";
      if (productImageUrlHidden) {
        productImageUrlHidden.value = "[]";
      }
      return;
    }

    productImagePlaceholder.style.display = "none";
    productImagePreview.style.display = "block";
    productImagePreview.src = imgs[0];

    imgs.forEach((src, index) => {
      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = "admin-image-thumb";
      if (index === 0) {
        thumb.classList.add("active");
      }

      const img = document.createElement("img");
      img.src = src;
      img.alt = "Foto do produto";

      thumb.appendChild(img);

      thumb.addEventListener("click", () => {
        productImagePreview.src = src;
        const allThumbs =
          productImageThumbs.querySelectorAll(".admin-image-thumb");
        allThumbs.forEach((t) => t.classList.remove("active"));
        thumb.classList.add("active");
      });

      productImageThumbs.appendChild(thumb);
    });

    if (productImageUrlHidden) {
      productImageUrlHidden.value = JSON.stringify(imgs);
    }
  }

  function fillProductFormFromData(product, fallbackCategory) {
    const p = product && typeof product === "object" ? product : {};
    const category =
      p.category || fallbackCategory || currentProductCategory || "specials";

    if (productCategorySelect) {
      productCategorySelect.value = category;
    }
    if (productNameInput) {
      productNameInput.value = p.name || "";
    }
    if (productDescriptionInput) {
      productDescriptionInput.value = p.description || "";
    }
    if (productPriceInput) {
      productPriceInput.value =
        typeof p.price === "number" ? String(p.price) : "";
    }
    if (productOriginalPriceInput) {
      productOriginalPriceInput.value =
        typeof p.originalPrice === "number" ? String(p.originalPrice) : "";
    }
    if (productDiscountLabelInput) {
      productDiscountLabelInput.value = p.discountLabel || "";
    }
    if (productStockInput) {
      productStockInput.value =
        typeof p.stock === "number" ? String(p.stock) : "";
    }

    const images = normalizeProductImages(p);
    currentProductImages = images.slice(0, MAX_PRODUCT_IMAGES);
    renderProductImagesPreview();

    if (adminProductFormStatus) {
      adminProductFormStatus.textContent = "";
      adminProductFormStatus.classList.remove("error", "ok");
    }
  }

  function showProductModal() {
    if (productModalBackdrop) {
      productModalBackdrop.style.display = "flex";
    }
  }

  function closeProductModal() {
    if (productModalBackdrop) {
      productModalBackdrop.style.display = "none";
    }
    if (adminProductFormStatus) {
      adminProductFormStatus.textContent = "";
      adminProductFormStatus.classList.remove("error", "ok");
    }
    currentEditingProductId = null;
  }

  function openProductModalForNew(categoryKey) {
    currentEditingProductId = null;
    currentProductCategory = categoryKey || "specials";

    if (productModalTitle) {
      productModalTitle.textContent = "Novo produto";
    }
    if (productDeleteButton) {
      productDeleteButton.style.display = "none";
    }

    fillProductFormFromData(
      {
        category: currentProductCategory,
        name: "",
        description: "",
        price: "",
        originalPrice: "",
        discountLabel: "",
        stock: "",
        images: []
      },
      currentProductCategory
    );

    showProductModal();
  }

  function openProductModalForEdit(productId, fallbackCategory) {
    if (productId == null) return;

    const idStr = String(productId);
    currentEditingProductId = idStr;

    const existing = productsById.get(idStr) || null;
    currentProductCategory =
      (existing && existing.category) || fallbackCategory || "specials";

    if (productModalTitle) {
      productModalTitle.textContent = "Editar produto";
    }
    if (productDeleteButton) {
      productDeleteButton.style.display = "inline-flex";
    }

    fillProductFormFromData(existing, currentProductCategory);
    showProductModal();
  }

  async function handleProductFormSubmit(event) {
    if (event) event.preventDefault();
    if (!productForm) return;

    const name = productNameInput ? productNameInput.value.trim() : "";
    if (!name) {
      if (adminProductFormStatus) {
        adminProductFormStatus.textContent =
          "O nome do produto é obrigatório.";
        adminProductFormStatus.classList.add("error");
      }
      return;
    }

    const category =
      productCategorySelect && productCategorySelect.value
        ? productCategorySelect.value
        : currentProductCategory || "specials";

    const description =
      productDescriptionInput && productDescriptionInput.value
        ? productDescriptionInput.value.trim()
        : "";

    const priceValue = productPriceInput ? productPriceInput.value : "";
    const price = priceValue ? Number(priceValue) : 0;

    const originalValue = productOriginalPriceInput
      ? productOriginalPriceInput.value
      : "";
    const originalPrice = originalValue ? Number(originalValue) : NaN;

    const discountLabel =
      productDiscountLabelInput && productDiscountLabelInput.value
        ? productDiscountLabelInput.value.trim()
        : "";

    const stockValue = productStockInput ? productStockInput.value : "";
    const stock = stockValue ? Number(stockValue) : 0;

    if (!Number.isFinite(price) || price < 0) {
      if (adminProductFormStatus) {
        adminProductFormStatus.textContent =
          "Informe um preço atual válido.";
        adminProductFormStatus.classList.add("error");
      }
      return;
    }

    if (!Number.isFinite(stock) || stock < 0) {
      if (adminProductFormStatus) {
        adminProductFormStatus.textContent =
          "Informe um estoque disponível válido.";
        adminProductFormStatus.classList.add("error");
      }
      return;
    }

    const images = normalizeImageList(currentProductImages, MAX_PRODUCT_IMAGES);
    const primaryImage = images[0] || "";

    const payload = {
      id: currentEditingProductId || undefined,
      category,
      name,
      description,
      price,
      originalPrice:
        Number.isFinite(originalPrice) && originalPrice > 0
          ? originalPrice
          : null,
      discountLabel,
      stock,
      images,
      imageUrls: images,
      imageUrl: primaryImage
    };

    if (adminProductFormStatus) {
      adminProductFormStatus.textContent = "Salvando produto...";
      adminProductFormStatus.classList.remove("error", "ok");
    }

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Erro ao salvar produto");
      }

      await res.json().catch(() => null);

      if (adminProductFormStatus) {
        adminProductFormStatus.textContent =
          "Produto salvo com sucesso.";
        adminProductFormStatus.classList.add("ok");
      }

      closeProductModal();
      await loadProductsFromServer();
    } catch (err) {
      console.error(err);
      if (adminProductFormStatus) {
        adminProductFormStatus.textContent =
          "Não foi possível salvar o produto. Tente novamente.";
        adminProductFormStatus.classList.add("error");
      }
    }
  }

  async function handleProductDelete() {
    if (!currentEditingProductId) return;
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este produto?"
    );
    if (!confirmed) return;

    if (adminProductFormStatus) {
      adminProductFormStatus.textContent = "Excluindo produto...";
      adminProductFormStatus.classList.remove("error", "ok");
    }

    try {
      const res = await fetch(
        "/api/admin/products/" + encodeURIComponent(currentEditingProductId),
        {
          method: "DELETE"
        }
      );

      if (!res.ok) {
        throw new Error("Erro ao excluir produto");
      }

      await res.json().catch(() => null);

      if (adminProductFormStatus) {
        adminProductFormStatus.textContent =
          "Produto excluído com sucesso.";
        adminProductFormStatus.classList.add("ok");
      }

      closeProductModal();
      await loadProductsFromServer();
    } catch (err) {
      console.error(err);
      if (adminProductFormStatus) {
        adminProductFormStatus.textContent =
          "Não foi possível excluir o produto. Tente novamente.";
        adminProductFormStatus.classList.add("error");
      }
    }
  }

  // =========================
  // Event wiring for homepage and products
  // =========================
  function attachHomepageEvents() {
    if (adminHeroImagesTextarea) {
      adminHeroImagesTextarea.addEventListener("input", () => {
        renderHeroGalleryFromTextarea();
      });
    }

    if (adminAboutImagesTextarea) {
      adminAboutImagesTextarea.addEventListener("input", () => {
        renderAboutCollageFromTextarea();
      });
    }

    if (adminHeroImagesFileButton && adminHeroImagesFileInput) {
      adminHeroImagesFileButton.addEventListener("click", () => {
        adminHeroImagesFileInput.click();
      });

      adminHeroImagesFileInput.addEventListener("change", async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length || !adminHeroImagesTextarea) return;

        try {
          const urls = await readFilesAsDataUrls(files);
          const existing = getLinesFromTextarea(
            adminHeroImagesTextarea,
            MAX_HOMEPAGE_IMAGES
          );
          const merged = [...existing, ...urls];
          const unique = normalizeImageList(merged, MAX_HOMEPAGE_IMAGES);
          adminHeroImagesTextarea.value = unique.join("\n");
          renderHeroGalleryFromTextarea();
        } catch (err) {
          console.error(err);
          if (adminHomepageStatus) {
            adminHomepageStatus.textContent =
              "Não foi possível carregar algumas imagens do cabeçalho.";
            adminHomepageStatus.classList.add("error");
          }
        } finally {
          adminHeroImagesFileInput.value = "";
        }
      });
    }

    if (adminAboutImagesFileButton && adminAboutImagesFileInput) {
      adminAboutImagesFileButton.addEventListener("click", () => {
        adminAboutImagesFileInput.click();
      });

      adminAboutImagesFileInput.addEventListener("change", async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length || !adminAboutImagesTextarea) return;

        try {
          const urls = await readFilesAsDataUrls(files);
          const existing = getLinesFromTextarea(
            adminAboutImagesTextarea,
            MAX_ABOUT_IMAGES
          );
          const merged = [...existing, ...urls];
          const unique = normalizeImageList(merged, MAX_ABOUT_IMAGES);
          adminAboutImagesTextarea.value = unique.join("\n");
          renderAboutCollageFromTextarea();
        } catch (err) {
          console.error(err);
          if (adminAboutSaveStatus) {
            adminAboutSaveStatus.textContent =
              "Não foi possível carregar algumas fotos do 'Sobre nós'.";
            adminAboutSaveStatus.classList.add("error");
          }
        } finally {
          adminAboutImagesFileInput.value = "";
        }
      });
    }

    if (adminAddNoticeBtn) {
      adminAddNoticeBtn.addEventListener("click", () => {
        const text = window.prompt(
          "Digite o novo aviso do site:"
        );
        if (!text) return;
        const trimmed = text.trim();
        if (!trimmed.length) return;
        currentNotices.push(trimmed);
        renderNoticeList();
        if (adminNoticeStatus) {
          adminNoticeStatus.textContent =
            "Aviso adicionado. Lembre-se de salvar a página inicial.";
          adminNoticeStatus.classList.remove("error");
          adminNoticeStatus.classList.add("ok");
        }
      });
    }

    if (saveHomepageBtn) {
      saveHomepageBtn.addEventListener("click", (event) => {
        event.preventDefault();
        saveHomepage();
      });
    }

    if (saveAboutPageBtn) {
      saveAboutPageBtn.addEventListener("click", (event) => {
        event.preventDefault();
        saveHomepage();
      });
    }
  }

  function attachProductModalEvents() {
    if (productImageFileButton && productImageFileInput) {
      productImageFileButton.addEventListener("click", () => {
        productImageFileInput.click();
      });

      productImageFileInput.addEventListener("change", async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        try {
          const urls = await readFilesAsDataUrls(files);
          const merged = [...currentProductImages, ...urls];
          const unique = normalizeImageList(merged, MAX_PRODUCT_IMAGES);
          currentProductImages = unique;
          renderProductImagesPreview();
        } catch (err) {
          console.error(err);
          if (adminProductFormStatus) {
            adminProductFormStatus.textContent =
              "Não foi possível carregar algumas fotos do produto.";
            adminProductFormStatus.classList.add("error");
          }
        } finally {
          productImageFileInput.value = "";
        }
      });
    }

    if (productModalClose) {
      productModalClose.addEventListener("click", (event) => {
        event.preventDefault();
        closeProductModal();
      });
    }

    if (productModalBackdrop) {
      productModalBackdrop.addEventListener("click", (event) => {
        if (event.target === productModalBackdrop) {
          closeProductModal();
        }
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (
          productModalBackdrop &&
          productModalBackdrop.style.display === "flex"
        ) {
          closeProductModal();
        }
      }
    });

    if (productForm) {
      productForm.addEventListener("submit", handleProductFormSubmit);
    }

    if (productDeleteButton) {
      productDeleteButton.addEventListener("click", (event) => {
        event.preventDefault();
        handleProductDelete();
      });
    }
  }

  // =========================
  // Admin initialization after login
  // =========================
  function initializeAdminPanel() {
    if (adminInitialized) return;
    adminInitialized = true;

    const bootstrap =
      typeof window !== "undefined"
        ? window.__DARAH_BOOTSTRAP__ || null
        : null;

    if (bootstrap && bootstrap.homepage) {
      homepageData = bootstrap.homepage;
      fillHomepageFormFromData();
      if (HAS_LOCAL_STORAGE) {
        try {
          window.localStorage.setItem(
            HOMEPAGE_CACHE_KEY,
            JSON.stringify(homepageData)
          );
        } catch {
          // ignore
        }
      }
    } else {
      primeHomepageFromCache();
    }

    if (bootstrap && bootstrap.products) {
      setProductsState(bootstrap.products);
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
      primeProductsFromCache();
    }

    // Then refresh from API
    loadHomepageFromServer();
    loadProductsFromServer();

    setActiveView("home");
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
      initializeAdminPanel();
    }, 4000);
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

  // =========================
  // Theme select wiring
  // =========================
  if (adminThemeSelect) {
    adminThemeSelect.addEventListener("change", () => {
      const newVariant = adminThemeSelect.value || "default";
      applyThemeVariant(newVariant);
    });
  }

  // =========================
  // Login events
  // =========================
  if (adminLoginButton && adminUsernameInput && adminPasswordInput) {
    adminLoginButton.addEventListener("click", () => {
      handleAdminLogin();
    });

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

  // =========================
  // Initial theme and wiring
  // =========================
  const initialVariant = rootEl
    ? rootEl.getAttribute("data-theme-variant")
    : null;
  applyThemeVariant(initialVariant || "default");

  attachHomepageEvents();
  attachProductModalEvents();
});
