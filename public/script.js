// Конфигурация
const API_URL = window.location.origin; // Автоматически берет URL Vercel
const SUPABASE_URL = 'https://ВАШ-PROJECT.supabase.co';
const SUPABASE_KEY = 'ВАШ-ANON-KEY';

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Состояние приложения
let cart = JSON.parse(localStorage.getItem('cart')) || {};
let currentScreen = 'main';
let currentCategory = '';

// Навигация
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    currentScreen = screenId;
    updateCartIndicator();
}

function goBack() {
    switch(currentScreen) {
        case 'products-screen':
            showScreen('main-screen');
            break;
        case 'cart-screen':
            showScreen('main-screen');
            break;
        case 'checkout-screen':
            showScreen('cart-screen');
            break;
        case 'success-screen':
            showScreen('main-screen');
            break;
    }
}

// Работа с корзиной
function updateCart() {
    const items = Object.values(cart);
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Сохраняем в localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Обновляем индикатор
    updateCartIndicator();
    
    // Обновляем экран корзины если он открыт
    if (currentScreen === 'cart-screen') {
        updateCartDisplay();
    }
    
    // Обновляем экран оформления если он открыт
    if (currentScreen === 'checkout-screen') {
        updateOrderSummary();
    }
}

function updateCartIndicator() {
    const items = Object.values(cart);
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    document.getElementById('cart-count').textContent = totalCount;
    document.getElementById('cart-total').textContent = totalPrice.toFixed(0);
}

function updateCartDisplay() {
    const container = document.getElementById('cart-items');
    const items = Object.values(cart);
    
    if (items.length === 0) {
        container.innerHTML = '<div class="empty-cart">Корзина пуста</div>';
        return;
    }
    
    let html = '';
    items.forEach(item => {
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="cart-item-price">${item.price} ₽ × ${item.quantity} = ${(item.price * item.quantity).toFixed(0)} ₽</div>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-button" onclick="updateCartItem(${item.id}, -1)">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="qty-button" onclick="updateCartItem(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Обновляем итоговую сумму
    const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cart-total-amount').textContent = totalPrice.toFixed(0) + ' ₽';
}

function updateCartItem(productId, delta) {
    if (cart[productId]) {
        cart[productId].quantity += delta;
        if (cart[productId].quantity <= 0) {
            delete cart[productId];
        }
        updateCart();
    }
}

function addToCart(productId, productName, productPrice) {
    if (!cart[productId]) {
        cart[productId] = {
            id: productId,
            name: productName,
            price: productPrice,
            quantity: 0
        };
    }
    cart[productId].quantity++;
    
    // Показываем уведомление
    tg.showPopup({
        title: 'Добавлено в корзину',
        message: `${productName} добавлен в корзину`
    });
    
    updateCart();
}

// Работа с товарами
async function openCategory(category) {
    currentCategory = category;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products?category=eq.${category}`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const products = await response.json();
        showProducts(products);
        
    } catch (error) {
        console.error('Error:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Не удалось загрузить товары'
        });
    }
}

function showProducts(products) {
    document.getElementById('category-title').textContent = 
        currentCategory === 'выпечка' ? '🥖 Выпечка' : '❄️ Заморозка';
    
    const container = document.getElementById('products-list');
    let html = '';
    
    products.forEach(product => {
        const cartItem = cart[product.id] || { quantity: 0 };
        
        html += `
            <div class="product-item">
                <div class="product-header">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">${product.price} ₽</div>
                </div>
                <div class="product-meta">${product.weight}</div>
                <div class="product-composition">${product.composition}</div>
                <div class="product-controls">
                    <div class="quantity-controls">
                        <button class="qty-button" onclick="updateCartItem(${product.id}, -1)">-</button>
                        <span class="quantity">${cartItem.quantity}</span>
                        <button class="qty-button" onclick="updateCartItem(${product.id}, 1)">+</button>
                    </div>
                    <button class="add-button" onclick="addToCart(${product.id}, '${product.name}', ${product.price})">
                        ${cartItem.quantity > 0 ? 'Добавить ещё' : 'В корзину'}
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    showScreen('products-screen');
}

// Корзина
function openCart() {
    updateCartDisplay();
    showScreen('cart-screen');
}

// Оформление заказа
function openCheckout() {
    const items = Object.values(cart);
    if (items.length === 0) {
        tg.showPopup({
            title: 'Корзина пуста',
            message: 'Добавьте товары в корзину'
        });
        return;
    }
    
    // Автозаполнение данных из Telegram
    if (tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        const nameField = document.getElementById('name');
        const phoneField = document.getElementById('phone');
        
        if (nameField && user.first_name) {
            nameField.value = `${user.first_name} ${user.last_name || ''}`.trim();
        }
        
        if (phoneField && user.phone_number) {
            phoneField.value = user.phone_number;
        }
    }
    
    updateOrderSummary();
    showScreen('checkout-screen');
}

function updateOrderSummary() {
    const items = Object.values(cart);
    const container = document.getElementById('order-items-summary');
    
    let html = '';
    items.forEach(item => {
        html += `
            <div class="order-item-row">
                <span>${item.name} × ${item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(0)} ₽</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('order-total-amount').textContent = totalPrice.toFixed(0) + ' ₽';
}

async function submitOrder() {
    const form = document.getElementById('checkout-form');
    
    // Проверка формы
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Проверка соглашения
    if (!document.getElementById('agreement').checked) {
        tg.showPopup({
            title: 'Требуется согласие',
            message: 'Пожалуйста, подтвердите условия доставки'
        });
        return;
    }
    
    const items = Object.values(cart);
    if (items.length === 0) {
        tg.showPopup({
            title: 'Корзина пуста',
            message: 'Добавьте товары в корзину'
        });
        return;
    }
    
    // Подготовка данных заказа
    const orderData = {
        user_tg_id: tg.initDataUnsafe.user?.id || null,
        user_name: document.getElementById('name').value,
        user_phone: document.getElementById('phone').value,
        delivery_city: document.getElementById('city').value,
        delivery_street: document.getElementById('street').value,
        delivery_house: document.getElementById('house').value,
        delivery_apartment: document.getElementById('apartment').value || '',
        order_items: items.map(item => ({
            product_id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
        })),
        total_amount: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        agreement_accepted: true
    };
    
    try {
        // Отправка заказа в Supabase
        const response = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) throw new Error('Ошибка сервера');
        
        const result = await response.json();
        const orderId = result[0]?.id;
        
        // Показываем экран успеха
        showOrderSuccess(orderData, orderId);
        
        // Очищаем корзину
        cart = {};
        localStorage.removeItem('cart');
        updateCart();
        
    } catch (error) {
        console.error('Error:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Не удалось оформить заказ. Попробуйте еще раз.'
        });
    }
}

function showOrderSuccess(orderData, orderId) {
    const container = document.getElementById('order-details');
    const now = new Date();
    
    container.innerHTML = `
        <p><strong>Номер заказа:</strong> #${orderId}</p>
        <p><strong>Дата и время:</strong> ${now.toLocaleString('ru-RU')}</p>
        <p><strong>Имя:</strong> ${orderData.user_name}</p>
        <p><strong>Телефон:</strong> ${orderData.user_phone}</p>
        <p><strong>Адрес:</strong> ${orderData.delivery_city}, ${orderData.delivery_street}, д. ${orderData.delivery_house}${
            orderData.delivery_apartment ? ', кв. ' + orderData.delivery_apartment : ''
        }</p>
        <p><strong>Сумма заказа:</strong> ${orderData.total_amount.toFixed(0)} ₽</p>
    `;
    
    showScreen('success-screen');
}

function closeApp() {
    tg.close();
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    updateCartIndicator();
    
    // Показываем главный экран
    showScreen('main-screen');
});
