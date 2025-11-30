// client/main.js
"use strict";

/**
 * DARAH · Admin
 * Mirrors the storefront layout with per tab editing and multi image products.
 * All UI copy in pt BR. Two allowed logins with a welcome loader.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Limits
  const MAX_PRODUCT_IMAGES = 5;      // até 5 imagens por produto
  const MAX_HOMEPAGE_IMAGES = 12;   // até 12 imagens no collage da página inicial
  const MAX_ABOUT_IMAGES = 3;       // até 3 imagens no collage da aba Sobre

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

  // Homepage admin controls
  const aboutTextEl = document.getElementById("adminAboutText");
  const heroGalleryEl = document.getElementById("adminHeroGallery");
  const heroImagesTextarea = document.getElementById("adminHeroImages");
  const heroImagesFileInput = document.getElementById("adminHeroImagesFile");
  const heroImagesFileButton = document.getElementById("adminHeroImagesFileButton");
  const saveHomepageBtn = document.getElementById("saveHomepageBtn");
  const homepageStatusEl = document.getElementById("adminHomepageStatus");

  // Optional site notices
  const addNoticeBtn = document.getElementById("adminAddNoticeBtn");
  const noticeListEl = document.getElementById("adminNoticeList");
  const noticeStatusEl = document.getElementById("adminNoticeStatus");
  const noticeItemTemplate = document.getElementById("noticeItemTemplate");

  // Optional About collage controls (if present in HTML)
  const aboutGalleryEl = document.getElementById("adminAboutGallery");
  const aboutImagesTextarea = document.getElementById("adminAboutImages");
  const aboutImagesFileInput = document.getElementById("adminAboutImagesFile");
  const aboutImagesFileButton = document.getElementById("adminAboutImagesFileButton");
  const aboutStatusEl = document.getElementById("adminAboutStatus");

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
    heroImages: [],
    aboutImages: [],
    notices: [],
    theme: "default"
  };
  let currentProductEditing = null;
  let currentProductImages = []; // data URLs, first is cover

  // Allowed users and welcome messages
  const VALID_USERS = {
    "Danielle Almeida": {
      password: "Dani123@",
      welcome: "Bem vinda, Danielle!"
    },
    "Maria Eduarda": {
      password: "Maria123@",
      welcome: "Bem vinda, Maria Eduarda!"
    }
  };

  // Helpers
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
      return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    } catch {
      return "R$ " + Number(value || 0).toFixed(2).replace(".", ",");
    }
  }

  function categoryLabel(key) {
    return (
      {
        specials: "Ofertas especiais",
        sets: "Conjuntos",
        rings: "Anéis",
        necklaces: "Colares",
        bracelets: "Pulseiras",
        earrings: "Brincos"
      }[key] || key
    );
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : String(reader.result));
      reader.onerror = () =>
        reject(reader.error || new Error("Falha ao ler arquivo de imagem."));
      reader.readAsDataURL(file);
    });
  }

  // Normalize arrays with dedupe and max length
  function normalizeList(list, max) {
    if (!Array.isArray(list)) return [];
    const cleaned = list
      .map((u) => String(u || "").trim())
      .filter((u, index, arr) => u && arr.indexOf(u) === index);
    return typeof max === "number" && max > 0 ? cleaned.slice(0, max) : cleaned;
  }

  // Make theme variant generic so new options work without extra code
  function applyThemeVariant(variant) {
    const root = document.documentElement;
    const trimmed = typeof variant === "string" ? variant.trim() : "";
    const value = trimmed || "default";
    if (root) {
      root.dataset.themeVariant = value;
    }
    if (themeSelect && themeSelect.value !== value) {
      const hasOption = Array.from(themeSelect.options).some(
        (opt) => opt.value === value
      );
      if (hasOption) {
        themeSelect.value = value;
      }
    }
  }

  // View switching inside admin
  function switchView(id) {
    Object.values(views).forEach((v) => v && v.classList.remove("active-view"));
    const el = views[id];
    if (el) el.classList.add("active-view");
    navLinks.forEach((b) => b.classList.toggle("active", b.dataset.view === id));
  }

  navLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.view;
      if (id && views[id]) {
        switchView(id);
      }
    });
  });

  // Theme selector handler
  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      const value = (themeSelect.value || "default").trim() || "default";
      homepageState.theme = value;
      applyThemeVariant(value);
      setHomepageStatus("Tema atualizado. Clique em salvar para aplicar no site.", "ok");
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
      homepageState.heroImages = normalizeList(hp.heroImages || [], MAX_HOMEPAGE_IMAGES);
      homepageState.aboutImages = normalizeList(hp.aboutImages || [], MAX_ABOUT_IMAGES);
      homepageState.notices = normalizeList(hp.notices || [], 10);
      homepageState.theme = typeof hp.theme === "string" ? hp.theme : "default";

      if (aboutTextEl) aboutTextEl.value = homepageState.aboutText;
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
        del.style.background = "rgba(0,0,0,0.55)";
        del.style.color = "#fff";
        del.addEventListener("click", () => {
          homepageState.heroImages.splice(idx, 1);
          homepageState.heroImages = normalizeList(
            homepageState.heroImages,
            MAX_HOMEPAGE_IMAGES
          );
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
    if (!aboutGalleryEl) return;
    aboutGalleryEl.innerHTML = "";
    if (!homepageState.aboutImages.length) {
      const ph = document.createElement("div");
      ph.style.borderRadius = "14px";
      ph.style.background = "#dcdcdc";
      ph.style.height = "120px";
      aboutGalleryEl.appendChild(ph);
    } else {
      homepageState.aboutImages.forEach((url, idx) => {
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
        del.style.background = "rgba(0,0,0,0.55)";
        del.style.color = "#fff";
        del.addEventListener("click", () => {
          homepageState.aboutImages.splice(idx, 1);
          homepageState.aboutImages = normalizeList(
            homepageState.aboutImages,
            MAX_ABOUT_IMAGES
          );
          if (aboutImagesTextarea) {
            aboutImagesTextarea.value = homepageState.aboutImages.join("\n");
          }
          renderAboutGallery();
        });

        wrap.appendChild(img);
        wrap.appendChild(del);
        aboutGalleryEl.appendChild(wrap);
      });
    }
  }

  if (heroImagesTextarea) {
    heroImagesTextarea.addEventListener("blur", () => {
      syncHeroImagesFromTextarea();
    });
  }

  if (aboutImagesTextarea) {
    aboutImagesTextarea.addEventListener("blur", () => {
      syncAboutImagesFromTextarea();
    });
  }

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
      } else {
        const row = document.createElement("div");
        row.className = "admin-notice-item";

        const textSpan = document.createElement("span");
        textSpan.className = "admin-notice-text";
        textSpan.textContent = value;

        const btnBox = document.createElement("div");

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "admin-button-ghost";
        editBtn.textContent = "Editar";
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
          textSpan.textContent = trimmed;
          setNoticeStatus("Aviso atualizado. Clique em salvar para publicar.", "ok");
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "admin-button-ghost";
        deleteBtn.textContent = "Excluir";
        deleteBtn.addEventListener("click", () => {
          if (!window.confirm("Remover este aviso?")) return;
          homepageState.notices.splice(idx, 1);
          renderNotices();
          setNoticeStatus("Aviso removido. Clique em salvar para atualizar o site.", "ok");
        });

        btnBox.appendChild(editBtn);
        btnBox.appendChild(deleteBtn);

        row.appendChild(textSpan);
        row.appendChild(btnBox);
        noticeListEl.appendChild(row);
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
        homepageState.heroImages = normalizeList(
          homepageState.heroImages,
          MAX_HOMEPAGE_IMAGES
        );
        if (heroImagesTextarea) {
          heroImagesTextarea.value = homepageState.heroImages.join("\n");
        }
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
        homepageState.aboutImages = normalizeList(
          homepageState.aboutImages,
          MAX_ABOUT_IMAGES
        );
        if (aboutImagesTextarea) {
          aboutImagesTextarea.value = homepageState.aboutImages.join("\n");
        }
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

  if (saveHomepageBtn) {
    saveHomepageBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        setHomepageStatus("Salvando...", "");

        const aboutText = aboutTextEl ? aboutTextEl.value.trim() : "";

        if (heroImagesTextarea) {
          syncHeroImagesFromTextarea();
        }
        if (aboutImagesTextarea) {
          syncAboutImagesFromTextarea();
        }

        const heroImages = normalizeList(
          homepageState.heroImages,
          MAX_HOMEPAGE_IMAGES
        );

        const aboutImages = normalizeList(
          homepageState.aboutImages,
          MAX_ABOUT_IMAGES
        );

        const notices = normalizeList(
          homepageState.notices.filter((n) => n && n.trim().length),
          10
        );

        const theme = homepageState.theme || "default";

        const res = await fetch("/api/homepage", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aboutText, heroImages, aboutImages, notices, theme })
        });
        if (!res.ok) throw new Error("Falha ao salvar a homepage.");
        await res.json();
        homepageState.heroImages = heroImages;
        homepageState.aboutImages = aboutImages;
        homepageState.notices = notices;
        if (heroImagesTextarea) {
          heroImagesTextarea.value = heroImages.join("\n");
        }
        if (aboutImagesTextarea) {
          aboutImagesTextarea.value = aboutImages.join("\n");
        }
        setHomepageStatus("Homepage atualizada com sucesso.", "ok");
        setNoticeStatus("Avisos publicados na vitrine.", "ok");
        await loadHomepageAdmin();
      } catch (err) {
        console.error(err);
        setHomepageStatus("Não foi possível salvar a homepage.", "error");
      }
    });
  }

  // =========================
  // Products
  // =========================
  async function loadProducts() {
    try {
      let res = await fetch("/api/admin/products");
      if (!res.ok) {
        if (res.status === 404) {
          res = await fetch("/api/products");
        }
      }
      if (!res.ok) throw new Error("Erro ao carregar produtos");
      const products = await res.json();

      if (Array.isArray(products)) {
        allProducts = products;
      } else if (products && typeof products === "object") {
        const flat = [];
        ["specials", "sets", "rings", "necklaces", "bracelets", "earrings"].forEach((key) => {
          if (Array.isArray(products[key])) {
            products[key].forEach((p) => flat.push(p));
          }
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
    }
  }

  function renderAllCategoryGrids() {
    Object.keys(grids).forEach((catKey) => {
      renderCategoryGrid(catKey);
    });
  }

  function renderCategoryGrid(categoryKey) {
    const container = grids[categoryKey];
    if (!container) return;

    container.innerHTML = "";

    const items = allProducts.filter((p) => p.category === categoryKey);

    items.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        const ad = new Date(a.createdAt).getTime();
        const bd = new Date(b.createdAt).getTime();
        return bd - ad;
      }
      if (a.id && b.id) {
        return String(b.id).localeCompare(String(a.id));
      }
      return 0;
    });

    const hasProducts = items.length > 0;
    const fragment = document.createDocumentFragment();

    const addCardFragment = createAddProductCardFragment(categoryKey);
    if (hasProducts) {
      const first = items[0];
      const firstCard = createProductCardFragment(first);
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
    if (!addCardTemplate || !("content" in addCardTemplate)) {
      return null;
    }
    const fragment = document.importNode(addCardTemplate.content, true);
    const button = fragment.querySelector(".admin-add-product-button");
    if (button) {
      button.addEventListener("click", () => openProductModal(categoryKey, null));
      const labelEl = fragment.querySelector(".admin-add-product-label");
      if (labelEl) {
        labelEl.textContent = "Adicionar em " + categoryLabel(categoryKey);
      }
    }
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

    if (primary && !cleaned.includes(primary)) {
      cleaned.unshift(primary);
    }

    return cleaned.slice(0, MAX_PRODUCT_IMAGES);
  }

  function createProductCardFragment(product) {
    if (!productCardTemplate || !("content" in productCardTemplate)) {
      return null;
    }
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

        const leftBtn = document.createElement("button");
        leftBtn.type = "button";
        leftBtn.className = "product-carousel-arrow product-carousel-arrow-left";
        leftBtn.textContent = "‹";

        const rightBtn = document.createElement("button");
        rightBtn.type = "button";
        rightBtn.className = "product-carousel-arrow product-carousel-arrow-right";
        rightBtn.textContent = "›";

        const indicator = document.createElement("div");
        indicator.className = "product-carousel-indicator";

        let currentIndex = 0;

        function updateCarousel() {
          const index = Math.max(0, Math.min(images.length - 1, currentIndex));
          currentIndex = index;
          track.style.transform = "translateX(" + String(-index * 100) + "%)";
          indicator.textContent = String(index + 1) + "/" + String(images.length);
          leftBtn.disabled = index === 0;
          rightBtn.disabled = index === images.length - 1;
        }

        leftBtn.addEventListener("click", () => {
          currentIndex -= 1;
          updateCarousel();
        });

        rightBtn.addEventListener("click", () => {
          currentIndex += 1;
          updateCarousel();
        });

        wrapper.appendChild(leftBtn);
        wrapper.appendChild(rightBtn);
        wrapper.appendChild(indicator);

        updateCarousel();
      }
    }

    const titleEl = fragment.querySelector(".admin-product-title");
    if (titleEl) {
      titleEl.textContent = product.name || "Produto";
    }

    const descEl = fragment.querySelector(".admin-product-description");
    if (descEl) {
      descEl.textContent = product.description || "Peça da coleção DARAH.";
    }

    const priceEl = fragment.querySelector(".admin-product-price");
    if (priceEl) {
      priceEl.textContent = formatBRL(product.price);
    }

    const stockEl = fragment.querySelector(".admin-product-stock");
    if (stockEl) {
      if (typeof product.stock === "number") {
        stockEl.textContent = "Estoque: " + product.stock;
      } else {
        stockEl.textContent = "Estoque: -";
      }
    }

    const editBtn = fragment.querySelector(".admin-edit-product-button");
    if (editBtn) {
      editBtn.addEventListener("click", () => openProductModal(product.category, product));
    }

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

    if (productOrNull) {
      currentProductImages = normalizeProductImages(productOrNull);
    } else {
      currentProductImages = [];
    }

    hiddenForm.el.reset();
    setFormStatus("", "");

    if (hiddenForm.category) {
      hiddenForm.category.value =
        productOrNull && productOrNull.category ? productOrNull.category : categoryKey;
    }

    if (hiddenForm.name) {
      hiddenForm.name.value = productOrNull && productOrNull.name ? productOrNull.name : "";
    }
    if (hiddenForm.description) {
      hiddenForm.description.value =
        productOrNull && productOrNull.description ? productOrNull.description : "";
    }

    if (hiddenForm.price) {
      const priceValue =
        productOrNull && typeof productOrNull.price === "number"
          ? String(productOrNull.price)
          : "";
      hiddenForm.price.value = priceValue;
    }

    if (hiddenForm.originalPrice) {
      const originalPriceValue =
        productOrNull && typeof productOrNull.originalPrice === "number"
          ? String(productOrNull.originalPrice)
          : "";
      hiddenForm.originalPrice.value = originalPriceValue;
    }

    if (hiddenForm.discountLabel) {
      hiddenForm.discountLabel.value =
        productOrNull && typeof productOrNull.discountLabel === "string"
          ? productOrNull.discountLabel
          : "";
    }

    if (hiddenForm.stock) {
      const stockValue =
        productOrNull && typeof productOrNull.stock === "number"
          ? String(productOrNull.stock)
          : "";
      hiddenForm.stock.value = stockValue;
    }

    renderProductImagesUI();

    if (productDeleteButton) {
      if (productOrNull && productOrNull.id) {
        productDeleteButton.style.display = "inline-flex";
      } else {
        productDeleteButton.style.display = "none";
      }
    }

    if (productModalTitle) {
      productModalTitle.textContent = productOrNull ? "Editar produto" : "Novo produto";
    }

    productModalBackdrop.style.display = "flex";
  }

  function closeProductModal() {
    if (productModalBackdrop) {
      productModalBackdrop.style.display = "none";
    }
    currentProductEditing = null;
    currentProductImages = [];
    setFormStatus("", "");
    if (hiddenForm.el) {
      hiddenForm.el.reset();
    }
    if (productImagePreview && productImagePlaceholder && productImageThumbs) {
      productImagePreview.src = "";
      productImagePreview.style.display = "none";
      productImagePlaceholder.style.display = "flex";
      productImageThumbs.innerHTML = "";
    }
    if (hiddenForm.imageUrl) {
      hiddenForm.imageUrl.value = "";
    }
  }

  if (productModalClose && productModalBackdrop) {
    productModalClose.addEventListener("click", () => {
      closeProductModal();
    });
    productModalBackdrop.addEventListener("click", (event) => {
      if (event.target === productModalBackdrop) {
        closeProductModal();
      }
    });
  }

  if (productImageFileButton && hiddenForm.imageFile) {
    productImageFileButton.addEventListener("click", () => {
      hiddenForm.imageFile.click();
    });

    hiddenForm.imageFile.addEventListener("change", async () => {
      const files = Array.from(hiddenForm.imageFile.files || []);
      if (!files.length) return;
      try {
        setFormStatus("Carregando imagens selecionadas...", "");
        const newImages = [];
        for (const file of files) {
          const url = await fileToDataUrl(file);
          newImages.push(url);
        }
        if (!Array.isArray(currentProductImages)) {
          currentProductImages = [];
        }
        currentProductImages = currentProductImages.concat(newImages);
        currentProductImages = normalizeList(currentProductImages, MAX_PRODUCT_IMAGES);

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
      const discountLabelRaw = hiddenForm.discountLabel
        ? hiddenForm.discountLabel.value.trim()
        : "";

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
        imageUrl:
          Array.isArray(currentProductImages) && currentProductImages.length
            ? currentProductImages[0]
            : "",
        images: Array.isArray(currentProductImages)
          ? currentProductImages.slice(0, MAX_PRODUCT_IMAGES)
          : [],
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
      }
    });
  }

  // API actions
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
        throw new Error(
          body && body.error ? body.error : "Não foi possível atualizar o produto."
        );
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
      const res = await fetch("/api/products/" + encodeURIComponent(id), {
        method: "DELETE"
      });
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

  // =========================
  // Auth flow
  // =========================
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
  }

  function showPanelView() {
    if (loginSection) loginSection.style.display = "none";
    if (loadingSection) loadingSection.style.display = "none";
    if (panelSection) panelSection.style.display = "block";
  }

  function startAdminSession(username) {
    const info = VALID_USERS[username];
    if (!info) return;

    storeAdminUser(username);
    updateHeaderUser(username);

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
      }, 4000);
    } else {
      if (panelSection) panelSection.style.display = "block";
      initializeAdminData();
    }
  }

  function initializeAdminData() {
    switchView("home");
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

  // Logout handler
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
        initializeAdminData();
      }
    }
  } catch {
  }

  // Small utility: debounce (kept in case needed later)
  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }
});
