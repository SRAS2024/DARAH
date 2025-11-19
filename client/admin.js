"use strict";

/**
 * Admin panel controller for DARAH
 * - Login in Portuguese with two allowed users
 * - Welcome loader text in Portuguese with an exclamation
 * - Homepage: live preview, device photo picker, autosave with debounce
 * - Products: grid mirrors storefront, inline edit on card, add-new plus card,
 *   photo picker from camera, library or files, save and delete in place
 * - Messages and labels in pt-BR
 */

document.addEventListener("DOMContentLoaded", () => {
  // Login and auth elements
  const loginSection = document.getElementById("adminLoginSection");
  const loginButton = document.getElementById("adminLoginButton");
  const usernameInput = document.getElementById("adminUsername");
  const passwordInput = document.getElementById("adminPassword");
  const loginErrorEl = document.getElementById("adminLoginError");
  const loadingSection = document.getElementById("adminLoadingSection");
  const welcomeMessageEl = document.getElementById("adminWelcomeMessage");
  const panelSection = document.getElementById("adminPanelSection");

  // Homepage admin elements
  const aboutTextEl = document.getElementById("adminAboutText");
  // New gallery container that mirrors the public collage if present
  const heroGalleryEl = document.getElementById("adminHeroGallery");
  // Legacy textarea fallback is still supported but hidden when gallery exists
  const heroImagesEl = document.getElementById("adminHeroImages");
  const heroImagesFileInput = document.getElementById("adminHeroImagesFile");
  const heroImagesFileButton = document.getElementById("adminHeroImagesFileButton");
  const saveHomepageBtn = document.getElementById("saveHomepageBtn");
  const homepageStatusEl = document.getElementById("adminHomepageStatus");

  // Optional notices
  const noticeListEl = document.getElementById("adminNoticeList");
  const addNoticeBtn = document.getElementById("adminAddNoticeBtn");

  // Product admin elements
  const productForm = document.getElementById("productForm"); // kept for backward compatibility
  const productCategoryEl = document.getElementById("productCategory");
  const productNameEl = document.getElementById("productName");
  const productDescriptionEl = document.getElementById("productDescription");
  const productPriceEl = document.getElementById("productPrice");
  const productStockEl = document.getElementById("productStock");
  const productImageUrlEl = document.getElementById("productImageUrl"); // will be hidden, we fill this internally
  const productImageFileInput = document.getElementById("productImageFile");
  const productImageFileButton = document.getElementById("productImageFileButton");
  const productFormStatusEl = document.getElementById("adminProductFormStatus");

  // Admin product grid that mirrors storefront
  const adminProductGrid = document.getElementById("adminProductGrid");

  // Footer year is no longer needed, but keep for compatibility
  const adminYearEl = document.getElementById("adminYear");

  // State
  let allProducts = [];
  let editingProductId = null;
  let homepageState = { aboutText: "", heroImages: [], notices: [] };

  // Valid users in Portuguese with updated username for Maria Eduarda
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

  // Utils
  const debounce = (fn, wait = 500) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  };

  function setLoginError(message) {
    if (!loginErrorEl) return;
    loginErrorEl.textContent = message || "";
    loginErrorEl.style.display = message ? "block" : "none";
    if (message) loginErrorEl.classList.add("error");
    else loginErrorEl.classList.remove("error");
  }

  function formatBRL(value) {
    if (value == null || Number.isNaN(Number(value))) return "R$ 0,00";
    try {
      return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    } catch {
      return "R$ " + Number(value).toFixed(2).replace(".", ",");
    }
  }

  function categoryLabel(category) {
    switch (category) {
      case "rings": return "Anéis";
      case "necklaces": return "Colares";
      case "bracelets": return "Pulseiras";
      case "earrings": return "Brincos";
      default: return category || "";
    }
  }

  function setHomepageStatus(message, type) {
    if (!homepageStatusEl) return;
    homepageStatusEl.textContent = message || "";
    homepageStatusEl.classList.remove("ok", "error");
    if (type === "ok") homepageStatusEl.classList.add("ok");
    if (type === "error") homepageStatusEl.classList.add("error");
  }

  function setProductFormStatus(message, type) {
    if (!productFormStatusEl) return;
    productFormStatusEl.textContent = message || "";
    productFormStatusEl.classList.remove("ok", "error");
    if (type === "ok") productFormStatusEl.classList.add("ok");
    if (type === "error") productFormStatusEl.classList.add("error");
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : String(reader.result));
      reader.onerror = () => reject(reader.error || new Error("Falha ao ler o arquivo."));
      reader.readAsDataURL(file);
    });
  }

  // Homepage load and autosave

  async function loadHomepageAdmin() {
    try {
      const res = await fetch("/api/homepage");
      if (!res.ok) throw new Error("Erro ao carregar a página inicial.");
      const hp = await res.json();

      homepageState.aboutText = typeof hp.aboutText === "string" ? hp.aboutText : "";
      homepageState.heroImages = Array.isArray(hp.heroImages) ? hp.heroImages : [];
      homepageState.notices = Array.isArray(hp.notices) ? hp.notices : [];

      if (aboutTextEl) aboutTextEl.value = homepageState.aboutText;
      renderHeroGallery();
      renderNotices();

      // Hide legacy textarea when gallery exists
      if (heroGalleryEl && heroImagesEl) heroImagesEl.style.display = "none";

      setHomepageStatus("Conteúdo carregado com sucesso.", "ok");
    } catch (err) {
      console.error(err);
      setHomepageStatus("Não foi possível carregar a página inicial.", "error");
    }
  }

  function renderHeroGallery() {
    if (!heroGalleryEl) return;
    heroGalleryEl.innerHTML = "";

    // Plus card
    const addCard = document.createElement("button");
    addCard.type = "button";
    addCard.className = "admin-hero-add";
    addCard.setAttribute("aria-label", "Adicionar foto");
    addCard.textContent = "+";
    addCard.addEventListener("click", () => heroImagesFileInput && heroImagesFileInput.click());
    heroGalleryEl.appendChild(addCard);

    // Existing images
    homepageState.heroImages.forEach((src, idx) => {
      const card = document.createElement("div");
      card.className = "admin-hero-card";

      const img = document.createElement("img");
      img.src = src;
      img.alt = "Imagem da homepage";
      card.appendChild(img);

      const row = document.createElement("div");
      row.className = "admin-hero-actions";

      const btnRemove = document.createElement("button");
      btnRemove.type = "button";
      btnRemove.className = "admin-button-secondary";
      btnRemove.textContent = "Excluir";
      btnRemove.addEventListener("click", async () => {
        homepageState.heroImages.splice(idx, 1);
        renderHeroGallery();
        await saveHomepageDebounced(true);
      });

      const btnReplace = document.createElement("button");
      btnReplace.type = "button";
      btnReplace.className = "admin-button-secondary";
      btnReplace.textContent = "Substituir";
      btnReplace.addEventListener("click", () => {
        if (!heroImagesFileInput) return;
        heroImagesFileInput.dataset.replaceIndex = String(idx);
        heroImagesFileInput.click();
      });

      row.appendChild(btnReplace);
      row.appendChild(btnRemove);
      card.appendChild(row);

      heroGalleryEl.appendChild(card);
    });
  }

  async function saveHomepage(forceMessage) {
    try {
      const body = {
        aboutText: aboutTextEl ? aboutTextEl.value.trim() : homepageState.aboutText,
        heroImages: homepageState.heroImages,
        notices: homepageState.notices
      };

      const res = await fetch("/api/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("Erro ao salvar a página inicial.");
      await res.json();
      if (forceMessage) setHomepageStatus("Página inicial atualizada.", "ok");
    } catch (err) {
      console.error(err);
      setHomepageStatus("Não foi possível salvar a página inicial.", "error");
    }
  }
  const saveHomepageDebounced = debounce(saveHomepage, 800);

  // Notices

  function renderNotices() {
    if (!noticeListEl) return;
    noticeListEl.innerHTML = "";
    if (!homepageState.notices.length) {
      const empty = document.createElement("div");
      empty.className = "admin-muted";
      empty.textContent = "Nenhum aviso no momento.";
      noticeListEl.appendChild(empty);
      return;
    }
    homepageState.notices.forEach((text, idx) => {
      const row = document.createElement("div");
      row.className = "admin-notice-row";

      const input = document.createElement("input");
      input.type = "text";
      input.value = text;
      input.placeholder = "Aviso do site";
      input.addEventListener("input", () => {
        homepageState.notices[idx] = input.value;
        saveHomepageDebounced();
      });

      const del = document.createElement("button");
      del.type = "button";
      del.className = "admin-button-secondary";
      del.textContent = "Excluir";
      del.addEventListener("click", async () => {
        homepageState.notices.splice(idx, 1);
        renderNotices();
        await saveHomepageDebounced(true);
      });

      row.appendChild(input);
      row.appendChild(del);
      noticeListEl.appendChild(row);
    });
  }

  // Products

  async function loadProductsAdmin() {
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) throw new Error("Erro ao carregar produtos.");
      const products = await res.json();
      allProducts = Array.isArray(products) ? products : [];
      renderProductsGrid(allProducts);
    } catch (err) {
      console.error(err);
      setProductFormStatus("Não foi possível carregar os produtos.", "error");
    }
  }

  function renderProductsGrid(products) {
    if (!adminProductGrid) return;
    adminProductGrid.innerHTML = "";

    // Add card
    const addCard = document.createElement("article");
    addCard.className = "admin-product-card add-card";
    addCard.innerHTML = `
      <div class="add-card-inner">
        <div class="add-card-icon">+</div>
        <div class="add-card-text-main">Adicionar novo produto</div>
        <div class="add-card-text-sub">Toque para cadastrar nome, preço, descrição e foto.</div>
      </div>
    `;
    addCard.addEventListener("click", () => openAddProductEditor());
    adminProductGrid.appendChild(addCard);

    // Existing products
    if (!Array.isArray(products) || !products.length) return;

    products.forEach((product) => {
      const card = productCardView(product);
      adminProductGrid.appendChild(card);
    });
  }

  function productCardView(product) {
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
    card.appendChild(imageWrapper);

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
    stockEl.textContent = typeof product.stock === "number" ? `Estoque: ${product.stock}` : "Estoque: -";

    metaLine.appendChild(priceEl);
    metaLine.appendChild(stockEl);

    const actionsRow = document.createElement("div");
    actionsRow.className = "admin-product-actions-row";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "admin-button-secondary";
    editBtn.textContent = "Editar";
    editBtn.addEventListener("click", () => openProductEditor(product, card));

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "admin-button-secondary";
    if (product.active === false || product.stock <= 0) {
      toggleBtn.textContent = "Ativar";
      toggleBtn.addEventListener("click", () => activateProduct(product.id));
    } else {
      toggleBtn.textContent = "Desativar";
      toggleBtn.addEventListener("click", () => {
        const confirmMsg = "Tem certeza de que deseja desativar este produto?";
        if (window.confirm(confirmMsg)) deactivateProduct(product.id);
      });
    }

    actionsRow.appendChild(editBtn);
    actionsRow.appendChild(toggleBtn);

    content.appendChild(headerLine);
    content.appendChild(descriptionEl);
    content.appendChild(metaLine);
    content.appendChild(actionsRow);

    card.appendChild(content);
    return card;
    }

  function openAddProductEditor() {
    const empty = {
      id: null,
      category: "rings",
      name: "",
      description: "",
      price: "",
      stock: "",
      imageUrl: ""
    };
    const editor = productEditorCard(empty, true);
    // Insert before the first card if exists
    if (adminProductGrid.firstChild) {
      adminProductGrid.insertBefore(editor, adminProductGrid.firstChild.nextSibling);
    } else {
      adminProductGrid.appendChild(editor);
    }
  }

  function openProductEditor(product, existingCard) {
    const editor = productEditorCard(product, false);
    if (existingCard && existingCard.parentElement) {
      existingCard.parentElement.replaceChild(editor, existingCard);
    }
  }

  function productEditorCard(product, isNew) {
    const card = document.createElement("article");
    card.className = "admin-product-card editing";

    const imageWrapper = document.createElement("div");
    imageWrapper.className = "product-image-wrapper";

    const img = document.createElement("img");
    img.alt = "Pré-visualização do produto";
    if (product.imageUrl) img.src = product.imageUrl;
    imageWrapper.appendChild(img);

    const photoRow = document.createElement("div");
    photoRow.className = "admin-product-photo-row";

    const photoBtn = document.createElement("button");
    photoBtn.type = "button";
    photoBtn.className = "admin-button-secondary";
    photoBtn.textContent = product.imageUrl ? "Trocar foto" : "Adicionar foto";

    const hiddenInput = document.createElement("input");
    hiddenInput.type = "file";
    hiddenInput.accept = "image/*";
    hiddenInput.capture = "environment"; // permite câmera quando disponível
    hiddenInput.style.display = "none";
    hiddenInput.addEventListener("change", async () => {
      const file = hiddenInput.files ? hiddenInput.files[0] : null;
      if (!file) return;
      try {
        setProductFormStatus("Processando a imagem...", "");
        const url = await fileToDataUrl(file);
        img.src = url;
        product.imageUrl = url;
        setProductFormStatus("Imagem pronta.", "ok");
      } catch (err) {
        console.error(err);
        setProductFormStatus("Não foi possível processar a imagem.", "error");
      } finally {
        hiddenInput.value = "";
      }
    });

    photoBtn.addEventListener("click", () => hiddenInput.click());
    photoRow.appendChild(photoBtn);
    photoRow.appendChild(hiddenInput);

    card.appendChild(imageWrapper);
    card.appendChild(photoRow);

    const content = document.createElement("div");
    content.className = "admin-product-content";

    // Header line with name and category
    const header = document.createElement("div");
    header.className = "admin-product-header-line";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Nome do produto";
    nameInput.value = product.name || "";

    const categorySelect = document.createElement("select");
    categorySelect.innerHTML = `
      <option value="rings">Anéis</option>
      <option value="necklaces">Colares</option>
      <option value="bracelets">Pulseiras</option>
      <option value="earrings">Brincos</option>
    `;
    categorySelect.value = product.category || "rings";

    header.appendChild(nameInput);
    header.appendChild(categorySelect);

    const descInput = document.createElement("textarea");
    descInput.className = "product-description";
    descInput.placeholder = "Descrição";
    descInput.value = product.description || "";

    const meta = document.createElement("div");
    meta.className = "admin-product-meta-line";

    const priceInput = document.createElement("input");
    priceInput.type = "number";
    priceInput.min = "0";
    priceInput.step = "0.01";
    priceInput.placeholder = "Preço em reais";
    priceInput.value = product.price ?? "";

    const stockInput = document.createElement("input");
    stockInput.type = "number";
    stockInput.min = "0";
    stockInput.step = "1";
    stockInput.placeholder = "Estoque";
    stockInput.value = product.stock ?? "";

    meta.appendChild(priceInput);
    meta.appendChild(stockInput);

    const actions = document.createElement("div");
    actions.className = "admin-product-actions-row";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "admin-button-primary";
    saveBtn.textContent = isNew ? "Adicionar" : "Salvar";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "admin-button-secondary";
    cancelBtn.textContent = "Cancelar";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "admin-button-secondary";
    deleteBtn.textContent = "Excluir";
    if (isNew) deleteBtn.disabled = true;

    saveBtn.addEventListener("click", async () => {
      const payload = {
        category: categorySelect.value,
        name: nameInput.value.trim(),
        description: descInput.value.trim(),
        price: parseFloat(String(priceInput.value)),
        stock: parseInt(String(stockInput.value), 10),
        imageUrl: product.imageUrl || ""
      };

      if (!payload.name || Number.isNaN(payload.price) || Number.isNaN(payload.stock)) {
        setProductFormStatus("Informe nome, preço e estoque.", "error");
        return;
      }

      if (product.id) {
        await updateProduct(product.id, payload);
      } else {
        await createProduct(payload);
      }
    });

    cancelBtn.addEventListener("click", () => {
      // If new, simply re-render grid. If existing, restore view card.
      renderProductsGrid(allProducts);
    });

    deleteBtn.addEventListener("click", async () => {
      if (!product.id) return;
      const ok = window.confirm("Excluir este produto?");
      if (!ok) return;
      await deactivateProduct(product.id);
    });

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    actions.appendChild(deleteBtn);

    content.appendChild(header);
    content.appendChild(descInput);
    content.appendChild(meta);
    content.appendChild(actions);

    card.appendChild(content);
    return card;
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
      setProductFormStatus("Produto adicionado com sucesso.", "ok");
      await loadProductsAdmin();
    } catch (err) {
      console.error(err);
      setProductFormStatus(err.message, "error");
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
      setProductFormStatus("Produto atualizado.", "ok");
      await loadProductsAdmin();
    } catch (err) {
      console.error(err);
      setProductFormStatus(err.message, "error");
    }
  }

  async function deactivateProduct(id) {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body && body.error ? body.error : "Não foi possível excluir o produto.");
      }
      await res.json();
      setProductFormStatus("Produto excluído.", "ok");
      await loadProductsAdmin();
    } catch (err) {
      console.error(err);
      setProductFormStatus(err.message, "error");
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
      setProductFormStatus("Produto ativado.", "ok");
      await loadProductsAdmin();
    } catch (err) {
      console.error(err);
      setProductFormStatus(err.message, "error");
    }
  }

  // Login

  function startAdminSession(username) {
    const info = VALID_USERS[username];
    if (!info) return;

    try {
      sessionStorage.setItem("darahAdminUser", JSON.stringify({ username }));
    } catch {}

    if (loginSection) loginSection.style.display = "none";

    if (loadingSection) {
      if (welcomeMessageEl) welcomeMessageEl.textContent = info.welcome;

      // Add pleasant blue accent to circle if present
      const fill = loadingSection.querySelector(".loading-circle-fill");
      if (fill instanceof HTMLElement) fill.classList.add("accent-blue");

      // Restart animation if needed
      if (fill && fill.parentElement) {
        const clone = fill.cloneNode(true);
        fill.parentElement.replaceChild(clone, fill);
      }

      loadingSection.style.display = "flex";
      setTimeout(() => {
        loadingSection.style.display = "none";
        if (panelSection) panelSection.style.display = "block";
        loadHomepageAdmin();
        loadProductsAdmin();
      }, 4000);
    } else if (panelSection) {
      panelSection.style.display = "block";
      loadHomepageAdmin();
      loadProductsAdmin();
    }
  }

  function handleLoginSubmit() {
    if (!usernameInput || !passwordInput) return;
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    const info = VALID_USERS[username];
    if (!info || info.password !== password) {
      setLoginError("Usuário ou senha inválidos.");
      return;
    }
    setLoginError("");
    startAdminSession(username);
  }

  // Events

  // Homepage autosave on about text
  if (aboutTextEl) {
    aboutTextEl.addEventListener("input", () => {
      setHomepageStatus("Salvando alterações...", "");
      saveHomepageDebounced();
    });
  }

  // Homepage image picker with add and replace behaviors
  if (heroImagesFileButton && heroImagesFileInput) {
    heroImagesFileButton.addEventListener("click", () => heroImagesFileInput.click());
  }

  if (heroImagesFileInput) {
    heroImagesFileInput.addEventListener("change", async () => {
      const files = Array.from(heroImagesFileInput.files || []);
      if (!files.length) return;

      const replaceIndex = heroImagesFileInput.dataset.replaceIndex;
      delete heroImagesFileInput.dataset.replaceIndex;

      try {
        setHomepageStatus("Processando imagens...", "");
        const urls = [];
        for (const f of files) urls.push(await fileToDataUrl(f));

        if (typeof replaceIndex !== "undefined") {
          const idx = parseInt(String(replaceIndex), 10);
          if (!Number.isNaN(idx)) homepageState.heroImages[idx] = urls[0];
        } else {
          homepageState.heroImages.push(...urls);
        }

        renderHeroGallery();
        await saveHomepageDebounced(true);
      } catch (err) {
        console.error(err);
        setHomepageStatus("Não foi possível processar as imagens.", "error");
      } finally {
        heroImagesFileInput.value = "";
      }
    });
  }

  // Optional notice add
  if (addNoticeBtn) {
    addNoticeBtn.addEventListener("click", async () => {
      homepageState.notices.push("");
      renderNotices();
      await saveHomepageDebounced(true);
    });
  }

  // Legacy form kept working, but no need to type image URLs
  if (productImageFileButton && productImageFileInput && productImageUrlEl) {
    // Hide raw URL field if present
    productImageUrlEl.style.display = "none";
    productImageFileButton.addEventListener("click", () => productImageFileInput.click());
    productImageFileInput.addEventListener("change", async () => {
      const file = productImageFileInput.files ? productImageFileInput.files[0] : null;
      if (!file) return;
      try {
        setProductFormStatus("Processando a imagem...", "");
        const url = await fileToDataUrl(file);
        productImageUrlEl.value = url; // stored but not shown
        setProductFormStatus("Imagem pronta. Preencha e salve.", "ok");
      } catch (err) {
        console.error(err);
        setProductFormStatus("Não foi possível processar a imagem.", "error");
      } finally {
        productImageFileInput.value = "";
      }
    });
  }

  if (productForm) {
    productForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const payload = {
        category: productCategoryEl ? productCategoryEl.value : "rings",
        name: productNameEl ? productNameEl.value.trim() : "",
        description: productDescriptionEl ? productDescriptionEl.value.trim() : "",
        price: productPriceEl ? parseFloat(productPriceEl.value) : NaN,
        stock: productStockEl ? parseInt(productStockEl.value, 10) : NaN,
        imageUrl: productImageUrlEl ? productImageUrlEl.value.trim() : ""
      };

      if (!payload.name || Number.isNaN(payload.price) || Number.isNaN(payload.stock)) {
        setProductFormStatus("Informe nome, preço e estoque.", "error");
        return;
      }

      if (editingProductId) updateProduct(editingProductId, payload);
      else createProduct(payload);
    });
  }

  if (adminYearEl) {
    adminYearEl.textContent = String(new Date().getFullYear());
  }

  // Login events
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

  // Restore existing admin session
  let restoredUser = null;
  try {
    const stored = sessionStorage.getItem("darahAdminUser");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.username && VALID_USERS[parsed.username]) restoredUser = parsed.username;
    }
  } catch {}

  if (restoredUser && panelSection) {
    if (loginSection) loginSection.style.display = "none";
    if (loadingSection) loadingSection.style.display = "none";
    panelSection.style.display = "block";
    const info = VALID_USERS[restoredUser];
    if (welcomeMessageEl && info) welcomeMessageEl.textContent = info.welcome;
    loadHomepageAdmin();
    loadProductsAdmin();
  } else {
    if (panelSection) panelSection.style.display = "none";
    if (loadingSection) loadingSection.style.display = "none";
    if (loginSection) loginSection.style.display = "block";
  }
});
