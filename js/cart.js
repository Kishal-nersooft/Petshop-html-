/**
 * PetShop cart — localStorage-backed cart + slide-out preview panel.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "petshop-cart";

  function loadItems() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveItems(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      /* quota / private mode */
    }
    document.dispatchEvent(new CustomEvent("petshop-cart-updated"));
  }

  function findCatalogProduct(id) {
    var list = window.PETSHOP_PRODUCTS;
    if (!list || !list.length) return null;
    var n = parseInt(id, 10);
    if (isNaN(n)) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === n) return list[i];
    }
    return null;
  }

  function normalizeItem(product, qty) {
    return {
      id: String(product.id),
      name: product.name,
      price: Number(product.price) || 0,
      image: product.image || "",
      qty: Math.max(1, Math.min(99, qty || 1)),
    };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var cartBackdrop = null;
  var cartDrawer = null;
  var cartBody = null;
  var cartFoot = null;
  var cartBadge = null;
  var isOpen = false;

  function count() {
    return loadItems().reduce(function (s, i) {
      return s + (i.qty || 0);
    }, 0);
  }

  function subtotal() {
    return loadItems().reduce(function (s, i) {
      return s + (i.price || 0) * (i.qty || 0);
    }, 0);
  }

  function add(product, qty) {
    if (!product || product.id == null) return false;
    var items = loadItems();
    var id = String(product.id);
    var q = Math.max(1, Math.min(99, qty || 1));
    var found = false;
    for (var i = 0; i < items.length; i++) {
      if (String(items[i].id) === id) {
        items[i].qty = Math.min(99, (items[i].qty || 0) + q);
        found = true;
        break;
      }
    }
    if (!found) items.push(normalizeItem(product, q));
    saveItems(items);
    render();
    return true;
  }

  function setQty(id, qty) {
    var items = loadItems();
    var sid = String(id);
    var next = [];
    for (var i = 0; i < items.length; i++) {
      if (String(items[i].id) !== sid) {
        next.push(items[i]);
        continue;
      }
      if (qty > 0) {
        items[i].qty = Math.max(1, Math.min(99, qty));
        next.push(items[i]);
      }
    }
    saveItems(next);
    render();
  }

  function remove(id) {
    setQty(id, 0);
  }

  function productFromCard(card) {
    if (!card) return null;
    var id = card.getAttribute("data-product-id");
    if (!id) return null;
    var p = findCatalogProduct(id);
    if (p) return p;
    var img = card.querySelector(".product-img img, .product-img img");
    var nameEl = card.querySelector(".product-name");
    var priceEl = card.querySelector(".price");
    if (!nameEl || !priceEl) return null;
    var priceText = priceEl.textContent.replace(/[^\d]/g, "");
    return {
      id: id,
      name: nameEl.textContent.trim(),
      price: parseInt(priceText, 10) || 0,
      image: img ? img.getAttribute("src") : "",
    };
  }

  function render() {
    if (!cartBadge) cartBadge = document.getElementById("cartBadge");
    if (!cartBody) cartBody = document.getElementById("cartBody");
    if (!cartFoot) cartFoot = document.getElementById("cartFoot");

    var items = loadItems();
    var totalQty = count();

    if (cartBadge) {
      cartBadge.textContent = String(totalQty);
      cartBadge.style.display = totalQty > 0 ? "flex" : "none";
    }

    if (!cartBody) return;

    if (!items.length) {
      cartBody.innerHTML =
        '<div class="cart-empty">' +
        '<svg width="56" height="56" aria-hidden="true"><use href="#icon-cart"/></svg>' +
        "<p class=\"cart-empty-title\">Your cart is empty</p>" +
        "<p class=\"cart-empty-hint\">Add some paw-some products!</p>" +
        '<a href="shop.html" class="btn-primary-nav cart-empty-cta">Continue shopping</a>' +
        "</div>";
      if (cartFoot) cartFoot.innerHTML = "";
      return;
    }

    cartBody.innerHTML =
      '<ul class="cart-list">' +
      items
        .map(function (item) {
          var line = (item.price || 0) * (item.qty || 0);
          return (
            '<li class="cart-item" data-cart-id="' +
            escapeHtml(item.id) +
            '">' +
            '<img src="' +
            escapeHtml(item.image) +
            '" alt="" width="64" height="64" loading="lazy" />' +
            '<div class="cart-item-main">' +
            '<p class="cart-item-name">' +
            escapeHtml(item.name) +
            "</p>" +
            '<div class="cart-qty-row">' +
            '<button type="button" class="cart-qty-btn" data-cart-qty="minus" aria-label="Decrease quantity">−</button>' +
            '<span class="cart-qty-val" aria-live="polite">' +
            item.qty +
            "</span>" +
            '<button type="button" class="cart-qty-btn" data-cart-qty="plus" aria-label="Increase quantity">+</button>' +
            "</div>" +
            '<p class="cart-item-price">Rs. ' +
            line.toLocaleString() +
            "</p>" +
            "</div>" +
            '<button type="button" class="cart-remove" data-cart-remove aria-label="Remove item">' +
            '<svg width="18" height="18"><use href="#icon-trash"/></svg>' +
            "</button></li>"
          );
        })
        .join("") +
      "</ul>";

    if (cartFoot) {
      cartFoot.innerHTML =
        '<div class="cart-subtotal-row">' +
        '<span>Subtotal</span><span>Rs. ' +
        subtotal().toLocaleString() +
        "</span></div>" +
        '<div class="cart-actions">' +
        '<button type="button" class="btn-outline-nav" data-cart-close-inline>Continue shopping</button>' +
        '<a href="checkout.html" class="btn-primary-nav">Checkout</a>' +
        "</div>";
    }
  }

  function open() {
    if (!cartDrawer) cartDrawer = document.getElementById("cartDrawer");
    if (!cartBackdrop) cartBackdrop = document.getElementById("cartBackdrop");
    if (!cartDrawer || !cartBackdrop) return;

    cartDrawer.hidden = false;
    requestAnimationFrame(function () {
      cartBackdrop.classList.add("is-open");
      cartDrawer.classList.add("is-open");
      isOpen = true;
      cartDrawer.setAttribute("aria-hidden", "false");
    });
    render();
    document.body.style.overflow = "hidden";
  }

  function close() {
    if (!cartDrawer) cartDrawer = document.getElementById("cartDrawer");
    if (!cartBackdrop) cartBackdrop = document.getElementById("cartBackdrop");
    if (!cartDrawer || !cartBackdrop) return;

    cartBackdrop.classList.remove("is-open");
    cartDrawer.classList.remove("is-open");
    isOpen = false;
    cartDrawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    setTimeout(function () {
      if (!isOpen) cartDrawer.hidden = true;
    }, 400);
  }

  function onDocumentClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;

    if (t.closest("[data-cart-close-inline]")) {
      close();
      return;
    }

    var addBtn = t.closest(".btn-add-cart, .product-cart-fab");
    if (addBtn) {
      e.preventDefault();
      e.stopPropagation();
      var card = addBtn.closest("[data-product-id], .product-card");
      var product = productFromCard(card);
      if (product) {
        add(product, 1);
        open();
        var mainBtn = card && card.querySelector(".btn-add-cart");
        if (mainBtn && mainBtn !== addBtn) {
          var prev = mainBtn.innerHTML;
          mainBtn.textContent = "Added!";
          setTimeout(function () {
            mainBtn.innerHTML = prev;
          }, 1200);
        }
      }
      return;
    }

    var qtyBtn = t.closest("[data-cart-qty]");
    if (qtyBtn) {
      var row = qtyBtn.closest("[data-cart-id]");
      if (!row) return;
      var id = row.getAttribute("data-cart-id");
      var items = loadItems();
      var current = 1;
      for (var i = 0; i < items.length; i++) {
        if (String(items[i].id) === String(id)) {
          current = items[i].qty;
          break;
        }
      }
      var dir = qtyBtn.getAttribute("data-cart-qty");
      setQty(id, dir === "plus" ? current + 1 : current - 1);
      return;
    }

    if (t.closest("[data-cart-remove]")) {
      var itemRow = t.closest("[data-cart-id]");
      if (itemRow) remove(itemRow.getAttribute("data-cart-id"));
    }
  }

  function bindUi() {
    cartBackdrop = document.getElementById("cartBackdrop");
    cartDrawer = document.getElementById("cartDrawer");
    cartBody = document.getElementById("cartBody");
    cartFoot = document.getElementById("cartFoot");
    cartBadge = document.getElementById("cartBadge");

    var openBtn = document.getElementById("openCart");
    var closeBtn = document.getElementById("closeCart");

    if (openBtn) openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (cartBackdrop) cartBackdrop.addEventListener("click", close);

    document.addEventListener("click", onDocumentClick);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) close();
    });

    document.addEventListener("petshop-cart-updated", render);
    render();
  }

  window.PetshopCart = {
    getItems: loadItems,
    add: add,
    setQty: setQty,
    remove: remove,
    count: count,
    subtotal: subtotal,
    render: render,
    open: open,
    close: close,
    findProduct: findCatalogProduct,
    init: bindUi,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindUi);
  } else {
    bindUi();
  }
})();
