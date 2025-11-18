"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const cartButton = document.getElementById("cartButton");
  const cartCountEl = document.getElementById("cartCount");
  const yearEl = document.getElementById("year");
  const checkoutButton = document.getElementById("checkoutButton");

  const views = {
    home: document.getElementById("view-home"),
    rings: document.getElementById("view-rings"),
    necklaces: document.getElementById("view-necklaces"),
    bracelets: document.getElementById("view-bracelets"),
    earrings: document.getElementById("view-earrings"),
    checkout: document.getElementById("view-checkout")
  };

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

  function setActiveView(viewName) {
    Object.entries(views).forEach(([name, el]) => {
      if (!el) return;
      if (name === viewName) {
        el.classList.add("active-view");
      } else {
        el.classList.remove("active-view");
      }
    });

    navLinks.forEach((btn) => {
      if (btn.dataset.view === viewName.replace("view-", "")) {
        btn.classList.add("active");
      } else if (viewName === "checkout") {
        // When viewing checkout, highlight nothing in the main nav list
        btn.classList.remove("active");
      } else {
        btn.classList.toggle(
          "active",
          btn.dataset.view === viewName
        );
      }
    });
  }

  function updateCartCountFromCartData(cartData) {
    if (!cartData || !Array.isArray(cartData.items)) {
      cartCountEl.textContent = "0";
      return;
    }
    const totalItems = cartData.items.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );
    cartCountEl.textContent = String(totalItems);
  }

  async function refreshCartCount() {
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) throw new Error("Erro ao buscar carrinho");
      const cartData = await res.json();
      updateCartCountFromCartData(cartData);
    } catch (err) {
      console.error(err);
      cartCountEl.textContent = "0";
    }
  }

  async function loadHomepage() {
    try {
      const res = await fetch("/api/homepage");
      if (!res.ok) throw new Error("Erro ao carregar conteúdo da página inicial");
      const hp = await res.json();

      const aboutTextEl = document.getElementById("aboutText");
      if (aboutTextEl && typeof hp.aboutText === "string") {
        aboutTextEl.textContent = hp.aboutText;
      }

      const heroImagesEl = document.getElementById("heroImages");
      if (heroImagesEl) {
        heroImagesEl.innerHTML = "";
        if (Array.isArray(hp.heroImages) && hp.heroImages.length > 0) {
          hp.heroImages.forEach((src) => {
            const img = document.createElement("img");
            img.src = src;
            img.alt = "Joia DARAH";
            heroImagesEl.appendChild(img);
          });
        } else {
          // Simple placeholders if no images are set yet
          for (let i = 0; i < 4; i += 1) {
            const placeholder = document.createElement("div");
            placeholder.style.borderRadius = "14px";
            placeholder.style.background =
              i % 2 === 0 ? "#d3e0c4" : "#e6dfd2";
            heroImagesEl.appendChild(placeholder);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  function renderProductList(containerId, products) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    if (!Array.isArray(products) || products.length === 0) {
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

      const nameEl = document.createElement("h3");
      nameEl.className = "product-name";
      nameEl.textContent = product.name || "Produto";

      const descEl = document.createElement("p");
      descEl.className = "product-description";
      descEl.textContent =
        product.description || "Joia exclusiva DARAH.";

      const meta = document.createElement("div");
      meta.className = "product-meta";

      const priceEl = document.createElement("span");
      priceEl.className = "product-price";
      priceEl.textContent = formatBRL(product.price);

      const stockEl = document.createElement("span");
      stockEl.className = "product-stock";
      stockEl.textContent =
        typeof product.stock === "number"
          ? `Qtd. em estoque: ${product.stock}`
          : "";

      meta.appendChild(priceEl);
      meta.appendChild(stockEl);

      const button = document.createElement("button");
      button.className = "primary-button";
      button.textContent = "Adicionar ao carrinho";

      const available =
        typeof product.stock === "number" && product.stock > 0;

      if (!available) {
        button.disabled = true;
        button.textContent = "Esgotado";
      } else {
        button.addEventListener("click", () => {
          addToCart(product.id);
        });
      }

      content.appendChild(nameEl);
      content.appendChild(descEl);
      content.appendChild(meta);
      content.appendChild(button);

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
        const errorBody = await res.json().catch(() => null);
        const message =
          errorBody && errorBody.error
            ? errorBody.error
            : "Não foi possível adicionar o produto ao carrinho.";
        alert(message);
        return;
      }

      const cartData = await res.json();
      updateCartCountFromCartData(cartData);
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar produto ao carrinho.");
    }
  }

  function renderCart(cartData) {
    const itemsContainer = document.getElementById("checkoutItems");
    const subtotalEl = document.getElementById("summarySubtotal");
    const taxesEl = document.getElementById("summaryTaxes");
    const totalEl = document.getElementById("summaryTotal");

    if (!itemsContainer) return;

    itemsContainer.innerHTML = "";

    if (!cartData || !Array.isArray(cartData.items) || cartData.items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "checkout-empty";
      empty.textContent = "Seu carrinho está vazio no momento.";
      itemsContainer.appendChild(empty);
      if (subtotalEl) subtotalEl.textContent = "R$ 0,00";
      if (taxesEl) taxesEl.textContent = "R$ 0,00";
      if (totalEl) totalEl.textContent = "R$ 0,00";
      if (checkoutButton) checkoutButton.disabled = true;
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
      const unitPrice = formatBRL(item.price);
      unitEl.textContent = `${unitPrice} por unidade`;

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
        const errorBody = await res.json().catch(() => null);
        const message =
          errorBody && errorBody.error
            ? errorBody.error
            : "Não foi possível atualizar a quantidade do item.";
        alert(message);
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
        const errorBody = await res.json().catch(() => null);
        const message =
          errorBody && errorBody.error
            ? errorBody.error
            : "Não foi possível gerar o link de checkout.";
        alert(message);
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

  // Navigation events
  navLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      if (!view) return;
      if (view === "home") {
        setActiveView("home");
      } else {
        setActiveView(view);
      }
    });
  });

  if (cartButton) {
    cartButton.addEventListener("click", () => {
      setActiveView("checkout");
      loadCartView();
    });
  }

  if (checkoutButton) {
    checkoutButton.addEventListener("click", handleCheckout);
  }

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // Initial load
  setActiveView("home");
  loadHomepage();
  loadProducts();
  refreshCartCount();
});
