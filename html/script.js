// ============================================
// WILD WEST SHOP UI - JavaScript
// ============================================

const ShopUI = {
    // State
    isOpen: false,
    shopName: '',
    shopLabel: '',
    items: [],
    cart: [],
    playerMoney: { cash: 0, gold: 0 },
    selectedItem: null,
    sortBy: 'name',
    searchQuery: '',
    imagePath: 'nui://rsg-inventory/html/images/',
    isPurchasing: false,
    resourceName: 'rsg-shops', // Will be updated from NUI
    
    // Initialize
    init() {
        this.bindEvents();
        this.setupNUICallbacks();
    },
    
    // Bind DOM events
    bindEvents() {
        // Close button
        document.getElementById('close-btn').addEventListener('click', () => this.close());
        
        // Search
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderItems();
        });
        
        // Sort buttons
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.sortBy = btn.dataset.sort;
                this.renderItems();
            });
        });
        
        // Cart actions
        document.getElementById('btn-clear').addEventListener('click', () => this.clearCart());
        document.getElementById('btn-purchase').addEventListener('click', () => this.purchase());
        
        // Modal events
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-add').addEventListener('click', () => this.addToCart());
        
        // Quantity controls
        document.getElementById('qty-minus').addEventListener('click', () => this.adjustQuantity(-1));
        document.getElementById('qty-plus').addEventListener('click', () => this.adjustQuantity(1));
        document.getElementById('qty-input').addEventListener('change', () => this.updateModalTotal());
        
        // Quick quantity buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const qty = btn.dataset.qty;
                if (qty === 'max') {
                    document.getElementById('qty-input').value = this.selectedItem.amount;
                } else {
                    document.getElementById('qty-input').value = Math.min(parseInt(qty), this.selectedItem.amount);
                }
                this.updateModalTotal();
            });
        });
        
        // Modal backdrop
        document.querySelector('.modal-backdrop')?.addEventListener('click', () => this.closeModal());
        
        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!document.getElementById('item-modal').classList.contains('hidden')) {
                    this.closeModal();
                } else if (this.isOpen) {
                    this.close();
                }
            }
        });
    },
    
    // Setup NUI callbacks
    setupNUICallbacks() {
        window.addEventListener('message', (event) => {
            const data = event.data;
            
            switch(data.action) {
                case 'open':
                    this.open(data.shopName, data.shopLabel, data.items, data.playerMoney, data.imagePath);
                    break;
                case 'close':
                    this.hide();
                    break;
                case 'updateMoney':
                    this.updateMoney(data.cash, data.gold);
                    break;
                case 'updateItems':
                    this.items = data.items;
                    this.renderItems();
                    break;
                case 'purchaseSuccess':
                    this.purchaseSuccess(data.message);
                    break;
                case 'purchaseFailed':
                    this.purchaseFailed(data.message);
                    break;
                case 'notify':
                    this.showNotification(data.type, data.title, data.message);
                    break;
            }
        });
    },
    
    // Send NUI callback
    sendNUI(endpoint, data) {
        return fetch(`https://rsg-shops/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data || {})
        });
    },
    
    // Open shop
    open(shopName, shopLabel, items, playerMoney, imagePath) {
        this.shopName = shopName;
        this.shopLabel = shopLabel;
        this.items = items || [];
        this.playerMoney = playerMoney || { cash: 0, gold: 0 };
        this.cart = [];
        this.isPurchasing = false;
        
        if (imagePath) {
            this.imagePath = imagePath;
        }
        
        this.isOpen = true;
        
        document.getElementById('shop-name').textContent = shopLabel.toUpperCase();
        document.getElementById('shop-subtitle').textContent = this.getShopSubtitle(shopName);
        
        this.updateMoneyDisplay();
        this.renderItems();
        this.updateCartDisplay();
        
        document.getElementById('shop-container').classList.remove('hidden');
    },
    
    // Get shop subtitle based on type
    getShopSubtitle(name) {
        if (name.includes('gen')) return 'Quality Goods & Supplies';
        if (name.includes('wep')) return 'Fine Firearms & Ammunition';
        if (name.includes('horse')) return 'Equestrian Supplies';
        if (name.includes('booze')) return 'Spirits & Tobacco';
        if (name.includes('butcher')) return 'Fresh Meats & Provisions';
        if (name.includes('fish')) return 'Fishing Supplies & Bait';
        if (name.includes('farm')) return 'Agricultural Supplies';
        if (name.includes('trap')) return 'Hunting & Trapping';
        if (name.includes('black')) return 'Illicit Goods';
        return 'Frontier Trading Post';
    },
    
    // Close shop
    close() {
        this.isPurchasing = false;
        this.hide();
        this.sendNUI('closeShop');
    },
    
    // Hide UI
    hide() {
        this.isOpen = false;
        this.isPurchasing = false;
        this.cart = [];
        document.getElementById('shop-container').classList.add('hidden');
        
        const purchaseBtn = document.getElementById('btn-purchase');
        if (purchaseBtn) {
            purchaseBtn.classList.remove('purchasing');
        }
    },
    
    // Update money display
    updateMoneyDisplay() {
        document.getElementById('player-cash').textContent = '$' + this.playerMoney.cash.toFixed(2);
        document.getElementById('player-gold').textContent = this.playerMoney.gold || 0;
    },
    
    // Update money from server
    updateMoney(cash, gold) {
        this.playerMoney = { cash, gold };
        this.updateMoneyDisplay();
    },
    
    // Get item image URL
    getItemImage(item) {
        if (item.image) {
            return this.imagePath + item.image;
        }
        return this.imagePath + item.name + '.png';
    },
    
    // Get fallback icon based on item type
    getFallbackIcon(item) {
        const name = item.name.toLowerCase();
        if (name.includes('weapon') || name.includes('gun') || name.includes('revolver') || name.includes('pistol') || name.includes('rifle') || name.includes('repeater') || name.includes('shotgun')) {
            return 'fa-gun';
        }
        if (name.includes('ammo') || name.includes('arrow')) return 'fa-crosshairs';
        if (name.includes('bread') || name.includes('meat') || name.includes('food') || name.includes('donut') || name.includes('pie')) return 'fa-bread-slice';
        if (name.includes('water') || name.includes('drink') || name.includes('coffee')) return 'fa-bottle-water';
        if (name.includes('beer') || name.includes('whiskey') || name.includes('moonshine')) return 'fa-whiskey-glass';
        if (name.includes('cigarette') || name.includes('cigar') || name.includes('tobacco') || name.includes('pipe')) return 'fa-smoking';
        if (name.includes('horse') || name.includes('brush') || name.includes('feed')) return 'fa-horse';
        if (name.includes('fish') || name.includes('bait') || name.includes('rod')) return 'fa-fish';
        if (name.includes('seed') || name.includes('farm')) return 'fa-seedling';
        if (name.includes('bandage') || name.includes('medic') || name.includes('firstaid')) return 'fa-kit-medical';
        if (name.includes('knife') || name.includes('axe') || name.includes('pickaxe') || name.includes('shovel')) return 'fa-hammer';
        if (name.includes('tent') || name.includes('camp')) return 'fa-tent';
        if (name.includes('lantern') || name.includes('lamp')) return 'fa-lightbulb';
        if (name.includes('lock') || name.includes('key')) return 'fa-key';
        return 'fa-box';
    },
    
    // Render items
    renderItems() {
        const grid = document.getElementById('items-grid');
        const noItems = document.getElementById('no-items');
        grid.innerHTML = '';
        
        let filteredItems = this.items.filter(item => {
            if (!this.searchQuery) return true;
            return item.name.toLowerCase().includes(this.searchQuery) ||
                   (item.label && item.label.toLowerCase().includes(this.searchQuery));
        });
        
        filteredItems.sort((a, b) => {
            switch(this.sortBy) {
                case 'price-low':
                    return a.price - b.price;
                case 'price-high':
                    return b.price - a.price;
                default:
                    return (a.label || a.name).localeCompare(b.label || b.name);
            }
        });
        
        if (filteredItems.length === 0) {
            grid.classList.add('hidden');
            noItems.classList.remove('hidden');
            return;
        }
        
        grid.classList.remove('hidden');
        noItems.classList.add('hidden');
        
        filteredItems.forEach(item => {
            const card = document.createElement('div');
            card.className = `item-card ${item.amount <= 0 ? 'out-of-stock' : ''}`;
            
            const imageUrl = this.getItemImage(item);
            const fallbackIcon = this.getFallbackIcon(item);
            const label = item.label || this.formatItemName(item.name);
            
            card.innerHTML = `
                <div class="item-image-container">
                    <img 
                        class="item-image" 
                        src="${imageUrl}" 
                        alt="${label}"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                    >
                    <div class="item-icon-fallback" style="display: none;">
                        <i class="fa-solid ${fallbackIcon}"></i>
                    </div>
                </div>
                <div class="item-name">${label}</div>
                <div class="item-price">$${item.price.toFixed(2)}</div>
                <div class="item-stock">Stock: ${item.amount}</div>
            `;
            
            if (item.amount > 0) {
                card.addEventListener('click', () => this.showItemModal(item));
            }
            
            grid.appendChild(card);
        });
    },
    
    // Format item name
    formatItemName(name) {
        return name
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    },
    
    // Show item modal
    showItemModal(item) {
        this.selectedItem = item;
        
        const imageUrl = this.getItemImage(item);
        const fallbackIcon = this.getFallbackIcon(item);
        const label = item.label || this.formatItemName(item.name);
        
        const modalIconContainer = document.getElementById('modal-icon');
        modalIconContainer.innerHTML = `
            <img 
                class="modal-item-image" 
                src="${imageUrl}" 
                alt="${label}"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            >
            <div class="modal-icon-fallback" style="display: none;">
                <i class="fa-solid ${fallbackIcon}"></i>
            </div>
        `;
        
        document.getElementById('modal-item-name').textContent = label;
        document.getElementById('modal-item-type').textContent = item.type || 'General Item';
        document.getElementById('modal-price').textContent = '$' + item.price.toFixed(2);
        document.getElementById('modal-stock').textContent = item.amount;
        document.getElementById('qty-input').value = 1;
        document.getElementById('qty-input').max = item.amount;
        
        this.updateModalTotal();
        
        document.getElementById('item-modal').classList.remove('hidden');
    },
    
    // Close modal
    closeModal() {
        document.getElementById('item-modal').classList.add('hidden');
        this.selectedItem = null;
    },
    
    // Adjust quantity
    adjustQuantity(delta) {
        const input = document.getElementById('qty-input');
        let value = parseInt(input.value) + delta;
        value = Math.max(1, Math.min(value, this.selectedItem.amount));
        input.value = value;
        this.updateModalTotal();
    },
    
    // Update modal total
    updateModalTotal() {
        const qty = parseInt(document.getElementById('qty-input').value) || 1;
        const total = qty * this.selectedItem.price;
        document.getElementById('modal-total').textContent = '$' + total.toFixed(2);
    },
    
    // Add to cart
    addToCart() {
        const qty = parseInt(document.getElementById('qty-input').value) || 1;
        
        const existingIndex = this.cart.findIndex(c => c.name === this.selectedItem.name);
        
        if (existingIndex >= 0) {
            const newQty = this.cart[existingIndex].quantity + qty;
            if (newQty > this.selectedItem.amount) {
                this.showNotification('error', 'Stock Limit', 'Cannot add more than available stock');
                return;
            }
            this.cart[existingIndex].quantity = newQty;
        } else {
            this.cart.push({
                name: this.selectedItem.name,
                label: this.selectedItem.label || this.formatItemName(this.selectedItem.name),
                price: this.selectedItem.price,
                quantity: qty,
                image: this.selectedItem.image || this.selectedItem.name + '.png'
            });
        }
        
        this.updateCartDisplay();
        this.closeModal();
        this.showNotification('success', 'Added to Cart', `${qty}x ${this.selectedItem.label || this.formatItemName(this.selectedItem.name)}`);
    },
    
    // Update cart display
    updateCartDisplay() {
        const cartItems = document.getElementById('cart-items');
        const cartEmpty = document.getElementById('cart-empty');
        const cartCount = document.getElementById('cart-count');
        const purchaseBtn = document.getElementById('btn-purchase');
        
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        
        if (this.cart.length === 0) {
            cartItems.classList.add('hidden');
            cartEmpty.classList.remove('hidden');
            document.getElementById('cart-subtotal').textContent = '$0.00';
            document.getElementById('cart-total').textContent = '$0.00';
            purchaseBtn.disabled = true;
            return;
        }
        
        cartItems.classList.remove('hidden');
        cartEmpty.classList.add('hidden');
        purchaseBtn.disabled = false;
        
        cartItems.innerHTML = '';
        let subtotal = 0;
        
        this.cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            
            const imageUrl = this.imagePath + item.image;
            
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-image">
                    <img 
                        src="${imageUrl}" 
                        alt="${item.label}"
                        onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fa-solid fa-box\\'></i>';"
                    >
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.label}</div>
                    <div class="cart-item-qty">x${item.quantity}</div>
                </div>
                <div class="cart-item-price">$${itemTotal.toFixed(2)}</div>
                <button class="cart-item-remove" data-index="${index}">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
            
            cartItem.querySelector('.cart-item-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromCart(index);
            });
            
            cartItems.appendChild(cartItem);
        });
        
        document.getElementById('cart-subtotal').textContent = '$' + subtotal.toFixed(2);
        document.getElementById('cart-total').textContent = '$' + subtotal.toFixed(2);
    },
    
    // Remove from cart
    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.updateCartDisplay();
    },
    
    // Clear cart
    clearCart() {
        this.cart = [];
        this.updateCartDisplay();
    },
    
    // Purchase
    purchase() {
        if (this.cart.length === 0) {
            this.showNotification('error', 'Empty Cart', 'Add items to your cart first');
            return;
        }
        
        if (this.isPurchasing) {
            return;
        }
        
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        if (total > this.playerMoney.cash) {
            this.showNotification('error', 'Insufficient Funds', 'You don\'t have enough cash');
            return;
        }
        
        this.isPurchasing = true;
        const purchaseBtn = document.getElementById('btn-purchase');
        purchaseBtn.classList.add('purchasing');
        purchaseBtn.disabled = true;
        
        this.sendNUI('purchase', {
            shopName: this.shopName,
            items: this.cart,
            total: total
        });
    },
    
    // Purchase success
    purchaseSuccess(message) {
        this.isPurchasing = false;
        const purchaseBtn = document.getElementById('btn-purchase');
        purchaseBtn.classList.remove('purchasing');
        purchaseBtn.disabled = false;
        
        this.cart = [];
        this.updateCartDisplay();
        
        document.getElementById('success-message').textContent = message || 'Thank you for your purchase';
        document.getElementById('success-overlay').classList.remove('hidden');
        
        setTimeout(() => {
            document.getElementById('success-overlay').classList.add('hidden');
        }, 2500);
        
        this.sendNUI('refreshShop', { shopName: this.shopName });
    },
    
    // Purchase failed
    purchaseFailed(message) {
        this.isPurchasing = false;
        const purchaseBtn = document.getElementById('btn-purchase');
        purchaseBtn.classList.remove('purchasing');
        purchaseBtn.disabled = false;
        
        this.showNotification('error', 'Purchase Failed', message);
    },
    
    // Show notification
    showNotification(type, title, message) {
        const container = document.getElementById('notification-container');
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            info: 'fa-info-circle'
        };
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fa-solid ${icons[type] || icons.info}"></i>
            <div>
                <strong>${title}</strong>
                ${message ? `<br><span style="font-size: 11px; opacity: 0.9;">${message}</span>` : ''}
            </div>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'notifyOut 0.4s ease-in forwards';
            setTimeout(() => notification.remove(), 400);
        }, 4000);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    ShopUI.init();
});

// Add notification out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes notifyOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);