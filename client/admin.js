"use strict";

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
  const heroImagesEl = document.getElementById("adminHeroImages");
  const heroImagesFileInput = document.getElementById("adminHeroImagesFile");
  const heroImagesFileButton = document.getElementById(
    "adminHeroImagesFileButton"
  );
  const saveHomepageBtn = document.getElementById("saveHomepageBtn");
  const homepageStatusEl = document.getElementById("adminHomepageStatus");

  // Product admin elements
  const productForm = document.getElementById("productForm");
  const productCategoryEl = document.getElementById("productCategory");
  const productNameEl = document.getElementById("productName");
  const productDescriptionEl = document.getElementById("productDescription");
  const productPriceEl = document.getElementById("productPrice");
  const productStockEl = document.getElementById("productStock");
  const productImageUrlEl = document.getElementById("productImageUrl");
  const productImageFileInput = document.getElementById("productImageFile");
  const productImageFileButton = document.getElementById(
    "productImageFileButton"
  );
  const productFormStatusEl = document.getElementById("adminProductFormStatus");
  const productsTableBody = document.getElementById("adminProductsTableBody");

  // Admin product grid elements
  const adminProductGrid = document.getElementById("adminProductGrid");
  const adminAddProductCard = document.getElementById("adminAddProductCard");
  const adminAddProductButton = document.getElementById("adminAddProductButton");

  // Old footer span is optional now
  const adminYearEl = document.getElementById("adminYear");

  let allProducts = [];
  let editingProductId = null;

  const VALID_USERS = {
    "Danielle Almeida": {
      password: "Eu amo meu genro",
      welcome: "Welcome, Danielle!"
    },
    "Maria Eduarda Almeida Simonds": {
      password: "Estou apaixonada por Ryan Simonds",
      welcome: "Welcome, Maria Eduarda"
    }
  };

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

  function formatBRL(value) {
    if (value == null || Number.isNaN(Number(value))) {
      return "R$ 0,00";
    }
    try {
      return Number(value).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      });
    } catch (err) {
      return "R$ " + Number(value).toFixed(2).replace(".", ",");
    }
  }

  function categoryLabel(category) {
    switch (category) {
      case "rings":
        return "Anéis";
      case "necklaces":
        return "Colares";
      case "bracelets":
        return "Pulseiras";
      case "earrings":
        return "Brincos";
      default:
        return category || "";
    }
  }

  function setHomepageStatus(message, type) {
    if (!homepageStatusEl) return;
    homepageStatusEl.textContent = message || "";
    homepageStatusEl.classList.remove("ok", "error");
    if (type === "ok") {
      homepageStatusEl.classList.add("ok");
    } else if (type === "error") {
      homepageStatusEl.classList.add("error");
    }
  }

  function setProductFormStatus(message, type) {
    if (!productFormStatusEl) return;
    productFormStatusEl.textContent = message || "";
    productFormStatusEl.classList.remove("ok", "error");
    if (type === "ok") {
      productFormStatusEl.classList.add("ok");
    } else if (type === "error") {
      productFormStatusEl.classList.add("error");
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(
          typeof reader.result === "string"
            ? reader.result
            : String(reader.result)
        );
      };
      reader.onerror = () => {
        reject(reader.error || new Error("Falha ao ler arquivo de imagem."));
      };
      reader.readAsDataURL(file);
    });
  }

  async function loadHomepageAdmin() {
    try {
      const res = await fetch("/api/homepage");
      if (!res.ok) throw new Error("Erro ao carregar conteúdo da homepage");
      const hp = await res.json();

      if (aboutTextEl && typeof hp.aboutText === "string") {
        aboutTextEl.value = hp.aboutText;
      }

      if (heroImagesEl) {
        if (Array.isArray(hp.heroImages) && hp.heroImages.length > 0) {
          heroImagesEl.value = hp.heroImages.join("\n");
        } else {
          heroImagesEl.value = "";
        }
      }

      setHomepageStatus("Conteúdo carregado com sucesso.", "ok");
    } catch (err) {
      console.error(err);
      setHomepageStatus("Não foi possível carregar a homepage.", "error");
    }
  }

  async function saveHomepage() {
    try {
      const aboutText = aboutTextEl ? aboutTextEl.value.trim() : "";
      const heroImagesRaw = heroImagesEl ? heroImagesEl.value : "";
      const heroImages =
        heroImagesRaw
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0) || [];

      const res = await fetch("/api/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aboutText, heroImages })
      });

      if (!res.ok) throw new Error("Erro ao salvar homepage");
      await res.json();
      setHomepageStatus("Homepage atualizada com sucesso.", "ok");
    } catch (err) {
      console.error(err);
      setHomepageStatus("Não foi possível salvar a homepage.", "error");
    }
  }

  function clearProductForm() {
    productCategoryEl.value = "rings";
    productNameEl.value = "";
    productDescriptionEl.value = "";
    productPriceEl.value = "";
    productStockEl.value = "";
    productImageUrlEl.value = "";
    if (productImageFileInput) {
      productImageFileInput.value = "";
    }
    editingProductId = null;
    const submitBtn = productForm
      ? productForm.querySelector("button[type=submit]")
      : null;
    if (submitBtn) {
      submitBtn.textContent = "Adicionar produto";
    }
  }

  function fillProductForm(product) {
    productCategoryEl.value = product.category || "rings";
    productNameEl.value = product.name || "";
    productDescriptionEl.value = product.description || "";
    productPriceEl.value =
      typeof product.price === "number" ? String(product.price) : "";
    productStockEl.value =
      typeof product.stock === "number" ? String(product.stock) : "";
    productImageUrlEl.value = product.imageUrl || "";
    editingProductId = product.id;
    const submitBtn = productForm
      ? productForm.querySelector("button[type=submit]")
      : null;
    if (submitBtn) {
      submitBtn.textContent = "Salvar alterações";
    }
  }

  function renderProductsTable(products) {
    if (!productsTableBody) return;
    productsTableBody.innerHTML = "";

    if (!Array.isArray(products) || products.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.textContent = "Nenhum produto cadastrado até o momento.";
      cell.style.textAlign = "center";
      cell.style.fontSize = "13px";
      cell.style.color = "var(--text-muted)";
      row.appendChild(cell);
      productsTableBody.appendChild(row);
      return;
    }

    products.forEach((product) => {
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      tdName.textContent = product.name || "Produto";

      const tdCategory = document.createElement("td");
      tdCategory.textContent = categoryLabel(product.category);

      const tdPrice = document.createElement("td");
      tdPrice.textContent = formatBRL(product.price);

      const tdStock = document.createElement("td");
      tdStock.textContent =
        typeof product.stock === "number" ? String(product.stock) : "";

      const tdStatus = document.createElement("td");
      const statusSpan = document.createElement("span");
      statusSpan.classList.add("admin-pill");
      if (product.active === false || product.stock <= 0) {
        statusSpan.classList.add("admin-pill-inactive");
        statusSpan.textContent =
          product.stock <= 0 ? "Sem estoque" : "Inativo";
      } else {
        statusSpan.classList.add("admin-pill-active");
        statusSpan.textContent = "Ativo";
      }
      tdStatus.appendChild(statusSpan);

      const tdActions = document.createElement("td");
      const actionsWrapper = document.createElement("div");
      actionsWrapper.className = "admin-product-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "admin-button-secondary";
      editBtn.textContent = "Editar";
      editBtn.dataset.action = "edit";
      editBtn.dataset.id = product.id;

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "admin-button-secondary";
      toggleBtn.dataset.id = product.id;
      if (product.active === false || product.stock <= 0) {
        toggleBtn.dataset.action = "activate";
        toggleBtn.textContent = "Ativar";
      } else {
        toggleBtn.dataset.action = "deactivate";
        toggleBtn.textContent = "Desativar";
      }

      actionsWrapper.appendChild(editBtn);
      actionsWrapper.appendChild(toggleBtn);
      tdActions.appendChild(actionsWrapper);

      tr.appendChild(tdName);
      tr.appendChild(tdCategory);
      tr.appendChild(tdPrice);
      tr.appendChild(tdStock);
      tr.appendChild(tdStatus);
      tr.appendChild(tdActions);

      productsTableBody.appendChild(tr);
    });
  }

  function renderProductsGrid(products) {
    if (!adminProductGrid) return;

    // Keep the add card if it exists, remove only dynamic cards
    const addCard = adminAddProductCard || adminProductGrid.querySelector(
      "#adminAddProductCard"
    );
    Array.from(adminProductGrid.children).forEach((child) => {
      if (child !== addCard) {
        adminProductGrid.removeChild(child);
      }
    });

    if (!Array.isArray(products) || products.length === 0) {
      // Only add card is shown when there are no products
      if (!addCard) {
        const createdAddCard = createAddProductCardElement();
        adminProductGrid.appendChild(createdAddCard);
      } else {
        adminProductGrid.appendChild(addCard);
      }
      return;
    }

    products.forEach((product) => {
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
      descriptionEl.textContent =
        product.description || "Peça da coleção DARAH.";

      const metaLine = document.createElement("div");
      metaLine.className = "admin-product-meta-line";

      const priceEl = document.createElement("div");
      priceEl.className = "admin-product-price";
      priceEl.textContent = formatBRL(product.price);

      const stockEl = document.createElement("div");
      stockEl.className = "admin-product-stock";
      stockEl.textContent =
        typeof product.stock === "number"
          ? `Estoque: ${product.stock}`
          : "Estoque: -";

      metaLine.appendChild(priceEl);
      metaLine.appendChild(stockEl);

      const actionsRow = document.createElement("div");
      actionsRow.className = "admin-product-actions-row";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "admin-button-secondary";
      editBtn.textContent = "Editar";
      editBtn.dataset.action = "edit";
      editBtn.dataset.id = product.id;

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "admin-button-secondary";
      toggleBtn.dataset.id = product.id;
      if (product.active === false || product.stock <= 0) {
        toggleBtn.dataset.action = "activate";
        toggleBtn.textContent = "Ativar";
      } else {
        toggleBtn.dataset.action = "deactivate";
        toggleBtn.textContent = "Desativar";
      }

      actionsRow.appendChild(editBtn);
      actionsRow.appendChild(toggleBtn);

      content.appendChild(headerLine);
      content.appendChild(descriptionEl);
      content.appendChild(metaLine);
      content.appendChild(actionsRow);

      card.appendChild(imageWrapper);
      card.appendChild(content);

      if (addCard && adminProductGrid.contains(addCard)) {
        adminProductGrid.insertBefore(card, addCard);
      } else {
        adminProductGrid.appendChild(card);
      }
    });

    if (addCard && !adminProductGrid.contains(addCard)) {
      adminProductGrid.appendChild(addCard);
    } else if (!addCard) {
      const createdAddCard = createAddProductCardElement();
      adminProductGrid.appendChild(createdAddCard);
    }
  }

  function createAddProductCardElement() {
    const card = document.createElement("article");
    card.className = "admin-product-card add-card";
    card.id = "adminAddProductCard";

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
    textSub.textContent =
      "Clique para cadastrar uma nova peça com nome, preço, descrição e foto.";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "add-card-button";
    button.id = "adminAddProductButton";
    button.textContent = "Novo produto";

    inner.appendChild(icon);
    inner.appendChild(textMain);
    inner.appendChild(textSub);
    inner.appendChild(button);
    card.appendChild(inner);

    button.addEventListener("click", (event) => {
      event.preventDefault();
      startAddProductFlow();
    });

    card.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("button")) return;
      startAddProductFlow();
    });

    return card;
  }

  async function loadProductsAdmin() {
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) throw new Error("Erro ao carregar produtos");
      const products = await res.json();
      allProducts = Array.isArray(products) ? products : [];
      renderProductsTable(allProducts);
      renderProductsGrid(allProducts);
    } catch (err) {
      console.error(err);
      setProductFormStatus("Não foi possível carregar os produtos.", "error");
    }
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
        const message =
          body && body.error
            ? body.error
            : "Não foi possível criar o produto.";
        throw new Error(message);
      }

      await res.json();
      setProductFormStatus("Produto criado com sucesso.", "ok");
      clearProductForm();
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
        const message =
          body && body.error
            ? body.error
            : "Não foi possível atualizar o produto.";
        throw new Error(message);
      }

      await res.json();
      setProductFormStatus("Produto atualizado com sucesso.", "ok");
      clearProductForm();
      await loadProductsAdmin();
    } catch (err) {
      console.error(err);
      setProductFormStatus(err.message, "error");
    }
  }

  async function deactivateProduct(id) {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message =
          body && body.error
            ? body.error
            : "Não foi possível desativar o produto.";
        throw new Error(message);
      }

      await res.json();
      setProductFormStatus("Produto desativado.", "ok");
      await loadProductsAdmin();
    } catch (err) {
      console.error(err);
      setProductFormStatus(err.message, "error");
    }
  }

  async function activateProduct(id) {
    try {
      const found = allProducts.find((p) => p.id === id);
      if (!found) {
        throw new Error("Produto não encontrado.");
      }

      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message =
          body && body.error
            ? body.error
            : "Não foi possível ativar o produto.";
        throw new Error(message);
      }

      await res.json();
      setProductFormStatus("Produto ativado.", "ok");
      await loadProductsAdmin();
    } catch (err) {
      console.error(err);
      setProductFormStatus(err.message, "error");
    }
  }

  function startAddProductFlow() {
    clearProductForm();
    setProductFormStatus(
      'Preencha os dados do novo produto e clique em "Adicionar produto".',
      "ok"
    );
    if (productForm) {
      productForm.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (productNameEl) {
      productNameEl.focus();
    }
  }

  function handleProductAction(action, id) {
    if (!action || !id) return;

    if (action === "edit") {
      const product = allProducts.find((p) => p.id === id);
      if (!product) {
        setProductFormStatus("Produto não encontrado para edição.", "error");
        return;
      }
      fillProductForm(product);
      setProductFormStatus(
        "Editando produto. Salve para aplicar as alterações.",
        "ok"
      );
      if (productForm) {
        productForm.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (productNameEl) {
        productNameEl.focus();
      }
    } else if (action === "deactivate") {
      const confirmMsg =
        "Tem certeza de que deseja desativar este produto? Ele não aparecerá mais na loja.";
      if (window.confirm(confirmMsg)) {
        deactivateProduct(id);
      }
    } else if (action === "activate") {
      activateProduct(id);
    }
  }

  function startAdminSession(username) {
    const info = VALID_USERS[username];
    if (!info) return;

    try {
      sessionStorage.setItem(
        "darahAdminUser",
        JSON.stringify({ username: username })
      );
    } catch (err) {
      // storage can fail silently
    }

    if (loginSection) {
      loginSection.style.display = "none";
    }

    if (loadingSection) {
      if (welcomeMessageEl) {
        welcomeMessageEl.textContent = info.welcome;
      }

      // restart loading circle animation by cloning the fill element
      const fill = loadingSection.querySelector(".loading-circle-fill");
      if (fill && fill.parentElement) {
        const clone = fill.cloneNode(true);
        fill.parentElement.replaceChild(clone, fill);
      }

      loadingSection.style.display = "flex";

      setTimeout(() => {
        loadingSection.style.display = "none";
        if (panelSection) {
          panelSection.style.display = "block";
        }
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

  // Events and handlers

  if (saveHomepageBtn) {
    saveHomepageBtn.addEventListener("click", (event) => {
      event.preventDefault();
      setHomepageStatus("Salvando...", "");
      saveHomepage();
    });
  }

  // Homepage image picker
  if (heroImagesFileButton && heroImagesFileInput && heroImagesEl) {
    heroImagesFileButton.addEventListener("click", () => {
      heroImagesFileInput.click();
    });

    heroImagesFileInput.addEventListener("change", async () => {
      const files = Array.from(heroImagesFileInput.files || []);
      if (!files.length) return;

      try {
        setHomepageStatus("Carregando imagens selecionadas...", "");
        const urls = [];
        for (const file of files) {
          const url = await fileToDataUrl(file);
          urls.push(url);
        }

        const existingLines = heroImagesEl.value
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        heroImagesEl.value = [...existingLines, ...urls].join("\n");
        setHomepageStatus(
          'Imagens adicionadas. Clique em "Salvar página inicial" para aplicar.',
          "ok"
        );
      } catch (err) {
        console.error(err);
        setHomepageStatus(
          "Não foi possível processar as imagens selecionadas.",
          "error"
        );
      } finally {
        heroImagesFileInput.value = "";
      }
    });
  }

  // Product image picker
  if (productImageFileButton && productImageFileInput && productImageUrlEl) {
    productImageFileButton.addEventListener("click", () => {
      productImageFileInput.click();
    });

    productImageFileInput.addEventListener("change", async () => {
      const file = productImageFileInput.files
        ? productImageFileInput.files[0]
        : null;
      if (!file) return;

      try {
        setProductFormStatus("Carregando imagem selecionada...", "");
        const url = await fileToDataUrl(file);
        productImageUrlEl.value = url;
        setProductFormStatus(
          "Imagem adicionada. Preencha os dados e salve.",
          "ok"
        );
      } catch (err) {
        console.error(err);
        setProductFormStatus(
          "Não foi possível processar a imagem selecionada.",
          "error"
        );
      } finally {
        productImageFileInput.value = "";
      }
    });
  }

  if (productForm) {
    productForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const category = productCategoryEl.value;
      const name = productNameEl.value.trim();
      const description = productDescriptionEl.value.trim();
      const price = parseFloat(productPriceEl.value);
      const stock = parseInt(productStockEl.value, 10);
      const imageUrl = productImageUrlEl.value.trim();

      if (!name || Number.isNaN(price) || Number.isNaN(stock)) {
        setProductFormStatus(
          "Preencha pelo menos nome, preço e quantidade em estoque.",
          "error"
        );
        return;
      }

      const payload = {
        category,
        name,
        description,
        price,
        stock,
        imageUrl
      };

      if (editingProductId) {
        updateProduct(editingProductId, payload);
      } else {
        createProduct(payload);
      }
    });
  }

  if (productsTableBody) {
    productsTableBody.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("button");
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;
      handleProductAction(action, id);
    });
  }

  if (adminProductGrid) {
    adminProductGrid.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("button");
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!action || !id) return;

      handleProductAction(action, id);
    });
  }

  if (adminAddProductButton) {
    adminAddProductButton.addEventListener("click", (event) => {
      event.preventDefault();
      startAddProductFlow();
    });
  }

  if (adminAddProductCard) {
    adminAddProductCard.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("button")) return;
      startAddProductFlow();
    });
  }

  if (adminYearEl) {
    adminYearEl.textContent = String(new Date().getFullYear());
  }

  // Login events
  if (loginButton) {
    loginButton.addEventListener("click", (event) => {
      event.preventDefault();
      handleLoginSubmit();
    });
  }

  if (usernameInput) {
    usernameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleLoginSubmit();
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleLoginSubmit();
      }
    });
  }

  // Restore existing admin session if present
  let restoredUser = null;
  try {
    const stored = sessionStorage.getItem("darahAdminUser");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.username && VALID_USERS[parsed.username]) {
        restoredUser = parsed.username;
      }
    }
  } catch (err) {
    // ignore storage errors
  }

  if (restoredUser && panelSection) {
    if (loginSection) {
      loginSection.style.display = "none";
    }
    if (loadingSection) {
      loadingSection.style.display = "none";
    }
    panelSection.style.display = "block";

    const info = VALID_USERS[restoredUser];
    if (welcomeMessageEl && info) {
      welcomeMessageEl.textContent = info.welcome;
    }

    loadHomepageAdmin();
    loadProductsAdmin();
  } else {
    if (panelSection) {
      panelSection.style.display = "none";
    }
    if (loadingSection) {
      loadingSection.style.display = "none";
    }
    if (loginSection) {
      loginSection.style.display = "block";
    }
  }
});
