"use strict";

/**
 * DARAH · Admin
 * Mirrors the storefront layout with per-tab editing.
 * All UI copy in pt-BR. Two allowed logins with a welcome loader.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Top navigation inside Admin (mirrors storefront)
  const navLinks = Array.from(document.querySelectorAll(".main-nav .nav-link"));
  const views = {
    home: document.getElementById("view-home"),
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

  // Homepage admin controls
  const aboutTextEl = document.getElementById("adminAboutText");
  const heroGalleryEl = document.getElementById("adminHeroGallery");
  const heroImagesTextarea = document.getElementById("adminHeroImages"); // hidden, API compatibility
  const heroImagesFileInput = document.getElementById("adminHeroImagesFile");
  const heroImagesFileButton = document.getElementById("adminHeroImagesFileButton");
  const saveHomepageBtn = document.getElementById("saveHomepageBtn");
  const homepageStatusEl = document.getElementById("adminHomepageStatus");

  // Optional site notices
  const addNoticeBtn = document.getElementById("adminAddNoticeBtn");
  const noticeListEl = document.getElementById("adminNoticeList");

  // Hidden product form kept for API functions reuse
  const hiddenForm = {
    el: document.getElementById("productForm"),
    category: document.getElementById("productCategory"),
    name: document.getElementById("productName"),
    description: document.getElementById("productDescription"),
    price: document.getElementById("productPrice"),
    stock: document.getElementById("productStock"),
    imageUrl: document.getElementById("productImageUrl"),
    imageFile: document.getElementById("productImageFile"),
    status: document.getElementById("adminProductFormStatus")
  };

  // Category grids (mirror storefront)
  const grids = {
    rings: document.getElementById("grid-rings"),
    necklaces: document.getElementById("grid-necklaces"),
    bracelets: document.getElementById("grid-bracelets"),
    earrings: document.getElementById("grid-earrings")
  };

  // State
  let allProducts = [];
  let homepageState = { aboutText: "", heroImages: [], notices: [] };

  // Allowed users and welcome messages
  const VALID_USERS = {
    "Danielle Almeida": {
      password: "Eu amo meu genro",
      welcome: "Bem-vinda, Danielle!"
    },
    "Maria Eduarda": {
      password: "Estou apaixonada por Ryan Simonds",
      welcome: "Bem-vinda, Maria Eduarda!"
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

  function formatBRL(value) {
    if (value == null || Number.isNaN(Number(value))) return "R$ 0,00";
    try {
      return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    } catch {
      return "R$ " + Number(value).toFixed(2).replace(".", ",");
    }
  }

  function categoryLabel(key) {
    return (
      {
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
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : String(reader.result));
      reader.onerror = () => reject(reader.error || new Error("Falha ao ler arquivo de imagem."));
      reader.readAsDataURL(file);
    });
  }

  // View switching inside admin
  function switchView(id) {
    Object.values(views).forEach((v) => v && (v.classList.remove("active-view")));
    const el = views[id];
    if (el) el.classList.add("active-view");
    navLinks.forEach((b) => b.classList.toggle("active", b.dataset.view === id));
  }

  navLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.view;
      if (id) switchView(id);
    });
  });

  // =========================
  // Homepage load and save
  // =========================
  async function loadHomepageAdmin() {
    try {
      const res = await fetch("/api/homepage");
      if (!res.ok) throw new Error("Erro ao carregar conteúdo da homepage");
      const hp = await res.json();

      homepageState.aboutText = typeof hp.aboutText === "string" ? hp.aboutText : "";
      homepageState.heroImages = Array.isArray(hp.heroImages) ? hp.heroImages.slice(0) : [];
      homepageState.notices = Array.isArray(hp.notices) ? hp.notices.slice(0) : [];

      if (aboutTextEl) aboutTextEl.value = homepageState.aboutText;
      if (heroImagesTextarea) heroImagesTextarea.value = homepageState.heroImages.join("\n");
      renderHeroGallery();
      renderNotices();

      setHomepageStatus("Conteúdo carregado com sucesso.", "ok");
    } catch (err) {
      console.error(err);
      setHomepageStatus("Não foi possível carregar a homepage.", "error");
    }
  }

  function renderHeroGallery() {
    if (!heroGalleryEl) return;
    heroGalleryEl.innerHTML = "";
    if (!homepageState.heroImages.length) {
      // Show a subtle placeholder cell
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
          if (heroImagesTextarea) heroImagesTextarea.value = homepageState.heroImages.join("\n");
          renderHeroGallery();
        });
        wrap.appendChild(img);
        wrap.appendChild(del);
        heroGalleryEl.appendChild(wrap);
      });
    }
  }

  function renderNotices() {
    if (!noticeListEl) return;
    noticeListEl.innerHTML = "";
    if (!homepageState.notices.length) {
      const p = document.createElement("p");
      p.className = "home-highlight-text";
      p.textContent = "Nenhum aviso no momento.";
      noticeListEl.appendChild(p);
      return;
    }
    homepageState.notices.forEach((text, idx) => {
      const row = document.createElement("div");
      row.className = "notice-row";
      const input = document.createElement("input");
      input.type = "text";
      input.className = "admin-input";
      input.value = text;
      input.addEventListener("input", debounce(() => {
        homepageState.notices[idx] = input.value.trim();
      }, 150));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "admin-button-secondary";
      remove.textContent = "Remover";
      remove.addEventListener("click", () => {
        homepageState.notices.splice(idx, 1);
        renderNotices();
      });

      row.appendChild(input);
      row.appendChild(remove);
      noticeListEl.appendChild(row);
    });
  }

  if (addNoticeBtn) {
    addNoticeBtn.addEventListener("click", () => {
      homepageState.notices.push("");
      renderNotices();
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

  if (saveHomepageBtn) {
    saveHomepageBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        setHomepageStatus("Salvando...", "");
        const aboutText = aboutTextEl ? aboutTextEl.value.trim() : "";
        const heroImages = homepageState.heroImages.slice(0);
        const notices = homepageState.notices.filter((n) => n && n.trim().length);

        const res = await fetch("/api/homepage", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aboutText, heroImages, notices })
        });
        if (!res.ok) throw new Error("Falha ao salvar a homepage.");
        await res.json();
        setHomepageStatus("Homepage atualizada com sucesso.", "ok");
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
      const res = await fetch("/api/admin/products");
      if (!res.ok) throw new Error("Erro ao carregar produtos");
      const products = await res.json();
      allProducts = Array.isArray(products) ? products : [];
      renderAllCategoryGrids();
    } catch (err) {
      console.error(err);
      setFormStatus("Não foi possível carregar os produtos.", "error");
    }
  }

  function setFormStatus(message, type) {
    const el = hiddenForm.status;
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("ok", "error");
    if (type === "ok") el.classList.add("ok");
    if (type === "error") el.classList.add("error");
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

    // Add card goes first
    const addCard = createAddProductCardElement(categoryKey);
    container.appendChild(addCard);

    const items = allProducts.filter((p) => p.category === categoryKey);
    if (!items.length) return;

    items.forEach((product) => {
      const card = document.createElement("article");
      card.className = "admin-product-card";

      const imageWrapper = document.createElement("div");
      imageWrapper.className = "product-image-wrapper";
      if (product.imageUrl) {
        const img = document.createElement("img");
        img.src = product.imageUrl;
        img.alt = product.name || "Imagem do produto";
        imageWrapper.appendChild(img);
      }

      const content = document.createElement("div");
      content.className = "admin-product-content";

      const headerLine = document.createElement("div");
      headerLine.className = "admin-product-header-line";

      const nameEl = document.createElement("div");
      nameEl.className = "admin-product-name";
      nameEl.textContent = product.name || "Produto";

      const categoryEl = document.createElement("div");
      categoryEl.className = "admin-product-category";
      categoryEl.textContent = categoryLabel(product.category);

      headerLine.appendChild(nameEl);
      headerLine.appendChild(categoryEl);

      const descriptionEl = document.createElement("div");
      descriptionEl.className = "product-description";
      descriptionEl.textContent = product.description || "Peça da coleção DARAH.";

      const metaLine = document.createElement("div");
      metaLine.className = "admin-product-meta-line";

      const priceEl = document.createElement("div");
      priceEl.className = "admin-product-price";
      priceEl.textContent = formatBRL(product.price);

      const stockEl = document.createElement("div");
      stockEl.className = "admin-product-stock";
      stockEl.textContent =
        typeof product.stock === "number" ? `Estoque: ${product.stock}` : "Estoque: -";

      metaLine.appendChild(priceEl);
      metaLine.appendChild(stockEl);

      const actionsRow = document.createElement("div");
      actionsRow.className = "admin-product-actions-row";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "admin-button-secondary";
      editBtn.textContent = "Editar";
      editBtn.addEventListener("click", () => openInlineEditor(container, categoryKey, product));

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "admin-button-secondary";
      const inactive = product.active === false || product.stock <= 0;
      toggleBtn.textContent = inactive ? "Ativar" : "Desativar";
      toggleBtn.addEventListener("click", () => {
        if (inactive) {
          activateProduct(product.id);
        } else {
          const confirmMsg =
            "Tem certeza de que deseja desativar este produto? Ele não aparecerá mais na loja.";
          if (window.confirm(confirmMsg)) deactivateProduct(product.id);
        }
      });

      actionsRow.appendChild(editBtn);
      actionsRow.appendChild(toggleBtn);

      content.appendChild(headerLine);
      content.appendChild(descriptionEl);
      content.appendChild(metaLine);
      content.appendChild(actionsRow);

      card.appendChild(imageWrapper);
      card.appendChild(content);

      container.appendChild(card);
    });
  }

  function createAddProductCardElement(categoryKey) {
    const card = document.createElement("article");
    card.className = "admin-product-card add-card";

    const inner = document.createElement("div");
    inner.className = "add-card-inner";

    const icon = document.createElement("div");
    icon.className = "add-card-icon";
    icon.textContent = "+";

    const textMain = document.createElement("div");
    textMain.className = "add-card-text-main";
    textMain.textContent = "Adicionar novo produto";

    const textSub = document.createElement("div");
    textSub.className = "add-card-text-sub";
    textSub.textContent = "Toque para cadastrar nome, preço, descrição e foto.";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "add-card-button";
    button.textContent = "Novo produto";

    inner.appendChild(icon);
    inner.appendChild(textMain);
    inner.appendChild(textSub);
    inner.appendChild(button);
    card.appendChild(inner);

    const open = () => openInlineEditor(grids[categoryKey], categoryKey, null);
    button.addEventListener("click", open);
    card.addEventListener("click", (e) => {
      if (e.target instanceof HTMLElement && e.target.closest("button")) return;
      open();
    });

    return card;
  }

  function openInlineEditor(container, categoryKey, productOrNull) {
    // Remove any existing inline editor in this container
    const existing = container.querySelector(".admin-inline-editor");
    if (existing) existing.remove();

    const editor = document.createElement("div");
    editor.className = "admin-product-card admin-inline-editor";
    editor.style.border = "1px solid var(--accent-soft)";
    editor.style.padding = "12px";

    // Fields
    const name = document.createElement("input");
    name.className = "admin-input";
    name.placeholder = "Nome da peça";
    name.value = productOrNull ? productOrNull.name || "" : "";

    const desc = document.createElement("textarea");
    desc.className = "admin-textarea";
    desc.placeholder = "Descrição";
    desc.value = productOrNull ? productOrNull.description || "" : "";

    const price = document.createElement("input");
    price.type = "number";
    price.step = "0.01";
    price.min = "0";
    price.className = "admin-input";
    price.placeholder = "Preço em reais";
    price.value = productOrNull && typeof productOrNull.price === "number" ? String(productOrNull.price) : "";

    const stock = document.createElement("input");
    stock.type = "number";
    stock.min = "0";
    stock.className = "admin-input";
    stock.placeholder = "Quantidade em estoque";
    stock.value = productOrNull && typeof productOrNull.stock === "number" ? String(productOrNull.stock) : "";

    const imageUrl = document.createElement("input");
    imageUrl.type = "text";
    imageUrl.className = "admin-input";
    imageUrl.placeholder = "Cole uma URL ou escolha uma foto";
    imageUrl.value = productOrNull ? productOrNull.imageUrl || "" : "";

    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";
    file.style.display = "none";

    const pickBtn = document.createElement("button");
    pickBtn.type = "button";
    pickBtn.className = "admin-button-secondary";
    pickBtn.textContent = "Escolher foto do dispositivo";
    pickBtn.addEventListener("click", () => file.click());

    file.addEventListener("change", async () => {
      const f = file.files ? file.files[0] : null;
      if (!f) return;
      try {
        setFormStatus("Carregando imagem selecionada...", "");
        const url = await fileToDataUrl(f);
        imageUrl.value = url;
        setFormStatus("Imagem adicionada. Salve para aplicar.", "ok");
      } catch (err) {
        console.error(err);
        setFormStatus("Não foi possível processar a imagem selecionada.", "error");
      } finally {
        file.value = "";
      }
    });

    const rowButtons = document.createElement("div");
    rowButtons.style.display = "flex";
    rowButtons.style.gap = "8px";
    rowButtons.style.marginTop = "8px";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "primary-button";
    saveBtn.textContent = productOrNull ? "Salvar alterações" : "Adicionar produto";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "admin-button-secondary";
    cancelBtn.textContent = "Cancelar";
    cancelBtn.addEventListener("click", () => editor.remove());

    rowButtons.appendChild(saveBtn);
    rowButtons.appendChild(pickBtn);
    rowButtons.appendChild(cancelBtn);

    // Assemble editor
    const wrapField = (labelText, el) => {
      const wrap = document.createElement("div");
      wrap.className = "admin-field";
      const label = document.createElement("label");
      label.className = "admin-label";
      label.textContent = labelText;
      wrap.appendChild(label);
      wrap.appendChild(el);
      return wrap;
    };

    editor.appendChild(wrapField("Nome do produto", name));
    editor.appendChild(wrapField("Descrição", desc));
    editor.appendChild(wrapField("Preço (R$)", price));
    editor.appendChild(wrapField("Estoque", stock));
    editor.appendChild(wrapField("Imagem do produto", imageUrl));
    editor.appendChild(file);
    editor.appendChild(rowButtons);

    // Insert right after the add-card
    const addCard = container.querySelector(".admin-product-card.add-card");
    if (addCard && addCard.nextSibling) {
      container.insertBefore(editor, addCard.nextSibling);
    } else {
      container.appendChild(editor);
    }

    // Save handler
    saveBtn.addEventListener("click", () => {
      const payload = {
        category: categoryKey,
        name: name.value.trim(),
        description: desc.value.trim(),
        price: parseFloat(price.value),
        stock: parseInt(stock.value, 10),
        imageUrl: imageUrl.value.trim()
      };

      if (!payload.name || Number.isNaN(payload.price) || Number.isNaN(payload.stock)) {
        setFormStatus("Preencha pelo menos nome, preço e quantidade em estoque.", "error");
        return;
      }

      if (productOrNull) {
        updateProduct(productOrNull.id, payload);
      } else {
        createProduct(payload);
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
    }
  }

  async function updateProduct(id, payload) {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
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
    }
  }

  async function deactivateProduct(id) {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body && body.error ? body.error : "Não foi possível desativar o produto.");
      }
      await res.json();
      setFormStatus("Produto desativado.", "ok");
      await loadProducts();
    } catch (err) {
      console.error(err);
      setFormStatus(err.message, "error");
    }
  }

  async function activateProduct(id) {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body && body.error ? body.error : "Não foi possível ativar o produto.");
      }
      await res.json();
      setFormStatus("Produto ativado.", "ok");
      await loadProducts();
    } catch (err) {
      console.error(err);
      setFormStatus(err.message, "error");
    }
  }

  // =========================
  // Auth flow
  // =========================
  function startAdminSession(username) {
    const info = VALID_USERS[username];
    if (!info) return;

    try {
      sessionStorage.setItem("darahAdminUser", JSON.stringify({ username }));
    } catch {
      /* ignore */
    }

    if (loginSection) loginSection.style.display = "none";

    if (loadingSection) {
      if (welcomeMessageEl) welcomeMessageEl.textContent = info.welcome;

      // Restart the loading circle animation by cloning the fill element
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
        initializeAdminData();
      }
    }
  } catch {
    // ignore
  }

  // Small utility: debounce
  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }
});
