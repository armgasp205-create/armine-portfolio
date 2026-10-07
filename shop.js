document.addEventListener("DOMContentLoaded", function () {

    // =========================
    // PRODUCTS
    // =========================

    const products = [
        {
            id: 1,
            name: "Nova Headphones",
            description: "Wireless headphones with clear sound.",
            price: 89,
            category: "tech",
            icon: "🎧"
        },
        {
            id: 2,
            name: "Smart Watch X",
            description: "Modern smartwatch for everyday use.",
            price: 129,
            category: "tech",
            icon: "⌚"
        },
        {
            id: 3,
            name: "Urban Backpack",
            description: "Minimal backpack for work and travel.",
            price: 64,
            category: "fashion",
            icon: "🎒"
        },
        {
            id: 4,
            name: "Classic Sneakers",
            description: "Comfortable sneakers with a clean design.",
            price: 95,
            category: "fashion",
            icon: "👟"
        },
        {
            id: 5,
            name: "Minimal Glasses",
            description: "Simple and stylish everyday glasses.",
            price: 42,
            category: "accessories",
            icon: "🕶️"
        },
        {
            id: 6,
            name: "Desk Lamp Pro",
            description: "Modern lamp for your workspace.",
            price: 58,
            category: "accessories",
            icon: "💡"
        }
    ];


    // =========================
    // VARIABLES
    // =========================

    let cart = JSON.parse(
        localStorage.getItem("armineShopCart")
    ) || [];

    let currentCategory = "all";


    // =========================
    // ELEMENTS
    // =========================

    const productsGrid =
        document.getElementById("products-grid");

    const cartButton =
        document.getElementById("cart-button");

    const cartPanel =
        document.getElementById("cart-panel");

    const cartOverlay =
        document.getElementById("cart-overlay");

    const closeCartButton =
        document.getElementById("close-cart");

    const cartItems =
        document.getElementById("cart-items");

    const cartCount =
        document.getElementById("cart-count");

    const cartTotal =
        document.getElementById("cart-total");

    const checkoutButton =
        document.getElementById("checkout-button");

    const toast =
        document.getElementById("toast");

    const searchInput =
        document.getElementById("search-input");


    // =========================
    // RENDER PRODUCTS
    // =========================

    function renderProducts(
        category = currentCategory,
        searchText = ""
    ) {

        if (!productsGrid) return;

        currentCategory = category;

        const search =
            searchText.trim().toLowerCase();


        const filteredProducts = products.filter(
            function (product) {

                const matchesCategory =
                    category === "all" ||
                    product.category === category;


                const matchesSearch =
                    product.name
                        .toLowerCase()
                        .includes(search) ||

                    product.description
                        .toLowerCase()
                        .includes(search) ||

                    product.category
                        .toLowerCase()
                        .includes(search);


                return (
                    matchesCategory &&
                    matchesSearch
                );
            }
        );


        const sort = document.getElementById("product-sort")?.value;
        if (sort === "price-asc") filteredProducts.sort((a,b) => a.price-b.price);
        if (sort === "price-desc") filteredProducts.sort((a,b) => b.price-a.price);
        if (sort === "name") filteredProducts.sort((a,b) => a.name.localeCompare(b.name));
        document.getElementById("product-results-count").textContent = `${filteredProducts.length} ապրանք`;
        // No results

        if (filteredProducts.length === 0) {

            productsGrid.innerHTML = `
                <div class="no-results">

                    <div class="no-results-icon">
                        🔎
                    </div>

                    <h3>
                        Ապրանք չի գտնվել
                    </h3>

                    <p>
                        Փորձիր ուրիշ անուն կամ կատեգորիա գրել։
                    </p>

                </div>
            `;

            return;
        }


        // Products

        productsGrid.innerHTML =
            filteredProducts.map(
                function (product) {

                    return `
                        <article class="product-card">

                            <div class="product-image">
                                <span class="product-icon">
                                    ${product.icon}
                                </span>
                            </div>


                            <div class="product-info">

                                <span class="product-category">
                                    ${product.category}
                                </span>

                                <h3>
                                    ${product.name}
                                </h3>

                                <p>
                                    ${product.description}
                                </p>


                                <div class="product-bottom">

                                    <strong class="price">
                                        $${product.price.toFixed(2)}
                                    </strong>

                                    <button
                                        type="button"
                                        class="add-button"
                                        onclick="addToCart(${product.id})"
                                    >
                                        Ավելացնել
                                    </button>

                                </div>

                            </div>

                        </article>
                    `;
                }
            ).join("");
    }


    // =========================
    // FILTER PRODUCTS
    // =========================

    function filterProducts(
        category,
        button
    ) {

        currentCategory = category;


        document
            .querySelectorAll(".filter")
            .forEach(function (btn) {

                btn.classList.remove("active");

            });


        if (button) {
            button.classList.add("active");
        }


        renderProducts(
            category,
            searchInput
                ? searchInput.value
                : ""
        );
    }


    document.getElementById("product-sort").addEventListener("change", () => renderProducts(currentCategory, searchInput?.value || ""));
    // Make filter available to HTML

    window.filterProducts =
        filterProducts;


    // =========================
    // ADD TO CART
    // =========================

    function addToCart(productId) {

        const product =
            products.find(function (item) {
                return item.id === productId;
            });


        if (!product) return;


        const existingItem =
            cart.find(function (item) {
                return item.id === productId;
            });


        if (existingItem) {

            existingItem.quantity += 1;

        } else {

            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                icon: product.icon,
                quantity: 1
            });

        }


        saveCart();

        renderCart();

        showToast(
            `${product.name} ավելացվեց զամբյուղում 🛒`
        );
    }


    window.addToCart = addToCart;


    // =========================
    // REMOVE FROM CART
    // =========================

    function removeFromCart(productId) {

        cart =
            cart.filter(function (item) {
                return item.id !== productId;
            });


        saveCart();

        renderCart();

        showToast("Ապրանքը հեռացվեց զամբյուղից");
    }


    window.removeFromCart =
        removeFromCart;


    // =========================
    // CHANGE QUANTITY
    // =========================

    function changeQuantity(
        productId,
        change
    ) {

        const item =
            cart.find(function (product) {
                return product.id === productId;
            });


        if (!item) return;


        item.quantity += change;


        if (item.quantity <= 0) {

            removeFromCart(productId);

            return;
        }


        saveCart();

        renderCart();
    }


    window.changeQuantity =
        changeQuantity;


    // =========================
    // RENDER CART
    // =========================

    function renderCart() {

        if (!cartItems) return;


        // Empty cart

        if (cart.length === 0) {

            cartItems.innerHTML = `
                <div class="empty-cart">

                    <div class="empty-cart-icon">
                        🛒
                    </div>

                    <h3>
                        Զամբյուղը դատարկ է
                    </h3>

                    <p>
                        Ավելացրու որևէ ապրանք՝ սկսելու համար։
                    </p>

                </div>
            `;

        } else {

            cartItems.innerHTML =
                cart.map(function (item) {

                    return `
                        <div class="cart-item">

                            <div class="cart-item-icon">
                                ${item.icon}
                            </div>


                            <div class="cart-item-info">

                                <h3>
                                    ${item.name}
                                </h3>

                                <strong>
                                    $${item.price.toFixed(2)}
                                </strong>


                                <div class="quantity-controls">

                                    <button
                                        type="button"
                                        onclick="changeQuantity(${item.id}, -1)"
                                    >
                                        −
                                    </button>

                                    <span>
                                        ${item.quantity}
                                    </span>

                                    <button
                                        type="button"
                                        onclick="changeQuantity(${item.id}, 1)"
                                    >
                                        +
                                    </button>

                                </div>

                            </div>


                            <button
                                type="button"
                                class="remove-item"
                                onclick="removeFromCart(${item.id})"
                            >
                                ×
                            </button>

                        </div>
                    `;

                }).join("");
        }


        // Count

        const totalQuantity =
            cart.reduce(
                function (sum, item) {
                    return sum + item.quantity;
                },
                0
            );


        if (cartCount) {
            cartCount.textContent =
                totalQuantity;
        }


        // Total price

        const totalPrice =
            cart.reduce(
                function (sum, item) {

                    return (
                        sum +
                        item.price *
                        item.quantity
                    );

                },
                0
            );


        if (cartTotal) {

            cartTotal.textContent =
                totalPrice.toFixed(2);

        }
    }


    // =========================
    // SAVE CART
    // =========================

    function saveCart() {

        localStorage.setItem(
            "armineShopCart",
            JSON.stringify(cart)
        );
    }


    // =========================
    // OPEN CART
    // =========================

    function openCart() {

        if (cartPanel) {
            cartPanel.classList.add("open");
        }

        if (cartOverlay) {
            cartOverlay.classList.add("open");
        }

        document.body.classList.add(
            "cart-open"
        );
    }


    // =========================
    // CLOSE CART
    // =========================

    function closeCart() {

        if (cartPanel) {
            cartPanel.classList.remove("open");
        }

        if (cartOverlay) {
            cartOverlay.classList.remove("open");
        }

        document.body.classList.remove(
            "cart-open"
        );
    }


    // =========================
    // TOAST
    // =========================

    function showToast(message) {

        if (!toast) return;


        toast.textContent = message;

        toast.classList.add("show");


        setTimeout(function () {

            toast.classList.remove("show");

        }, 2500);
    }


    // =========================
    // CHECKOUT
    // =========================

    function checkout() {

        if (cart.length === 0) {

            showToast(
                "Զամբյուղը դատարկ է 🛒"
            );

            return;
        }


        showToast(
            "Պատվերի ձևավորումը ցուցադրական է 💜"
        );


        setTimeout(function () {

            cart = [];

            saveCart();

            renderCart();

            closeCart();

        }, 1200);
    }


    // =========================
    // SEARCH
    // =========================

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            function () {

                renderProducts(
                    currentCategory,
                    this.value
                );

            }
        );
    }


    // =========================
    // FILTER BUTTONS
    // =========================

    document
        .querySelectorAll(".filter")
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    filterProducts(
                        this.dataset.category,
                        this
                    );

                }
            );

        });


    // =========================
    // CART BUTTON
    // =========================

    if (cartButton) {

        cartButton.addEventListener(
            "click",
            openCart
        );
    }


    // =========================
    // CLOSE CART BUTTON
    // =========================

    if (closeCartButton) {

        closeCartButton.addEventListener(
            "click",
            closeCart
        );
    }


    // =========================
    // OVERLAY
    // =========================

    if (cartOverlay) {

        cartOverlay.addEventListener(
            "click",
            closeCart
        );
    }


    // =========================
    // CHECKOUT BUTTON
    // =========================

    if (checkoutButton) {

        checkoutButton.addEventListener(
            "click",
            checkout
        );
    }


    // =========================
    // ESCAPE KEY
    // =========================

    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Escape") {
                closeCart();
            }

        }
    );


    // =========================
    // INITIAL LOAD
    // =========================

    renderProducts();

    renderCart();

});