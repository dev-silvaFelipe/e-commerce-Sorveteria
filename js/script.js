
const productsGrid = document.getElementById('products-grid');
const searchInput  = document.getElementById('search-input');
const cartBtn      = document.getElementById('cart-btn');
const cartBadge    = document.getElementById('cart-badge');
const cartOverlay  = document.getElementById('cart-overlay');
const cartDrawer   = document.getElementById('cart-drawer');
const cartClose    = document.getElementById('cart-close');
const cartItems    = document.getElementById('cart-items');
const cartTotal    = document.getElementById('cart-total');
const cartFooter   = document.getElementById('cart-footer');
const cartCheckout = document.getElementById('cart-checkout');
const toastEl      = document.getElementById('toast');
const toastMsg     = document.getElementById('toast-message');

let allProducts = [];

let cart = [];

async function loadProducts() {
  const productUrls = [
    new URL('./products.json', window.location.href).toString(),
    new URL('../products.json', window.location.href).toString(),
    new URL('/products.json', window.location.origin).toString()
  ];

  for (const url of productUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn(`Falha ao tentar carregar ${url}:`, error);
    }
  }

  throw new Error('Não foi possível acessar o arquivo products.json.');
}

async function initApp() {
  showSkeletons(6);

  try {
    allProducts = await loadProducts();
    renderProducts(allProducts);
  } catch (error) {
    console.error('Falha ao carregar produtos:', error);
    showEmptyState(
      '<i class="fa-solid fa-face-frown" aria-hidden="true"></i>',
      'Ops! Algo deu errado',
      'Não foi possível carregar os produtos. Tente recarregar a página.'
    );
  }

  loadCartFromStorage();
  updateCartUI();
}

function renderProducts(products) {
  productsGrid.innerHTML = '';

  if (products.length === 0) {
    showEmptyState(
      '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>',
      'Nenhum produto encontrado',
      'Tente buscar por outro nome ou categoria.'
    );
    return;
  }

  const fragment = document.createDocumentFragment();

  products.forEach((product, index) => {
    const card = createProductCard(product, index);
    fragment.appendChild(card);
  });

  productsGrid.appendChild(fragment);
}

function createProductCard(product, index) {
  const card = document.createElement('article');
  card.className = 'card';
  card.id = `product-${product.id}`;
  card.style.setProperty('--delay', `${index * 0.08}s`);

  const precoFormatado = product.preco.toFixed(2).replace('.', ',');

  card.innerHTML = `
    <div class="card__imagem-wrapper">
      <img
        class="card__imagem"
        src="${product.imagem}"
        alt="Foto de ${product.nome}"
        loading="lazy"
      />
      <span class="card__categoria">${product.categoria}</span>
    </div>
    <div class="card__conteudo">
      <h3 class="card__nome">${product.nome}</h3>
      <p class="card__descricao">${product.descricao}</p>
      <div class="card__rodape">
        <span class="card__preco">
          <span class="card__preco-cifrao">R$</span>${precoFormatado}
        </span>
        <button
          class="card__botao"
          data-product-id="${product.id}"
          aria-label="Adicionar ${product.nome} ao carrinho"
        >
          <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i> Pedir
        </button>
      </div>
    </div>
  `;

  const botao = card.querySelector('.card__botao');
  botao.addEventListener('click', () => {
    addToCart(product);

    botao.textContent = '✓ Adicionado!';
    botao.classList.add('card__botao--added');

    setTimeout(() => {
      botao.innerHTML = '<i class="fa-solid fa-cart-shopping" aria-hidden="true"></i> Pedir';
      botao.classList.remove('card__botao--added');
    }, 1200);
  });

  return card;
}

function showSkeletons(count) {
  productsGrid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton skeleton-card';
    skeleton.setAttribute('aria-hidden', 'true');
    productsGrid.appendChild(skeleton);
  }
}

function showEmptyState(icon, title, message) {
  productsGrid.innerHTML = `
    <div class="vazio">
      <div class="vazio__icone">${icon}</div>
      <h3 class="vazio__titulo">${title}</h3>
      <p class="vazio__texto">${message}</p>
    </div>
  `;
}

function filterProducts(query) {
  const normalizedQuery = normalizeText(query);

  const filtered = allProducts.filter(product => {
    const nome      = normalizeText(product.nome);
    const categoria = normalizeText(product.categoria);
    return nome.includes(normalizedQuery) || categoria.includes(normalizedQuery);
  });

  renderProducts(filtered);
}

function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function addToCart(product) {
  const existingItem = cart.find(item => item.id === product.id);

  if (existingItem) {
    existingItem.quantidade++;
  } else {
    cart.push({
      id:         product.id,
      nome:       product.nome,
      preco:      product.preco,
      imagem:     product.imagem,
      quantidade: 1
    });
  }

  updateCartUI();
  saveCartToStorage();

  cartBtn.classList.remove('cart-btn--bounce');
  void cartBtn.offsetWidth;
  cartBtn.classList.add('cart-btn--bounce');

  showToast(`${product.nome} adicionado ao carrinho!`);
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  updateCartUI();
  saveCartToStorage();
}

function changeQuantity(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.quantidade += delta;

  if (item.quantidade <= 0) {
    removeFromCart(productId);
    return;
  }

  updateCartUI();
  saveCartToStorage();
}

function getCartTotal() {
  return cart.reduce((total, item) => total + (item.preco * item.quantidade), 0);
}

function getCartItemCount() {
  return cart.reduce((count, item) => count + item.quantidade, 0);
}

function updateCartUI() {
  const itemCount = getCartItemCount();
  const total     = getCartTotal();

  cartBadge.textContent = itemCount;
  if (itemCount > 0) {
    cartBadge.classList.add('cart-btn__badge--visible');
  } else {
    cartBadge.classList.remove('cart-btn__badge--visible');
  }

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <div class="cart-drawer__vazio">
        <div class="cart-drawer__vazio-icone"><i class="fa-solid fa-cart-shopping" aria-hidden="true"></i></div>
        <p class="cart-drawer__vazio-texto">Seu carrinho está vazio.<br>Adicione delícias do nosso cardápio!</p>
      </div>
    `;
    cartFooter.style.display = 'none';
  } else {
    cartFooter.style.display = 'block';
    renderCartItems();
  }

  cartTotal.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function renderCartItems() {
  cartItems.innerHTML = '';
  const fragment = document.createDocumentFragment();

  cart.forEach(item => {
    const precoFormatado = (item.preco * item.quantidade).toFixed(2).replace('.', ',');

    const div = document.createElement('div');
    div.className = 'cart-item';
    div.id = `cart-item-${item.id}`;

    div.innerHTML = `
      <img class="cart-item__imagem" src="${item.imagem}" alt="${item.nome}" />
      <div class="cart-item__info">
        <p class="cart-item__nome">${item.nome}</p>
        <p class="cart-item__preco">R$ ${precoFormatado}</p>
      </div>
      <div class="cart-item__controles">
        <button class="cart-item__qty-btn" data-action="decrease" data-id="${item.id}" aria-label="Diminuir quantidade"><i class="fa-solid fa-minus" aria-hidden="true"></i></button>
        <span class="cart-item__qty">${item.quantidade}</span>
        <button class="cart-item__qty-btn" data-action="increase" data-id="${item.id}" aria-label="Aumentar quantidade"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
      </div>
      <button class="cart-item__remover" data-action="remove" data-id="${item.id}" aria-label="Remover ${item.nome}">
        <i class="fa-solid fa-trash" aria-hidden="true"></i>
      </button>
    `;

    div.querySelector('[data-action="decrease"]').addEventListener('click', () => {
      changeQuantity(item.id, -1);
    });

    div.querySelector('[data-action="increase"]').addEventListener('click', () => {
      changeQuantity(item.id, +1);
    });

    div.querySelector('[data-action="remove"]').addEventListener('click', () => {
      div.classList.add('cart-item--removing');
      div.addEventListener('animationend', () => {
        removeFromCart(item.id);
      }, { once: true });
    });

    fragment.appendChild(div);
  });

  cartItems.appendChild(fragment);
}

function openCart() {
  cartDrawer.classList.add('cart-drawer--open');
  cartOverlay.classList.add('cart-overlay--open');
  document.body.classList.add('cart-open');
}

function closeCart() {
  cartDrawer.classList.remove('cart-drawer--open');
  cartOverlay.classList.remove('cart-overlay--open');
  document.body.classList.remove('cart-open');
}

function saveCartToStorage() {
  try {
    localStorage.setItem('docemel_cart', JSON.stringify(cart));
  } catch (e) {
    console.warn('Não foi possível salvar o carrinho:', e);
  }
}

function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem('docemel_cart');
    if (saved) {
      cart = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Não foi possível carregar o carrinho:', e);
    cart = [];
  }
}

let toastTimer = null;

function showToast(message) {
  if (toastTimer) clearTimeout(toastTimer);

  toastMsg.textContent = message;
  toastEl.classList.add('toast--show');

  toastTimer = setTimeout(() => {
    toastEl.classList.remove('toast--show');
  }, 2500);
}

searchInput.addEventListener('input', (event) => {
  filterProducts(event.target.value);
});

cartBtn.addEventListener('click', openCart);

cartClose.addEventListener('click', closeCart);

cartOverlay.addEventListener('click', closeCart);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeCart();
  }
});

cartCheckout.addEventListener('click', () => {
  if (cart.length === 0) return;

  const total = getCartTotal().toFixed(2).replace('.', ',');
  showToast(`Pedido de R$ ${total} finalizado com sucesso!`);

  cart = [];
  updateCartUI();
  saveCartToStorage();

  setTimeout(closeCart, 800);
});

document.addEventListener('DOMContentLoaded', initApp);
