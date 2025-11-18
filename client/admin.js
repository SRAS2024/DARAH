"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const aboutTextEl = document.getElementById("adminAboutText");
  const heroImagesEl = document.getElementById("adminHeroImages");
  const saveHomepageBtn = document.getElementById("saveHomepageBtn");
  const homepageStatusEl = document.getElementById("adminHomepageStatus");

  const productForm = document.getElementById("productForm");
  const productCategoryEl = document.getElementById("productCategory");
  const productNameEl = document.getElementById("productName");
  const productDescriptionEl = document.getElementById("productDescription");
  const productPriceEl = document.getElementById("productPrice");
  const productStockEl = document.getElementById("productStock");
  const productImageUrlEl = document.getElementById("productImageUrl");
  const productFormStatusEl = document.getElementById("adminProductFormStatus");
  const productsTableBody = document.getElementById("adminProductsTableBody");
  const adminYearEl = document.getElementById("adminYear");

  let allProducts = [];
  let editingProductId = null;

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
    editingProductId = null;
    const submitBtn = productForm.querySelector("button[type=submit]");
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
    const submitBtn = productForm.querySelector("button[type=submit]");
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

  async function loadProductsAdmin() {
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) throw new Error("Erro ao carregar produtos");
      const products = await res.json();
      allProducts = Array.isArray(products) ? products : [];
      renderProductsTable(allProducts);
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

  // Events

  if (saveHomepageBtn) {
    saveHomepageBtn.addEventListener("click", (event) => {
      event.preventDefault();
      setHomepageStatus("Salvando...", "");
      saveHomepage();
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
      } else if (action === "deactivate") {
        const confirmMsg =
          "Tem certeza de que deseja desativar este produto? Ele não aparecerá mais na loja.";
        if (window.confirm(confirmMsg)) {
          deactivateProduct(id);
        }
      } else if (action === "activate") {
        activateProduct(id);
      }
    });
  }

  if (adminYearEl) {
    adminYearEl.textContent = String(new Date().getFullYear());
  }

  // Initial load
  loadHomepageAdmin();
  loadProductsAdmin();
});
