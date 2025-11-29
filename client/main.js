"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // Navigation and common UI
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const cartButton = document.getElementById("cartButton");
  const cartCountEl = document.getElementById("cartCount");
  const yearEl = document.getElementById("year");
  const checkoutButton = document.getElementById("checkoutButton");
  const rootEl = document.documentElement;

  // Views mirror
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

  // Homepage elements
  const aboutTextEl = document.getElementById("aboutText");
  const heroImagesEl = document.getElementById("heroImages");
  const heroEl =
    document.querySelector("#view-home .hero") || document.querySelector(".hero");
  const siteNoticesEl = document.getElementById("siteNotices");
  const siteNoticesListEl = document.getElementById("siteNoticesList");

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

  function applyThemeVariant(theme) {
    const variant = theme === "natal" ? "natal" : "default";
    if (rootEl) {
      rootEl.setAttribute("data-theme-variant", variant);
    }
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

    // Lazy loads when we switch to checkout
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
    const list = Array.isArray(notices) ? notices.filter((n) => n && n.trim().length) : [];
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

    const imgs = Array.isArray(srcs)
      ? srcs
          .map((s) => String(s || "").trim())
          .filter((s) => s.length)
      : [];

    if (!imgs.length) {
      // No images: hide collage and let hero become single column
      heroImagesEl.style.display = "none";
      if (heroEl) heroEl.classList.add("hero-no-images");
      return;
    }

    // There are images: show collage and ensure hero uses two columns
    heroImagesEl.style.display = "grid";
    if (heroEl) heroEl.classList.remove("hero-no-images");

    imgs.slice(0, 12).forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Joia DARAH";
      heroImagesEl.appendChild(img);
    });
  }

  async function loadHomepage() {
    try {
      const res = await fetch("/api/homepage");
      if (!res.ok) throw new Error("Erro ao carregar conteúdo da página inicial");
      const hp = await res.json();

      if (aboutTextEl && typeof hp.aboutText === "string") {
        aboutTextEl.textContent = hp.aboutText;
      }
      if (hp && typeof hp.theme === "string") {
        applyThemeVariant(hp.theme);
      } else {
        applyThemeVariant("default");
      }
      renderHeroImages(hp.heroImages);
      renderNotices(hp.notices);
    } catch (err) {
      console.error(err);
      // Soft fallback placeholders to keep layout stable
      applyThemeVariant("default");
      renderHeroImages([]);
      renderNotices([]);
      if (aboutTextEl) aboutTextEl.textContent = "";
    }
  }

  // =========================
  // Products and categories
  // =========================
  function renderProductList(containerId, products) {
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
      if (product.imageUrl) {
        const img = document.createElement("img");
        img.src = product.imageUrl;
        img.alt = product.name || "Produto DARAH";
        imageWrapper.appendChild(img);
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

      const priceEl = document.createElement("span");
      priceEl.className = "product-price";
      priceEl.textContent = formatBRL(product.price);

      const stockEl = document.createElement("span");
      stockEl.className = "product-stock";
      stockEl.textContent =
        typeof product.stock === "number" ? "Estoque: " + product.stock : "";

      metaLine.appendChild(priceEl);
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

  async function loadProducts() {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Erro ao carregar produtos");
      const grouped = await res.json();

      // New categories
      renderProductList("specialsList", grouped.specials || []);
      renderProductList("setsList", grouped.sets || []);

      // Existing categories
      renderProductList("ringsList", grouped.rings || []);
      renderProductList("necklacesList", grouped.necklaces || []);
      renderProductList("braceletsList", grouped.bracelets || []);
      renderProductList("earringsList", grouped.earrings || []);
    } catch (err) {
      console.error(err);
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
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) throw new Error("Erro ao carregar carrinho");
      const cartData = await res.json();
      renderCart(cartData);
      updateCartCountFromCartData(cartData);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar o carrinho.");
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
  // Events
  // =========================
  navLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.view;
      if (!key) return;
      setActiveView(key);
      if (key === "home") {
        loadHomepage();
      }
    });
  });

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
  // Honor any initial theme set in HTML but let backend override when homepage loads
  const initialVariant = rootEl ? rootEl.getAttribute("data-theme-variant") : null;
  applyThemeVariant(initialVariant || "default");

  setActiveView("home");
  loadHomepage();
  loadProducts();
  refreshCartCount();
});
