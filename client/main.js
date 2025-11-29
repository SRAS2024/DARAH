"use strict";

/**
 * DARAH · Vitrine
 * Controla as abas públicas, homepage, produtos, carrinho e checkout.
 */

document.addEventListener("DOMContentLoaded", () => {
  const MAX_HOMEPAGE_IMAGES = 12;
  const MAX_PRODUCT_IMAGES = 25;

  // Navegação principal
  const navLinks = Array.from(document.querySelectorAll(".main-nav .nav-link"));

  const views = {
    home: document.getElementById("view-home"),
    specials: document.getElementById("view-specials"),
    sets: document.getElementById("view-sets"),
    rings: document.getElementById("view-rings"),
    necklaces: document.getElementById("view-necklaces"),
    bracelets: document.getElementById("view-bracelets"),
    earrings: document.getElementById("view-earrings"),
    checkout: document.getElementById("view-checkout")
  };

  // Elementos de topo e rodapé
  const cartButton = document.getElementById("cartButton");
  const cartCountEl = document.getElementById("cartCount");
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // Homepage
  const heroImagesEl = document.getElementById("heroImages");
  const aboutTextEl = document.getElementById("aboutText");
  const noticesSection = document.getElementById("siteNotices");
  const noticesListEl = document.getElementById("siteNoticesList");

  // Listas de produtos por aba
  const specialsListEl = document.getElementById("specialsList");
  const setsListEl = document.getElementById("setsList");
  const ringsListEl = document.getElementById("ringsList");
  const necklacesListEl = document.getElementById("necklacesList");
  const braceletsListEl = document.getElementById("braceletsList");
  const earringsListEl = document.getElementById("earringsList");

  // Checkout
  const checkoutItemsEl = document.getElementById("checkoutItems");
  const summarySubtotalEl = document.getElementById("summarySubtotal");
  const summaryTaxesEl = document.getElementById("summaryTaxes");
  const summaryTotalEl = document.getElementById("summaryTotal");
  const checkoutButton = document.getElementById("checkoutButton");

  // Estado em memória
  let productsByCategory = {
    specials: [],
    sets: [],
    rings: [],
    necklaces: [],
    bracelets: [],
    earrings: []
  };

  let cartSummary = {
    items: [],
    subtotal: 0,
    taxes: 0,
    total: 0
  };

  // Utilidades
  function formatBRL(value) {
    if (value == null || Number.isNaN(Number(value))) {
      return "R$ 0,00";
    }
    try {
      return Number(value).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      });
    } catch {
      return (
        "R$ " +
        Number(value || 0)
          .toFixed(2)
          .replace(".", ",")
      );
    }
  }

  function applyThemeVariant(variant) {
    const root = document.documentElement;
    const value = variant === "natal" ? "natal" : "default";
    if (root) {
      root.dataset.themeVariant = value;
    }
  }

  function switchView(id) {
    Object.entries(views).forEach(([key, el]) => {
      if (!el) return;
      if (key === id) {
        el.classList.add("active-view");
      } else {
        el.classList.remove("active-view");
      }
    });

    navLinks.forEach((btn) => {
      const target = btn.dataset.view;
      btn.classList.toggle("active", target === id);
    });
  }

  navLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.view;
      if (!id) return;
      if (id === "checkout") {
        renderCheckout();
      }
      switchView(id);
    });
  });

  if (cartButton) {
    cartButton.addEventListener("click", () => {
      renderCheckout();
      switchView("checkout");
    });
  }

  function normalizeList(list, max) {
    if (!Array.isArray(list)) return [];
    return list
      .map((u) => String(u || "").trim())
      .filter((u, index, arr) => u && arr.indexOf(u) === index)
      .slice(0, max);
  }

  // ===================================
  // Homepage
  // ===================================
  async function loadHomepage() {
    try {
      const res = await fetch("/api/homepage");
      if (!res.ok) throw new Error("Erro ao carregar homepage");
      const data = await res.json();

      const aboutText =
        typeof data.aboutText === "string" ? data.aboutText : "";

      const heroImages = normalizeList(
        Array.isArray(data.heroImages) ? data.heroImages : [],
        MAX_HOMEPAGE_IMAGES
      );

      const notices = normalizeList(
        Array.isArray(data.notices) ? data.notices : [],
        10
      );

      const theme =
        typeof data.theme === "string" && data.theme.length
          ? data.theme
          : "default";

      if (aboutTextEl) {
        aboutTextEl.textContent = aboutText;
      }
      renderHeroImages(heroImages);
      renderNotices(notices);
      applyThemeVariant(theme);
    } catch (err) {
      console.error("[homepage] Falha ao carregar homepage", err);
      if (aboutTextEl && !aboutTextEl.textContent) {
        aboutTextEl.textContent =
          "DARAH é uma joalheria dedicada a peças elegantes e atemporais.";
      }
    }
  }

  function renderHeroImages(urls) {
    if (!heroImagesEl) return;

    heroImagesEl.innerHTML = "";
    const wrapperSection = document.getElementById("view-home");
    if (wrapperSection) {
      if (!urls || !urls.length) {
        wrapperSection.classList.add("hero-no-images");
      } else {
        wrapperSection.classList.remove("hero-no-images");
      }
    }

    if (!urls || !urls.length) {
      const placeholder = document.createElement("div");
      placeholder.style.borderRadius = "20px";
      placeholder.style.background = "#dcdcdc";
      placeholder.style.height = "220px";
      placeholder.style.width = "100%";
      heroImagesEl.appendChild(placeholder);
      return;
    }

    const fragment = document.createDocumentFragment();

    urls.forEach((src) => {
      if (!src || typeof src !== "string") return;
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Imagem da coleção DARAH";
      img.loading = "lazy";
      fragment.appendChild(img);
    });

    heroImagesEl.appendChild(fragment);
  }

  function renderNotices(notices) {
    if (!noticesSection || !noticesListEl) return;

    noticesListEl.innerHTML = "";

    if (!notices || !notices.length) {
      noticesSection.style.display = "none";
      return;
    }

    noticesSection.style.display = "block";

    const list = document.createElement("ul");
    list.style.paddingLeft = "1.2rem";
    list.style.margin = "0";

    notices.forEach((text) => {
      const value = String(text || "").trim();
      if (!value) return;
      const li = document.createElement("li");
      li.textContent = value;
      list.appendChild(li);
    });

    noticesListEl.appendChild(list);
  }

  // ===================================
  // Produtos
  // ===================================
  async function loadProducts() {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Erro ao carregar produtos");
      const data = await res.json();

      productsByCategory = {
        specials: Array.isArray(data.specials) ? data.specials : [],
        sets: Array.isArray(data.sets) ? data.sets : [],
        rings: Array.isArray(data.rings) ? data.rings : [],
        necklaces: Array.isArray(data.necklaces) ? data.necklaces : [],
        bracelets: Array.isArray(data.bracelets) ? data.bracelets : [],
        earrings: Array.isArray(data.earrings) ? data.earrings : []
      };

      renderAllProductGrids();
    } catch (err) {
      console.error("[products] Falha ao carregar produtos", err);
    }
  }

  function renderAllProductGrids() {
    renderCategoryGrid("specials", specialsListEl);
    renderCategoryGrid("sets", setsListEl);
    renderCategoryGrid("rings", ringsListEl);
    renderCategoryGrid("necklaces", necklacesListEl);
    renderCategoryGrid("bracelets", braceletsListEl);
    renderCategoryGrid("earrings", earringsListEl);
  }

  function renderCategoryGrid(categoryKey, container) {
    if (!container) return;
    container.innerHTML = "";

    const items = Array.isArray(productsByCategory[categoryKey])
      ? productsByCategory[categoryKey]
      : [];

    if (!items.length) {
      const p = document.createElement("p");
      p.className = "home-highlight-text";
      p.textContent = "Ainda não há produtos nesta categoria.";
      container.appendChild(p);
      return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach((product) => {
      const card = createProductCard(product, categoryKey);
      if (card) fragment.appendChild(card);
    });

    container.appendChild(fragment);
  }

  function normalizeImageList(product) {
    const primary = typeof product.imageUrl === "string" ? product.imageUrl : "";

    const fromImageUrls = Array.isArray(product.imageUrls)
      ? product.imageUrls
      : [];
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

  function createProductCard(product, categoryKey) {
    const article = document.createElement("article");
    article.className = "product-card";
    article.dataset.productId = product.id || "";

    // Bloco de imagem com suporte a várias fotos
    const imageWrapper = document.createElement("div");
    imageWrapper.className = "product-image-wrapper";

    const images = normalizeImageList(product);

    if (!images.length) {
      const img = document.createElement("img");
      img.alt = product.name || "Produto DARAH";
      img.loading = "lazy";
      imageWrapper.appendChild(img);
    } else if (images.length === 1) {
      const img = document.createElement("img");
      img.src = images[0];
      img.alt = product.name || "Produto DARAH";
      img.loading = "lazy";
      imageWrapper.appendChild(img);
    } else {
      const viewport = document.createElement("div");
      viewport.className = "product-image-viewport";

      const track = document.createElement("div");
      track.className = "product-image-track";

      images.forEach((src) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = product.name || "Produto DARAH";
        img.loading = "lazy";
        track.appendChild(img);
      });

      viewport.appendChild(track);
      imageWrapper.appendChild(viewport);

      const leftBtn = document.createElement("button");
      leftBtn.type = "button";
      leftBtn.className =
        "product-carousel-arrow product-carousel-arrow-left";
      leftBtn.textContent = "‹";

      const rightBtn = document.createElement("button");
      rightBtn.type = "button";
      rightBtn.className =
        "product-carousel-arrow product-carousel-arrow-right";
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

      imageWrapper.appendChild(leftBtn);
      imageWrapper.appendChild(rightBtn);
      imageWrapper.appendChild(indicator);

      updateCarousel();
    }

    article.appendChild(imageWrapper);

    // Corpo do card
    const body = document.createElement("div");
    body.className = "product-content";

    const title = document.createElement("h3");
    title.className = "product-name";
    title.textContent = product.name || "Produto";

    const desc = document.createElement("p");
    desc.className = "product-description";
    desc.textContent =
      product.description || "Peça da coleção DARAH, elegante e atemporal.";

    const metaRow = document.createElement("div");
    metaRow.className = "product-meta";

    const priceBlock = document.createElement("div");
    priceBlock.className = "product-price-block";

    const isSpecial =
      categoryKey === "specials" &&
      typeof product.originalPrice === "number" &&
      !Number.isNaN(product.originalPrice) &&
      product.originalPrice > 0 &&
      product.originalPrice > product.price;

    if (isSpecial) {
      const originalSpan = document.createElement("span");
      originalSpan.className = "product-price-original";
      originalSpan.textContent = formatBRL(product.originalPrice);

      const currentSpan = document.createElement("span");
      currentSpan.className = "product-price-current";
      currentSpan.textContent = formatBRL(product.price);

      priceBlock.appendChild(originalSpan);
      priceBlock.appendChild(currentSpan);
    } else {
      const priceSpan = document.createElement("span");
      priceSpan.className = "product-price";
      priceSpan.textContent = formatBRL(product.price);
      priceBlock.appendChild(priceSpan);
    }

    if (
      typeof product.discountLabel === "string" &&
      product.discountLabel.trim().length
    ) {
      const badge = document.createElement("span");
      badge.className = "product-discount-label";
      badge.textContent = product.discountLabel.trim();
      priceBlock.appendChild(badge);
    }

    const stockSpan = document.createElement("span");
    stockSpan.className = "product-stock";
    if (typeof product.stock === "number") {
      stockSpan.textContent = "Estoque: " + String(product.stock);
    } else {
      stockSpan.textContent = "Estoque: -";
    }

    metaRow.appendChild(priceBlock);
    metaRow.appendChild(stockSpan);

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "primary-button";
    addButton.textContent = "Adicionar ao carrinho";
    addButton.addEventListener("click", () => {
      if (!product.id) return;
      addToCart(product.id);
    });

    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(metaRow);
    body.appendChild(addButton);

    article.appendChild(body);

    return article;
  }

  // ===================================
  // Carrinho
  // ===================================
  async function loadCart() {
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) throw new Error("Erro ao carregar carrinho");
      const summary = await res.json();
      updateCartState(summary);
    } catch (err) {
      console.error("[cart] Falha ao carregar carrinho", err);
    }
  }

  function updateCartState(summary) {
    if (!summary || typeof summary !== "object") return;
    cartSummary = {
      items: Array.isArray(summary.items) ? summary.items : [],
      subtotal: Number(summary.subtotal || 0),
      taxes: Number(summary.taxes || 0),
      total: Number(summary.total || 0)
    };
    updateCartBadge();
    if (
      views.checkout &&
      views.checkout.classList.contains("active-view")
    ) {
      renderCheckout();
    }
  }

  function updateCartBadge() {
    if (!cartCountEl) return;
    const count = cartSummary.items.reduce(
      (sum, it) => sum + Number(it.quantity || 0),
      0
    );
    cartCountEl.textContent = String(count);
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
            : "Não foi possível adicionar ao carrinho.";
        window.alert(msg);
        return;
      }
      const summary = await res.json();
      updateCartState(summary);
    } catch (err) {
      console.error("[cart] Falha ao adicionar ao carrinho", err);
      window.alert("Não foi possível adicionar ao carrinho.");
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
            : "Não foi possível atualizar o carrinho.";
        window.alert(msg);
        return;
      }
      const summary = await res.json();
      updateCartState(summary);
    } catch (err) {
      console.error("[cart] Falha ao atualizar carrinho", err);
      window.alert("Não foi possível atualizar o carrinho.");
    }
  }

  function renderCheckout() {
    if (!checkoutItemsEl) return;

    checkoutItemsEl.innerHTML = "";

    if (!cartSummary.items.length) {
      const empty = document.createElement("div");
      empty.className = "checkout-empty";
      empty.textContent = "Seu carrinho está vazio.";
      checkoutItemsEl.appendChild(empty);
      if (checkoutButton) {
        checkoutButton.disabled = true;
      }
      if (summarySubtotalEl) summarySubtotalEl.textContent = formatBRL(0);
      if (summaryTaxesEl) summaryTaxesEl.textContent = formatBRL(0);
      if (summaryTotalEl) summaryTotalEl.textContent = formatBRL(0);
      return;
    }

    cartSummary.items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "checkout-item";

      const imageBox = document.createElement("div");
      imageBox.className = "checkout-item-image";

      if (item.imageUrl) {
        const img = document.createElement("img");
        img.src = item.imageUrl;
        img.alt = item.name || "Produto no carrinho";
        img.loading = "lazy";
        imageBox.appendChild(img);
      }

      const infoBox = document.createElement("div");
      infoBox.className = "checkout-item-info";

      const nameEl = document.createElement("div");
      nameEl.className = "checkout-item-name";
      nameEl.textContent = item.name || "Produto";

      const unitEl = document.createElement("div");
      unitEl.className = "checkout-item-unit";
      unitEl.textContent =
        String(item.quantity || 0) +
        " x " +
        formatBRL(item.price || 0) +
        " cada";

      const totalEl = document.createElement("div");
      totalEl.className = "checkout-item-total";
      totalEl.textContent = formatBRL(item.lineTotal || 0);

      infoBox.appendChild(nameEl);
      infoBox.appendChild(unitEl);
      infoBox.appendChild(totalEl);

      const controlsBox = document.createElement("div");
      controlsBox.className = "checkout-item-controls";

      const quantityRow = document.createElement("div");
      quantityRow.className = "quantity-controls";

      const minusBtn = document.createElement("button");
      minusBtn.type = "button";
      minusBtn.className = "quantity-button";
      minusBtn.textContent = "−";

      const qtyValue = document.createElement("span");
      qtyValue.className = "quantity-value";
      qtyValue.textContent = String(item.quantity || 0);

      const plusBtn = document.createElement("button");
      plusBtn.type = "button";
      plusBtn.className = "quantity-button";
      plusBtn.textContent = "+";

      minusBtn.addEventListener("click", () => {
        const current = Number(item.quantity || 0);
        const next = current - 1;
        if (next <= 0) {
          updateCartItem(item.id, 0);
        } else {
          updateCartItem(item.id, next);
        }
      });

      plusBtn.addEventListener("click", () => {
        const current = Number(item.quantity || 0);
        const next = current + 1;
        updateCartItem(item.id, next);
      });

      quantityRow.appendChild(minusBtn);
      quantityRow.appendChild(qtyValue);
      quantityRow.appendChild(plusBtn);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "admin-button-ghost";
      removeBtn.textContent = "Remover";
      removeBtn.style.fontSize = "11px";
      removeBtn.addEventListener("click", () => {
        updateCartItem(item.id, 0);
      });

      controlsBox.appendChild(quantityRow);
      controlsBox.appendChild(removeBtn);

      row.appendChild(imageBox);
      row.appendChild(infoBox);
      row.appendChild(controlsBox);

      checkoutItemsEl.appendChild(row);
    });

    if (summarySubtotalEl) {
      summarySubtotalEl.textContent = formatBRL(cartSummary.subtotal);
    }
    if (summaryTaxesEl) {
      summaryTaxesEl.textContent = formatBRL(cartSummary.taxes);
    }
    if (summaryTotalEl) {
      summaryTotalEl.textContent = formatBRL(cartSummary.total);
    }

    if (checkoutButton) {
      checkoutButton.disabled = cartSummary.items.length === 0;
    }
  }

  if (checkoutButton) {
    checkoutButton.addEventListener("click", async () => {
      if (checkoutButton.disabled) return;
      try {
        const res = await fetch("/api/checkout-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const msg =
            body && body.error
              ? body.error
              : "Não foi possível criar o link de checkout.";
          window.alert(msg);
          return;
        }
        const data = await res.json();
        if (data && data.url) {
          window.location.href = data.url;
        } else {
          window.alert("Link de checkout não retornado pela API.");
        }
      } catch (err) {
        console.error("[checkout] Falha ao gerar link de WhatsApp", err);
        window.alert("Não foi possível abrir o WhatsApp.");
      }
    });
  }

  // Inicialização
  switchView("home");
  loadHomepage();
  loadProducts();
  loadCart();
});
