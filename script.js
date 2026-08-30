/**
 * ============================================================
 * DOCE MEL — Script Principal
 *
 * Responsabilidades:
 *   1. Buscar os dados dos produtos via fetch() (headless commerce)
 *   2. Renderizar os cards dinamicamente no DOM
 *   3. Filtrar produtos em tempo real pela barra de busca
 *   4. Gerenciar o carrinho de compras (adicionar, remover, alterar qtd)
 * ============================================================
 */

// ============================================================
// REFERÊNCIAS AO DOM
// ============================================================
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

// ============================================================
// ESTADO GLOBAL
// ============================================================

/** Todos os produtos carregados do JSON */
let allProducts = [];

/**
 * Carrinho de compras.
 * Cada item: { id, nome, preco, imagem, quantidade }
 */
let cart = [];

// ============================================================
// 1. INICIALIZAÇÃO — Carrega produtos e configura eventos
// ============================================================

async function initApp() {
  // Exibe skeletons enquanto carrega
  showSkeletons(6);

  try {
    const response = await fetch('products.json');

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    allProducts = await response.json();
    renderProducts(allProducts);
  } catch (error) {
    console.error('Falha ao carregar produtos:', error);
    showEmptyState(
      '<i class="fa-solid fa-face-frown" aria-hidden="true"></i>',
      'Ops! Algo deu errado',
      'Não foi possível carregar os produtos. Tente recarregar a página.'
    );
  }

  // Carrega carrinho salvo no localStorage (persistência entre sessões)
  loadCartFromStorage();
  updateCartUI();
}

// ============================================================
// 2. RENDERIZAÇÃO DE PRODUTOS
// ============================================================

/**
 * Renderiza uma lista de produtos no grid.
 * Limpa o conteúdo anterior e cria novos cards.
 *
 * @param {Array} products - Array de objetos de produto
 */
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

/**
 * Cria o elemento HTML de um card de produto.
 *
 * @param {Object} product - Dados do produto
 * @param {number} index   - Índice para escalonar animação
 * @returns {HTMLElement}  - Elemento <article> do card
 */
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

  // Evento do botão "Pedir" — adiciona ao carrinho
  const botao = card.querySelector('.card__botao');
  botao.addEventListener('click', () => {
    addToCart(product);

    // Feedback visual temporário no botão
    botao.textContent = '✓ Adicionado!';
    botao.classList.add('card__botao--added');

    setTimeout(() => {
      botao.innerHTML = '<i class="fa-solid fa-cart-shopping" aria-hidden="true"></i> Pedir';
      botao.classList.remove('card__botao--added');
    }, 1200);
  });

  return card;
}

/**
 * Exibe skeletons de carregamento.
 * @param {number} count - Quantidade de skeletons
 */
function showSkeletons(count) {
  productsGrid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton skeleton-card';
    skeleton.setAttribute('aria-hidden', 'true');
    productsGrid.appendChild(skeleton);
  }
}

/**
 * Exibe estado vazio (sem resultados ou erro).
 *
 * @param {string} icon    - Markup do ícone Font Awesome
 * @param {string} title   - Título
 * @param {string} message - Texto descritivo
 */
function showEmptyState(icon, title, message) {
  productsGrid.innerHTML = `
    <div class="vazio">
      <div class="vazio__icone">${icon}</div>
      <h3 class="vazio__titulo">${title}</h3>
      <p class="vazio__texto">${message}</p>
    </div>
  `;
}

// ============================================================
// 3. BUSCA / FILTRO EM TEMPO REAL
// ============================================================

/**
 * Filtra produtos pelo nome ou categoria.
 * Remove acentos para busca mais flexível.
 *
 * @param {string} query - Texto digitado
 */
function filterProducts(query) {
  const normalizedQuery = normalizeText(query);

  const filtered = allProducts.filter(product => {
    const nome      = normalizeText(product.nome);
    const categoria = normalizeText(product.categoria);
    return nome.includes(normalizedQuery) || categoria.includes(normalizedQuery);
  });

  renderProducts(filtered);
}

/**
 * Normaliza texto: remove acentos e converte para minúsculas.
 * Ex: "Açaí" → "acai"
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// ============================================================
// 4. CARRINHO DE COMPRAS
// ============================================================

/**
 * Adiciona um produto ao carrinho.
 * Se o produto já existe, incrementa a quantidade.
 *
 * @param {Object} product - Dados do produto
 */
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

  // Atualiza a interface e salva no localStorage
  updateCartUI();
  saveCartToStorage();

  // Animação de "bounce" no botão do carrinho
  cartBtn.classList.remove('cart-btn--bounce');
  // Força reflow para reiniciar a animação
  void cartBtn.offsetWidth;
  cartBtn.classList.add('cart-btn--bounce');

  // Mostra notificação toast
  showToast(`${product.nome} adicionado ao carrinho!`);
}

/**
 * Remove um produto do carrinho pelo ID.
 *
 * @param {number} productId - ID do produto
 */
function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  updateCartUI();
  saveCartToStorage();
}

/**
 * Altera a quantidade de um item no carrinho.
 * Se a quantidade chegar a 0, remove o item.
 *
 * @param {number} productId - ID do produto
 * @param {number} delta     - Valor a somar (+1 ou -1)
 */
function changeQuantity(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.quantidade += delta;

  // Remove se a quantidade chegar a zero
  if (item.quantidade <= 0) {
    removeFromCart(productId);
    return;
  }

  updateCartUI();
  saveCartToStorage();
}

/**
 * Calcula o total do carrinho.
 * @returns {number} Soma dos preços × quantidades
 */
function getCartTotal() {
  return cart.reduce((total, item) => total + (item.preco * item.quantidade), 0);
}

/**
 * Retorna a quantidade total de itens no carrinho.
 * @returns {number}
 */
function getCartItemCount() {
  return cart.reduce((count, item) => count + item.quantidade, 0);
}

// ============================================================
// 5. ATUALIZAÇÃO DA INTERFACE DO CARRINHO
// ============================================================

/**
 * Atualiza todos os elementos visuais do carrinho:
 * badge, lista de itens, total e visibilidade do footer.
 */
function updateCartUI() {
  const itemCount = getCartItemCount();
  const total     = getCartTotal();

  // --- Badge do botão ---
  cartBadge.textContent = itemCount;
  if (itemCount > 0) {
    cartBadge.classList.add('cart-btn__badge--visible');
  } else {
    cartBadge.classList.remove('cart-btn__badge--visible');
  }

  // --- Lista de itens ---
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

  // --- Total ---
  cartTotal.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

/**
 * Renderiza a lista de itens dentro do drawer do carrinho.
 * Cada item exibe imagem, nome, preço, controles de quantidade e botão remover.
 */
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

    // Eventos dos botões de quantidade e remover
    div.querySelector('[data-action="decrease"]').addEventListener('click', () => {
      changeQuantity(item.id, -1);
    });

    div.querySelector('[data-action="increase"]').addEventListener('click', () => {
      changeQuantity(item.id, +1);
    });

    div.querySelector('[data-action="remove"]').addEventListener('click', () => {
      // Animação de saída antes de remover
      div.classList.add('cart-item--removing');
      div.addEventListener('animationend', () => {
        removeFromCart(item.id);
      }, { once: true });
    });

    fragment.appendChild(div);
  });

  cartItems.appendChild(fragment);
}

// ============================================================
// 6. ABRIR / FECHAR CARRINHO
// ============================================================

/**
 * Abre o drawer lateral do carrinho.
 */
function openCart() {
  cartDrawer.classList.add('cart-drawer--open');
  cartOverlay.classList.add('cart-overlay--open');
  document.body.classList.add('cart-open');
}

/**
 * Fecha o drawer lateral do carrinho.
 */
function closeCart() {
  cartDrawer.classList.remove('cart-drawer--open');
  cartOverlay.classList.remove('cart-overlay--open');
  document.body.classList.remove('cart-open');
}

// ============================================================
// 7. PERSISTÊNCIA — localStorage
// ============================================================

/**
 * Salva o carrinho no localStorage para persistir entre sessões.
 */
function saveCartToStorage() {
  try {
    localStorage.setItem('docemel_cart', JSON.stringify(cart));
  } catch (e) {
    console.warn('Não foi possível salvar o carrinho:', e);
  }
}

/**
 * Carrega o carrinho salvo do localStorage.
 */
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

// ============================================================
// 8. TOAST — Notificação temporária
// ============================================================

/** Timer do toast (para limpar se outro toast for disparado) */
let toastTimer = null;

/**
 * Exibe uma notificação toast na parte inferior da tela.
 *
 * @param {string} message - Texto a ser exibido
 */
function showToast(message) {
  // Limpa toast anterior se existir
  if (toastTimer) clearTimeout(toastTimer);

  toastMsg.textContent = message;
  toastEl.classList.add('toast--show');

  toastTimer = setTimeout(() => {
    toastEl.classList.remove('toast--show');
  }, 2500);
}

// ============================================================
// 9. EVENT LISTENERS
// ============================================================

// Busca em tempo real
searchInput.addEventListener('input', (event) => {
  filterProducts(event.target.value);
});

// Abrir carrinho
cartBtn.addEventListener('click', openCart);

// Fechar carrinho (botão X)
cartClose.addEventListener('click', closeCart);

// Fechar carrinho (clique no overlay)
cartOverlay.addEventListener('click', closeCart);

// Fechar carrinho (tecla Escape)
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeCart();
  }
});

// Botão "Finalizar Pedido"
cartCheckout.addEventListener('click', () => {
  if (cart.length === 0) return;

  const total = getCartTotal().toFixed(2).replace('.', ',');
  showToast(`Pedido de R$ ${total} finalizado com sucesso!`);

  // Limpa o carrinho
  cart = [];
  updateCartUI();
  saveCartToStorage();

  // Fecha o drawer após um breve delay
  setTimeout(closeCart, 800);
});

// ============================================================
// 10. INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', initApp);
