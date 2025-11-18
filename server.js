const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const { randomUUID } = require("crypto");

const app = express();

// Data file path
const DATA_FILE = path.join(__dirname, "data.json");

// Load or initialize data
function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    const initial = {
      homepage: {
        aboutText:
          "DARAH é uma joalheria dedicada a peças elegantes e atemporais, criadas para acompanhar você em todos os momentos especiais.",
        heroImages: [] // can be filled with image paths by the admin
      },
      products: [] // will hold all products across all categories
    };
    saveData(initial);
    return initial;
  }
}

function saveData(dataToSave) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2), "utf8");
}

let data = loadData();

// Express middlewares
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "darah_session_secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

// Serve static client files
const clientPath = path.join(__dirname, "client");
app.use(express.static(clientPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(clientPath, "admin.html"));
});

// Helpers for products and cart
function getActiveProductById(id) {
  return data.products.find(
    (p) => p.id === id && p.active !== false && p.stock > 0
  );
}

function getProductByIdAnyStatus(id) {
  return data.products.find((p) => p.id === id);
}

function ensureCart(req) {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  return req.session.cart;
}

function formatBRL(value) {
  return "R$ " + Number(value).toFixed(2).replace(".", ",");
}

function buildCartResponse(req) {
  const cart = ensureCart(req);
  const items = [];
  let subtotal = 0;

  for (const item of cart) {
    const product = getProductByIdAnyStatus(item.productId);
    if (!product || product.active === false || product.stock <= 0) {
      continue;
    }

    let quantity = item.quantity;
    if (quantity > product.stock) {
      quantity = product.stock;
      item.quantity = quantity;
    }
    if (quantity <= 0) {
      continue;
    }

    const lineTotal = product.price * quantity;
    subtotal += lineTotal;

    items.push({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      quantity,
      lineTotal,
      imageUrl: product.imageUrl || ""
    });
  }

  const taxes = 0;
  const total = subtotal + taxes;

  return {
    items,
    subtotal,
    taxes,
    total
  };
}

// Homepage content routes
app.get("/api/homepage", (req, res) => {
  res.json(data.homepage);
});

app.put("/api/homepage", (req, res) => {
  const { aboutText, heroImages } = req.body;

  if (typeof aboutText === "string") {
    data.homepage.aboutText = aboutText;
  }
  if (Array.isArray(heroImages)) {
    data.homepage.heroImages = heroImages;
  }

  saveData(data);
  res.json(data.homepage);
});

// Products routes
function groupPublicProducts() {
  const grouped = {
    rings: [],
    necklaces: [],
    bracelets: [],
    earrings: []
  };

  for (const product of data.products) {
    if (product.active === false || product.stock <= 0) continue;
    if (!grouped[product.category]) continue;
    grouped[product.category].push(product);
  }

  return grouped;
}

// Public products
app.get("/api/products", (req, res) => {
  res.json(groupPublicProducts());
});

// Admin view of all products
app.get("/api/admin/products", (req, res) => {
  res.json(data.products);
});

// Admin create product
app.post("/api/products", (req, res) => {
  const { category, name, description, price, stock, imageUrl } = req.body;

  const allowedCategories = ["rings", "necklaces", "bracelets", "earrings"];
  if (!allowedCategories.includes(category)) {
    return res.status(400).json({ error: "Categoria inválida" });
  }
  if (!name || typeof price !== "number" || typeof stock !== "number") {
    return res
      .status(400)
      .json({ error: "Nome, preço e quantidade em estoque são obrigatórios" });
  }

  const product = {
    id: randomUUID(),
    category,
    name,
    description: description || "",
    price,
    stock,
    imageUrl: imageUrl || "",
    active: true
  };

  data.products.push(product);
  saveData(data);
  res.status(201).json(product);
});

// Admin update product
app.put("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const product = getProductByIdAnyStatus(id);
  if (!product) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }

  const allowedCategories = ["rings", "necklaces", "bracelets", "earrings"];
  const { category, name, description, price, stock, imageUrl, active } =
    req.body;

  if (category && !allowedCategories.includes(category)) {
    return res.status(400).json({ error: "Categoria inválida" });
  }

  if (category) product.category = category;
  if (typeof name === "string") product.name = name;
  if (typeof description === "string") product.description = description;
  if (typeof price === "number") product.price = price;
  if (typeof stock === "number") product.stock = stock;
  if (typeof imageUrl === "string") product.imageUrl = imageUrl;
  if (typeof active === "boolean") product.active = active;

  saveData(data);
  res.json(product);
});

// Admin delete or deactivate product
app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const product = getProductByIdAnyStatus(id);
  if (!product) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }

  product.active = false;
  saveData(data);
  res.json({ success: true });
});

// Cart routes
app.get("/api/cart", (req, res) => {
  const cartData = buildCartResponse(req);
  res.json(cartData);
});

app.post("/api/cart/add", (req, res) => {
  const { productId } = req.body;
  const product = getActiveProductById(productId);

  if (!product) {
    return res.status(404).json({ error: "Produto não disponível" });
  }

  const cart = ensureCart(req);
  const item = cart.find((c) => c.productId === productId);

  const currentQty = item ? item.quantity : 0;
  if (currentQty + 1 > product.stock) {
    return res
      .status(400)
      .json({ error: "Quantidade solicitada maior que o estoque disponível" });
  }

  if (item) {
    item.quantity += 1;
  } else {
    cart.push({ productId, quantity: 1 });
  }

  const cartData = buildCartResponse(req);
  res.json(cartData);
});

app.post("/api/cart/update", (req, res) => {
  const { productId, quantity } = req.body;
  const product = getProductByIdAnyStatus(productId);

  if (!product || product.active === false) {
    return res.status(404).json({ error: "Produto não disponível" });
  }

  const cart = ensureCart(req);
  const item = cart.find((c) => c.productId === productId);

  if (!item) {
    return res.status(404).json({ error: "Item não encontrado no carrinho" });
  }

  const qty = Number(quantity);
  if (Number.isNaN(qty) || qty < 0) {
    return res.status(400).json({ error: "Quantidade inválida" });
  }

  if (qty === 0) {
    req.session.cart = cart.filter((c) => c.productId !== productId);
  } else if (qty > product.stock) {
    return res
      .status(400)
      .json({ error: "Quantidade solicitada maior que o estoque disponível" });
  } else {
    item.quantity = qty;
  }

  const cartData = buildCartResponse(req);
  res.json(cartData);
});

app.post("/api/cart/clear", (req, res) => {
  req.session.cart = [];
  res.json({ success: true });
});

// WhatsApp checkout
app.post("/api/checkout-link", (req, res) => {
  const cartData = buildCartResponse(req);

  if (!cartData.items.length) {
    return res
      .status(400)
      .json({ error: "O carrinho está vazio. Adicione itens antes de finalizar." });
  }

  const lines = [];
  lines.push("Olá, eu gostaria de fazer um pedido dos seguintes itens:");

  for (const item of cartData.items) {
    lines.push(`• ${item.name} (${item.category})`);
    lines.push(`  Quantidade: ${item.quantity}`);
    lines.push(`  Preço unitário: ${formatBRL(item.price)}`);
    lines.push(`  Total do item: ${formatBRL(item.lineTotal)}`);
  }

  lines.push("");
  lines.push(`Valor total do pedido: ${formatBRL(cartData.total)}`);
  lines.push("");
  lines.push(
    "Por favor, poderia confirmar a disponibilidade e me informar as opções de entrega e pagamento?"
  );

  const message = encodeURIComponent(lines.join("\n"));

  // WhatsApp number: +55 65 99988 3400
  const whatsappNumber = "5565999883400";
  const url = `https://wa.me/${whatsappNumber}?text=${message}`;

  res.json({ url });
});

// Fallback route for unknown api paths
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Rota não encontrada" });
  }
  next();
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
