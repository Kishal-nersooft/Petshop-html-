/**
 * PetShop wishlist — localStorage-backed saved products.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "petshop-wishlist";

  function loadIds() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(function (id) {
          return String(id);
        })
        .filter(function (id, i, arr) {
          return id && arr.indexOf(id) === i;
        });
    } catch (e) {
      return [];
    }
  }

  function saveIds(ids) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {
      /* quota / private mode */
    }
    document.dispatchEvent(new CustomEvent("petshop-wishlist-updated"));
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

  function has(id) {
    var sid = String(id);
    return loadIds().indexOf(sid) !== -1;
  }

  function add(id) {
    var sid = String(id);
    if (!sid) return false;
    var ids = loadIds();
    if (ids.indexOf(sid) !== -1) return true;
    ids.push(sid);
    saveIds(ids);
    return true;
  }

  function remove(id) {
    var sid = String(id);
    var ids = loadIds().filter(function (x) {
      return x !== sid;
    });
    saveIds(ids);
    return true;
  }

  function toggle(id) {
    if (has(id)) {
      remove(id);
      return false;
    }
    add(id);
    return true;
  }

  function count() {
    return loadIds().length;
  }

  function getProducts() {
    return loadIds()
      .map(function (id) {
        return findCatalogProduct(id);
      })
      .filter(Boolean);
  }

  function updateBadges() {
    var n = count();
    document.querySelectorAll("[data-wishlist-badge]").forEach(function (el) {
      el.textContent = String(n);
      el.hidden = n === 0;
    });
  }

  document.addEventListener("petshop-wishlist-updated", updateBadges);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateBadges);
  } else {
    updateBadges();
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-wish]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var on = toggle(btn.getAttribute("data-wish"));
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Remove from wishlist" : "Add to wishlist");
  });

  window.PetshopWishlist = {
    has: has,
    add: add,
    remove: remove,
    toggle: toggle,
    count: count,
    getIds: loadIds,
    getProducts: getProducts,
    findProduct: findCatalogProduct,
  };
})();
