"use strict";

/**
 * DARAH · Admin
 * Mirrors the storefront layout with per tab editing and multi image products.
 * All UI copy in pt BR. Two allowed logins with a welcome loader.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Limits
  const MAX_PRODUCT_IMAGES = 5;      // até 5 imagens por produto
  const MAX_HOMEPAGE_IMAGES = 12;    // até 12 imagens no collage da página inicial
  const MAX_ABOUT_IMAGES = 4;        // até 4 imagens no collage da aba Sobre

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

  const aboutLongTextEl = document.getElementById("adminAboutLongText");
  const aboutLongTextPageEl = document.getElementById("adminAboutLongTextText");

  // Notices
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
  const aboutStatusEl = document.getElementById("adminAboutStatus");
  const saveAboutPageBtn = document.getElementById("saveAboutPageBtn");

  // Product grids by category
  const specialsGridEl = document.getElementById("adminSpecialsGrid");
  const specialsStatusEl = document.getElementById("adminSpecialsStatus");

  const setsGridEl = document.getElementById("adminSetsGrid");
  const setsStatusEl = document.getElementById("adminSetsStatus");

  const ringsGridEl = document.getElementById("adminRingsGrid");
  const ringsStatusEl = document.getElementById("adminRingsStatus");

  const necklacesGridEl = document.getElementById("adminNecklacesGrid");
  const necklacesStatusEl = document.getElementById("adminNecklacesStatus");

  const braceletsGridEl = document.getElementById("adminBraceletsGrid");
  const braceletsStatusEl = document.getElementById("adminBraceletsStatus");

  const earringsGridEl = document.getElementById("adminEarringsGrid");
  const earringsStatusEl = document.getElementById("adminEarringsStatus");

  const productCardTemplate = document.getElementById("adminProductCardTemplate");

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

  // Helpers for layout and mobile nav
  function setBodyLoginMode(isLogin) {
    if (!bodyEl) return;
    if (isLogin) {
      bodyEl.classList.add("is-admin-login");
    } else {
      bodyEl.classList.remove("is-admin-login");
    }
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

  // Initially we assume login view until session restore runs
  setBodyLoginMode(true);

  // Status helpers
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
    if (!aboutStatusEl) return;
    aboutStatusEl.textContent = message || "";
    aboutStatusEl.classList.remove("ok", "error");
    if (type === "ok") aboutStatusEl.classList.add("ok");
    if (type === "error") aboutStatusEl.classList.add("error");
  }

  function setProductsStatusForCategory(categoryKey, message, type) {
    let targetEl = null;
    if (categoryKey === "specials") targetEl = specialsStatusEl;
    if (categoryKey === "sets") targetEl = setsStatusEl;
    if (categoryKey === "rings") targetEl = ringsStatusEl;
    if (categoryKey === "necklaces") targetEl = necklacesStatusEl;
    if (categoryKey === "bracelets") targetEl = braceletsStatusEl;
    if (categoryKey === "earrings") targetEl = earringsStatusEl;
    if (!targetEl) return;
    targetEl.textContent = message || "";
    targetEl.classList.remove("ok", "error");
    if (type === "ok") targetEl.classList.add("ok");
    if (type === "error") targetEl.classList.add("error");
  }

  // Theme helpers
  function applyThemeVariant(variant) {
    const root = document.documentElement;
    root.dataset.themeVariant = variant || "default";
  }

  // Homepage gallery render
  function renderHeroGallery() {
    if (!heroGalleryEl) return;
    heroGalleryEl.innerHTML = "";
    if (!homepageState.heroImages.length) {
      const ph = document.createElement("div");
      ph.style.borderRadius = "14px";
      ph.style.background = "#dcdcdc";
      ph.style.height = "150px";
      heroGalleryEl.appendChild(ph);
    } else {
      homepageState.heroImages.forEach((url, idx) => {
        const wrap = document.createElement("div");
        wrap.style.position = "relative";

        const img = document.createElement("img");
        img.src = url;
        img.alt = "Imagem da homepage";
        img.loading = "lazy";

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
        del.style.background = "rgba(0,0,0,0.5)";
        del.style.color = "#fff";
        del.style.fontSize = "16px";
        del.addEventListener("click", () => {
          homepageState.heroImages.splice(idx, 1);
          if (heroImagesTextarea) {
            heroImagesTextarea.value = homepageState.heroImages.join("\n");
          }
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

    const images = Array.isArray(homepageState.aboutImages)
      ? homepageState.aboutImages
      : [];

    if (!images.length) {
      const ph = document.createElement("div");
      ph.style.borderRadius = "14px";
      ph.style.background = "#dcdcdc";
      ph.style.height = "120px";
      aboutCollageEl.appendChild(ph);

      if (aboutImagePreviewEl) {
        aboutImagePreviewEl.src = "";
        aboutImagePreviewEl.style.display = "none";
      }
      if (aboutImagePlaceholderEl) {
        aboutImagePlaceholderEl.style.display = "flex";
      }
      return;
    }

    if (aboutImagePreviewEl) {
      aboutImagePreviewEl.src = images[0];
      aboutImagePreviewEl.loading = "lazy";
      aboutImagePreviewEl.style.display = "block";
    }
    if (aboutImagePlaceholderEl) {
      aboutImagePlaceholderEl.style.display = "none";
    }

    images.forEach((url, idx) => {
      const wrap = document.createElement("div");
      wrap.style.position = "relative";

      const img = document.createElement("img");
      img.src = url;
      img.alt = "Imagem da página Sobre";
      img.loading = "lazy";

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
      del.style.background = "rgba(0,0,0,0.5)";
      del.style.color = "#fff";
      del.style.fontSize = "15px";
      del.addEventListener("click", () => {
        homepageState.aboutImages.splice(idx, 1);
        if (aboutImagesTextarea) {
          aboutImagesTextarea.value = homepageState.aboutImages.join("\n");
        }
        renderAboutGallery();
      });

      wrap.appendChild(img);
      wrap.appendChild(del);
      aboutCollageEl.appendChild(wrap);
    });
  }

  function renderNotices() {
    if (!noticeListEl || !noticeItemTemplate) return;
    noticeListEl.innerHTML = "";

    const notices = Array.isArray(homepageState.notices)
      ? homepageState.notices
      : [];

    if (!notices.length) {
      const ph = document.createElement("p");
      ph.className = "admin-status";
      ph.textContent = "Nenhum aviso cadastrado.";
      noticeListEl.appendChild(ph);
      return;
    }

    notices.forEach((text, idx) => {
      const clone = noticeItemTemplate.content
        ? noticeItemTemplate.content.cloneNode(true)
        : null;
      if (!clone) return;

      const itemEl = clone.querySelector(".admin-notice-item");
      const inputEl = clone.querySelector("input");
      const removeBtnEl = clone.querySelector(".admin-notice-remove");

      if (!itemEl || !inputEl || !removeBtnEl) return;

      inputEl.value = text;
      inputEl.addEventListener("input", () => {
        homepageState.notices[idx] = inputEl.value;
      });

      removeBtnEl.addEventListener("click", () => {
        homepageState.notices.splice(idx, 1);
        renderNotices();
      });

      noticeListEl.appendChild(clone);
    });
  }

  // Simple utilities
  function normalizeList(list, max) {
    if (!Array.isArray(list)) return [];
    return list
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, max);
  }

  function normalizePrice(value) {
    if (typeof value === "number") return value;
    const cleaned = String(value || "")
      .replace(/[^\d,.\s]/g, "")
      .replace(",", ".");
    const num = Number(cleaned);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Number(num.toFixed(2));
  }

  function normalizeStockFlag(flag) {
    if (typeof flag === "boolean") return flag;
    if (typeof flag === "number") return flag > 0;
    const v = String(flag || "").trim().toLowerCase();
    if (!v) return true;
    if (["0", "false", "não", "nao", "sem estoque"].includes(v)) return false;
    return true;
  }

  function parseImageList(textarea) {
    if (!textarea) return [];
    const lines = String(textarea.value || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return normalizeList(lines, MAX_PRODUCT_IMAGES);
  }

  function parseHomepageImages(textarea, max) {
    if (!textarea) return [];
    const lines = String(textarea.value || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return normalizeList(lines, max);
  }

  function setTextIfExists(el, text) {
    if (!el) return;
    el.textContent = text || "";
  }

  function formatPriceBRL(value) {
    const n = normalizePrice(value);
    return n.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function stringifyPrice(value) {
    const n = normalizePrice(value);
    return n.toFixed(2);
  }

  function storeAdminUser(username) {
    try {
      sessionStorage.setItem("darahAdminUser", JSON.stringify({ username }));
    } catch {
    }
  }

  function clearAdminUser() {
    try {
      sessionStorage.removeItem("darahAdminUser");
    } catch {
    }
  }

  function updateHeaderUser(username) {
    if (userNameLabel) {
      userNameLabel.textContent = username || "";
    }
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

  function showPanelView() {
    if (loginSection) loginSection.style.display = "none";
    if (loadingSection) loadingSection.style.display = "none";
    if (panelSection) panelSection.style.display = "block";
    setBodyLoginMode(false);
  }

  // View switching
  function switchView(id) {
    Object.values(views).forEach((v) => v && v.classList.remove("active-view"));
    const el = views[id];
    if (el) el.classList.add("active-view");
    navLinks.forEach((b) => b.classList.toggle("active", b.dataset.view === id));

    if (id === "home") {
      renderHeroGallery();
      renderNotices();
    } else if (id === "about") {
      renderAboutGallery();
    }
  }

  navLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.view;
      if (id && views[id]) {
        switchView(id);
      }
    });
  });

  // Mobile nav dropdown setup for Admin
  function buildMobileDropdown() {
    if (!navDropdown || !navLeftContainer) return;
    navDropdown.innerHTML = "";

    const allTabs = navLeftContainer.querySelectorAll(".nav-link");
    allTabs.forEach((btn) => {
      const clone = btn.cloneNode(true);
      clone.addEventListener("click", () => {
        const viewId = clone.dataset.view;
        if (viewId && views[viewId]) {
          switchView(viewId);
        }
        closeMobileMenu();
      });
      navDropdown.appendChild(clone);
    });
  }

  buildMobileDropdown();

  if (navMobileToggle && navDropdown) {
    navMobileToggle.addEventListener("click", () => {
      const isOpen = navDropdown.classList.contains("open");
      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!target || !(target instanceof Node)) return;
      if (
        navDropdown &&
        navMobileToggle &&
        !navDropdown.contains(target) &&
        !navMobileToggle.contains(target)
      ) {
        closeMobileMenu();
      }
    });
  }

  // Theme selector handler
  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      const value = (themeSelect.value || "default").trim() || "default";
      homepageState.theme = value;
      applyThemeVariant(value);
      setHomepageStatus("Tema atualizado. Não esqueça de salvar a homepage.", "ok");
    });
  }

  // =========================
  // Homepage load and save
  // =========================
  async function loadHomepageAdmin() {
    try {
      const res = await fetch("/api/homepage");
      if (!res.ok) throw new Error("Erro ao carregar conteúdo da homepage");
      const hp = await res.json();

      homepageState.aboutText = typeof hp.aboutText === "string" ? hp.aboutText : "";
      homepageState.aboutLongText =
        typeof hp.aboutLongText === "string" ? hp.aboutLongText : "";
      homepageState.heroImages = normalizeList(hp.heroImages || [], MAX_HOMEPAGE_IMAGES);
      homepageState.notices = normalizeList(hp.notices || [], 10);
      homepageState.theme = typeof hp.theme === "string" ? hp.theme : "default";
      homepageState.aboutImages = normalizeList(hp.aboutImages || [], MAX_ABOUT_IMAGES);

      if (aboutTextEl) {
        aboutTextEl.value = homepageState.aboutText;
      }

      if (aboutLongTextEl) {
        if (homepageState.aboutLongText && homepageState.aboutLongText.trim().length) {
          aboutLongTextEl.value = homepageState.aboutLongText;
        } else if (typeof hp.aboutText === "string") {
          aboutLongTextEl.value = hp.aboutText;
        } else {
          aboutLongTextEl.value = "";
        }
      }

      if (aboutLongTextPageEl) {
        if (homepageState.aboutLongText && homepageState.aboutLongText.trim().length) {
          aboutLongTextPageEl.value = homepageState.aboutLongText;
        } else if (typeof hp.aboutText === "string") {
          aboutLongTextPageEl.value = hp.aboutText;
        } else {
          aboutLongTextPageEl.value = "";
        }
      }

      if (heroImagesTextarea) {
        heroImagesTextarea.value = homepageState.heroImages.join("\n");
      }
      if (aboutImagesTextarea) {
        aboutImagesTextarea.value = homepageState.aboutImages.join("\n");
      }

      applyThemeVariant(homepageState.theme);
      renderHeroGallery();
      renderAboutGallery();
      renderNotices();

      setHomepageStatus("Conteúdo carregado com sucesso.", "ok");
    } catch (err) {
      console.error(err);
      setHomepageStatus("Não foi possível carregar o conteúdo da homepage.", "error");
    }
  }

  async function saveHomepage() {
    try {
      const aboutText = aboutTextEl ? aboutTextEl.value || "" : "";
      const aboutLongText =
        aboutLongTextEl && aboutLongTextEl.value
          ? aboutLongTextEl.value
          : aboutText;
      const heroImages = parseHomepageImages(heroImagesTextarea, MAX_HOMEPAGE_IMAGES);
      const noticesList = Array.isArray(homepageState.notices)
        ? homepageState.notices
        : [];

      homepageState.aboutText = aboutText;
      homepageState.aboutLongText = aboutLongText;
      homepageState.heroImages = heroImages;
      homepageState.notices = noticesList;

      const payload = {
        aboutText,
        aboutLongText,
        heroImages,
        aboutImages: homepageState.aboutImages,
        notices: noticesList,
        theme: homepageState.theme || "default"
      };

      const res = await fetch("/api/homepage", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Erro ao salvar a homepage.");

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
    saveAboutPageBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const aboutText = aboutTextEl ? aboutTextEl.value || "" : "";
        const aboutLongText =
          aboutLongTextPageEl && aboutLongTextPageEl.value
            ? aboutLongTextPageEl.value
            : aboutText;

        const aboutImages = Array.isArray(homepageState.aboutImages)
          ? homepageState.aboutImages
          : [];

        homepageState.aboutText = aboutText;
        homepageState.aboutLongText = aboutLongText;
        homepageState.aboutImages = aboutImages;

        const payload = {
          aboutText,
          aboutLongText,
          heroImages: homepageState.heroImages || [],
          aboutImages,
          notices: homepageState.notices || [],
          theme: homepageState.theme || "default"
        };

        const res = await fetch("/api/homepage", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Erro ao salvar a página Sobre nós.");

        setAboutStatus('Página "Sobre nós" atualizada com sucesso.', "ok");
        await loadHomepageAdmin();
      } catch (err) {
        console.error(err);
        setAboutStatus('Não foi possível salvar a página "Sobre nós".', "error");
      }
    });
  }

  if (heroImagesFileButton && heroImagesFileInput) {
    heroImagesFileButton.addEventListener("click", () => {
      heroImagesFileInput.click();
    });

    heroImagesFileInput.addEventListener("change", () => {
      const files = Array.from(heroImagesFileInput.files || []);
      if (!files.length) return;

      Promise.all(
        files.map((file) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          });
        })
      ).then((results) => {
        const images = results
          .filter(Boolean)
          .map((url) => String(url || "").trim())
          .filter(Boolean);
        const combined = [...homepageState.heroImages, ...images].slice(
          0,
          MAX_HOMEPAGE_IMAGES
        );
        homepageState.heroImages = combined;
        if (heroImagesTextarea) {
          heroImagesTextarea.value = combined.join("\n");
        }
        renderHeroGallery();
        setHomepageStatus("Fotos da homepage atualizadas no painel (não esqueça de salvar).", "ok");
      });
    });
  }

  if (aboutImagesFileButton && aboutImagesFileInput) {
    aboutImagesFileButton.addEventListener("click", () => {
      aboutImagesFileInput.click();
    });

    aboutImagesFileInput.addEventListener("change", () => {
      const files = Array.from(aboutImagesFileInput.files || []);
      if (!files.length) return;

      Promise.all(
        files.map((file) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          });
        })
      ).then((results) => {
        const images = results
          .filter(Boolean)
          .map((url) => String(url || "").trim())
          .filter(Boolean);
        const combined = [...homepageState.aboutImages, ...images].slice(
          0,
          MAX_ABOUT_IMAGES
        );
        homepageState.aboutImages = combined;
        if (aboutImagesTextarea) {
          aboutImagesTextarea.value = combined.join("\n");
        }
        renderAboutGallery();
        setAboutStatus('Pré visualização atualizada. Clique em "Salvar página Sobre nós" para publicar.', "ok");
      });
    });
  }

  if (addNoticeBtn) {
    addNoticeBtn.addEventListener("click", () => {
      if (!Array.isArray(homepageState.notices)) {
        homepageState.notices = [];
      }
      homepageState.notices.push("");
      renderNotices();
      setNoticeStatus("Novo aviso adicionado. Não esqueça de salvar.", "ok");
    });
  }

  // =========================
  // Products load and render
  // =========================
  async function loadProducts() {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Erro ao carregar produtos.");
      const products = await res.json();
      if (!Array.isArray(products)) {
        throw new Error("Resposta inesperada ao carregar produtos.");
      }
      allProducts = products;
      renderAllCategoryGrids();
    } catch (err) {
      console.error(err);
      setProductsStatusForCategory(
        "rings",
        "Não foi possível carregar os produtos.",
        "error"
      );
      setProductsStatusForCategory(
        "necklaces",
        "Não foi possível carregar os produtos.",
        "error"
      );
      setProductsStatusForCategory(
        "bracelets",
        "Não foi possível carregar os produtos.",
        "error"
      );
      setProductsStatusForCategory(
        "earrings",
        "Não foi possível carregar os produtos.",
        "error"
      );
      setProductsStatusForCategory(
        "specials",
        "Não foi possível carregar os produtos.",
        "error"
      );
      setProductsStatusForCategory(
        "sets",
        "Não foi possível carregar os produtos.",
        "error"
      );
    }
  }

  function filterProductsByCategory(category) {
    if (!Array.isArray(allProducts)) return [];
    if (category === "specials") {
      return allProducts.filter((p) => p.category === "specials");
    }
    if (category === "sets") {
      return allProducts.filter((p) => p.category === "sets");
    }
    if (category === "rings") {
      return allProducts.filter((p) => p.category === "rings");
    }
    if (category === "necklaces") {
      return allProducts.filter((p) => p.category === "necklaces");
    }
    if (category === "bracelets") {
      return allProducts.filter((p) => p.category === "bracelets");
    }
    if (category === "earrings") {
      return allProducts.filter((p) => p.category === "earrings");
    }
    return [];
  }

  function renderCategoryGrid(categoryKey, gridEl, statusEl) {
    if (!gridEl || !productCardTemplate) return;
    gridEl.innerHTML = "";

    const items = filterProductsByCategory(categoryKey);

    if (!items.length) {
      const ph = document.createElement("p");
      ph.className = "admin-category-empty";
      ph.textContent =
        "Nenhum produto cadastrado ainda para esta categoria.";
      gridEl.appendChild(ph);
      if (statusEl) {
        statusEl.textContent = "";
        statusEl.classList.remove("ok", "error");
      }
      return;
    }

    items.forEach((product) => {
      const clone = productCardTemplate.content
        ? productCardTemplate.content.cloneNode(true)
        : null;
      if (!clone) return;

      const cardEl = clone.querySelector(".admin-product-card");
      const imgEl = clone.querySelector(".admin-product-main-image");
      const titleEl = clone.querySelector(".admin-product-title");
      const priceEl = clone.querySelector(".admin-product-price");
      const idEl = clone.querySelector(".admin-product-id");
      const stockEl = clone.querySelector(".admin-product-stock");
      const categoryEl = clone.querySelector(".admin-product-category");
      const badgesEl = clone.querySelector(".admin-product-badges");
      const editBtn = clone.querySelector(".admin-edit-product-button");

      if (!cardEl) return;

      const images = Array.isArray(product.images) ? product.images : [];
      const cover = images[0] || "";

      if (imgEl) {
        if (cover) {
          imgEl.src = cover;
          imgEl.alt = product.name || "Produto";
          imgEl.loading = "lazy";
        } else {
          imgEl.removeAttribute("src");
          imgEl.alt = "";
        }
      }

      setTextIfExists(titleEl, product.name || "");
      setTextIfExists(priceEl, formatPriceBRL(product.price));

      if (idEl) {
        idEl.textContent = product.id ? `ID ${product.id}` : "";
      }

      const inStock = normalizeStockFlag(product.inStock);

      if (stockEl) {
        stockEl.textContent = inStock ? "Disponível" : "Sem estoque";
      }

      if (categoryEl) {
        let label = "";
        switch (product.category) {
          case "rings":
            label = "Anéis";
            break;
          case "necklaces":
            label = "Colares";
            break;
          case "bracelets":
            label = "Pulseiras";
            break;
          case "earrings":
            label = "Brincos";
            break;
          case "sets":
            label = "Conjuntos";
            break;
          case "specials":
            label = "Ofertas especiais";
            break;
          default:
            label = "Categoria";
        }
        categoryEl.textContent = label;
      }

      if (badgesEl) {
        badgesEl.innerHTML = "";
        if (inStock === false) {
          const badge = document.createElement("span");
          badge.className = "admin-product-badge";
          badge.textContent = "Sem estoque";
          badgesEl.appendChild(badge);
        }
        if (product.isFeatured) {
          const badge = document.createElement("span");
          badge.className = "admin-product-badge";
          badge.textContent = "Destaque";
          badgesEl.appendChild(badge);
        }
        if (product.onSale) {
          const badge = document.createElement("span");
          badge.className = "admin-product-badge";
          badge.textContent = "Promoção";
          badgesEl.appendChild(badge);
        }
      }

      if (editBtn) {
        editBtn.addEventListener("click", () => {
          currentProductEditing = product;
          openProductEditForm(product);
        });
      }

      gridEl.appendChild(clone);
    });

    if (statusEl) {
      statusEl.textContent = "";
      statusEl.classList.remove("ok", "error");
    }
  }

  function renderAllCategoryGrids() {
    renderCategoryGrid("specials", specialsGridEl, specialsStatusEl);
    renderCategoryGrid("sets", setsGridEl, setsStatusEl);
    renderCategoryGrid("rings", ringsGridEl, ringsStatusEl);
    renderCategoryGrid("necklaces", necklacesGridEl, necklacesStatusEl);
    renderCategoryGrid("bracelets", braceletsGridEl, braceletsStatusEl);
    renderCategoryGrid("earrings", earringsGridEl, earringsStatusEl);
  }

  function openProductEditForm(product) {
    console.log("Abrir edição de produto", product);
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

  if (passwordInput) {
    passwordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleLoginSubmit();
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
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
  } catch {
  }

  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }
});
