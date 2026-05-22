/**
 * PetShop checkout — address, confirm, and order summary.
 */
(function () {
  "use strict";

  var cart = window.PetshopCart;
  if (!cart) return;

  var app = document.querySelector("[data-checkout-app]");
  if (!app) return;

  var panelAddress = app.querySelector('[data-checkout-panel="address"]');
  var panelConfirm = app.querySelector('[data-checkout-panel="confirm"]');
  var panelPaid = app.querySelector('[data-checkout-panel="paid"]');
  var itemsEl = app.querySelector("[data-checkout-items]");
  var totalsEl = app.querySelector("[data-checkout-totals]");
  var form = document.getElementById("checkout-address-form");
  var confirmBilling = document.querySelector("[data-confirm-billing]");
  var paidBilling = document.querySelector("[data-paid-billing]");
  var paidPaymethod = document.querySelector("[data-paid-paymethod]");
  var paidTotal = document.querySelector("[data-paid-total]");
  var paidOrderId = document.querySelector("[data-paid-order-id]");
  var paidCommunication = document.querySelector("[data-paid-communication]");

  var steps = document.querySelectorAll("[data-checkout-step]");
  var savedAddress = null;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatRs(n) {
    return "Rs. " + (Number(n) || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function deliveryFee() {
    var checked = app.querySelector('input[name="delivery"]:checked');
    return checked ? parseInt(checked.value, 10) || 0 : 0;
  }

  function renderSummary() {
    var items = cart.getItems();
    if (!items.length) {
      if (itemsEl) {
        itemsEl.innerHTML =
          '<p class="checkout-empty-summary">Your cart is empty. <a href="shop.html">Browse the shop</a> to add items.</p>';
      }
      if (totalsEl) totalsEl.innerHTML = "";
      return;
    }

    if (itemsEl) {
      itemsEl.innerHTML = items
        .map(function (item) {
          var line = (item.price || 0) * (item.qty || 0);
          return (
            '<div class="checkout-summary-item">' +
            '<img src="' +
            escapeHtml(item.image) +
            '" alt="" width="52" height="52" loading="lazy" />' +
            '<div>' +
            '<p class="checkout-summary-name">' +
            escapeHtml(item.name) +
            "</p>" +
            '<p class="checkout-summary-meta">Qty: ' +
            item.qty +
            "</p>" +
            '<p class="checkout-summary-price">' +
            formatRs(line) +
            "</p></div></div>"
          );
        })
        .join("");
    }

    var sub = cart.subtotal();
    var ship = deliveryFee();
    var grand = sub + ship;

    if (totalsEl) {
      totalsEl.innerHTML =
        '<div class="checkout-totals">' +
        '<div class="checkout-total-row"><span>Subtotal</span><span>' +
        formatRs(sub) +
        "</span></div>" +
        '<div class="checkout-total-row"><span>Delivery</span><span>' +
        (ship ? formatRs(ship) : "Free") +
        "</span></div>" +
        '<div class="checkout-total-row grand"><span>Total</span><span>' +
        formatRs(grand) +
        "</span></div></div>";
    }
  }

  var stepOrder = ["review", "address", "confirm"];

  function syncStepSeparators() {
    var seps = document.querySelectorAll(".checkout-step-sep");
    var review = document.querySelector('[data-checkout-step="review"]');
    var address = document.querySelector('[data-checkout-step="address"]');
    if (seps[0]) {
      seps[0].classList.toggle(
        "checkout-step-sep--done",
        !!(review && review.classList.contains("checkout-step--done"))
      );
    }
    if (seps[1]) {
      seps[1].classList.toggle(
        "checkout-step-sep--done",
        !!(address && address.classList.contains("checkout-step--done"))
      );
    }
  }

  function setStep(name) {
    var active = name === "paid" ? "confirm" : name;
    var activeIdx = stepOrder.indexOf(active);
    if (activeIdx < 0) activeIdx = 1;

    steps.forEach(function (step) {
      var key = step.getAttribute("data-checkout-step");
      var idx = stepOrder.indexOf(key);
      step.classList.remove("checkout-step--done", "checkout-step--current", "checkout-step--pending");
      if (idx < activeIdx) {
        step.classList.add("checkout-step--done");
        step.removeAttribute("aria-current");
      } else if (idx === activeIdx && name !== "paid") {
        step.classList.add("checkout-step--current");
        step.setAttribute("aria-current", "step");
      } else if (name === "paid") {
        step.classList.add("checkout-step--done");
        step.removeAttribute("aria-current");
      } else {
        step.classList.add("checkout-step--pending");
        step.removeAttribute("aria-current");
      }
    });

    if (name === "paid") {
      document.querySelectorAll(".checkout-step-sep").forEach(function (sep) {
        sep.classList.add("checkout-step-sep--done");
      });
    } else {
      syncStepSeparators();
    }
  }

  function showPanel(name) {
    if (panelAddress) panelAddress.hidden = name !== "address";
    if (panelConfirm) panelConfirm.hidden = name !== "confirm";
    if (panelPaid) panelPaid.hidden = name !== "paid";
    setStep(name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function readForm() {
    if (!form) return null;
    var fd = new FormData(form);
    return {
      firstName: String(fd.get("firstName") || "").trim(),
      lastName: String(fd.get("lastName") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      phonePrefix: String(fd.get("phonePrefix") || "+94"),
      phone: String(fd.get("phone") || "").trim(),
      company: String(fd.get("company") || "").trim(),
      tin: String(fd.get("tin") || "").trim(),
      street1: String(fd.get("street1") || "").trim(),
      street2: String(fd.get("street2") || "").trim(),
      city: String(fd.get("city") || "").trim(),
      zip: String(fd.get("zip") || "").trim(),
      shipSame: fd.get("shipSame") === "1",
    };
  }

  function formatAddress(a) {
    if (!a) return "";
    var lines = [
      a.firstName + " " + a.lastName,
      a.email,
      a.phonePrefix + " " + a.phone,
    ];
    if (a.company) lines.push(a.company);
    if (a.tin) lines.push("TIN: " + a.tin);
    lines.push(a.street1);
    if (a.street2) lines.push(a.street2);
    lines.push(a.city + " " + a.zip);
    if (a.shipSame) lines.push("(Shipping to same address)");
    return lines.join("\n");
  }

  function validateAddress(a) {
    return (
      a &&
      a.firstName &&
      a.lastName &&
      a.email &&
      a.phone &&
      a.street1 &&
      a.city &&
      a.zip
    );
  }

  var continueBtn = document.getElementById("checkout-continue");
  if (continueBtn) {
    continueBtn.addEventListener("click", function () {
      if (!cart.getItems().length) {
        alert("Your cart is empty. Add products before checkout.");
        window.location.href = "shop.html";
        return;
      }
      savedAddress = readForm();
      if (!validateAddress(savedAddress)) {
        if (form && typeof form.reportValidity === "function") form.reportValidity();
        else alert("Please fill in all required address fields.");
        return;
      }
      if (confirmBilling) confirmBilling.textContent = formatAddress(savedAddress);
      showPanel("confirm");
      renderSummary();
    });
  }

  var editBtn = document.getElementById("checkout-edit-address");
  if (editBtn) {
    editBtn.addEventListener("click", function () {
      showPanel("address");
      setStep("address");
    });
  }

  var payBtn = document.getElementById("checkout-pay");
  if (payBtn) {
    payBtn.addEventListener("click", function () {
      if (!cart.getItems().length) {
        alert("Your cart is empty.");
        return;
      }
      var payInput = app.querySelector('input[name="pay"]:checked');
      var payLabel = payInput ? payInput.getAttribute("data-pay-label") || "Cash on Delivery" : "Cash on Delivery";
      var orderId = "S" + String(Date.now()).slice(-6);
      var grand = cart.subtotal() + deliveryFee();

      if (paidOrderId) paidOrderId.textContent = "Order " + orderId;
      if (paidPaymethod) paidPaymethod.textContent = payLabel;
      if (paidTotal) paidTotal.textContent = formatRs(grand);
      if (paidBilling) paidBilling.textContent = formatAddress(savedAddress);
      if (paidCommunication) paidCommunication.textContent = orderId;

      showPanel("paid");
      cart.getItems().forEach(function (item) {
        cart.remove(item.id);
      });
      renderSummary();
    });
  }

  app.addEventListener("change", function (e) {
    if (e.target && e.target.name === "delivery") renderSummary();
  });

  document.addEventListener("petshop-cart-updated", renderSummary);

  if (!cart.getItems().length) {
    var pay = document.getElementById("checkout-pay");
    var cont = document.getElementById("checkout-continue");
    if (pay) pay.disabled = true;
    if (cont) cont.disabled = true;
  }

  renderSummary();
})();
