(function (global, factory) {
    if (typeof define === "function" && define.amd) {
      define([], factory);
    } else if (typeof exports !== "undefined") {
      factory();
    } else {
      var mod = {
        exports: {}
      };
      factory();
      global.repl = mod.exports;
    }
  })(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function () {
    "use strict";
  
    function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
    function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
    function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
    // ✅ Firebase Configuration
    var firebaseConfig = {
      apiKey: "AIzaSyCBF4IkCLCDNMIsOaVLhWQzKRUgu5Z6Wjs",
      authDomain: "project-trolley.firebaseapp.com",
      databaseURL: "https://project-trolley-default-rtdb.firebaseio.com",
      projectId: "project-trolley",
      storageBucket: "project-trolley.appspot.com",
      messagingSenderId: "9076600376",
      appId: "1:9076600376:web:0165fafaadf4276b5e00cd",
      measurementId: "G-S2CTMTRXP0"
    };
  
    // ✅ Initialize Firebase
    firebase.initializeApp(firebaseConfig);
  
    // ✅ References
    var database = firebase.database();
    var auth = firebase.auth();
    var products = {};
    var cart = {};
    document.addEventListener("DOMContentLoaded", function () {
      (function () {
        emailjs.init("bk2Vm0Xl8N90ELyW7");
      })();
      fetchProducts();
    });
    // ✅ Fetch products from Firebase
    function fetchProducts() {
      database.ref("products").once('value') // important: products/products
      .then(function (snapshot) {
        if (snapshot.exists()) {
          products = snapshot.val();
          console.log("Products fetched:", products);
        } else {
          console.log("No products found!");
        }
      })["catch"](function (error) {
        console.error("Error fetching products:", error);
      });
    }
    function generateBill() {
      var billTable = document.getElementById("billDetails");
      var subtotal = 0;
      billTable.innerHTML = "\n      <tr>\n          <th>Item</th>\n          <th>Qty</th>\n          <th>Unit Price</th>\n          <th>Total</th>\n      </tr>\n  ";
      if (Object.keys(cart).length === 0) {
        showAlert("Your cart is empty! Please add items before generating the bill.");
        return;
      }
      Object.keys(cart).forEach(function (productId) {
        var item = cart[productId];
        var itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        var row = document.createElement("tr");
        row.innerHTML = "<td>".concat(item.name, "</td>\n                       <td>").concat(item.quantity, "</td>\n                       <td>\u20B9").concat(item.price.toFixed(2), "</td>\n                       <td>\u20B9").concat(itemTotal.toFixed(2), "</td>");
        billTable.appendChild(row);
      });
      var tax = subtotal * 0.05;
      var total = subtotal + tax;
      document.getElementById("subtotalAmount").innerText = subtotal.toFixed(2);
      document.getElementById("taxAmount").innerText = tax.toFixed(2);
      document.getElementById("totalAmount").innerText = total.toFixed(2);
      document.getElementById("payNowButton").disabled = false;
      document.getElementById("payNowButton").classList.add("ready-to-pay");
    }
  
    // ✅ FIXED: Corrected `processPayment` to ensure invoice email sends properly
    function processPayment() {
      var totalAmount = parseFloat(document.getElementById("totalAmount").innerText);
      if (isNaN(totalAmount) || totalAmount <= 0) {
        showAlert("Cart is empty!", "error");
        return;
      }
      var options = {
        key: "rzp_live_pD8bgC6DxB4zzI",
        amount: totalAmount * 100,
        currency: "INR",
        name: "QuickCart SuperMarket",
        description: "Test Transaction",
        handler: function handler(response) {
          document.getElementById("paymentModal").style.display = "flex";
          document.getElementById("paymentMessage").innerText = "🎉 Payment Successful!";
          document.getElementById("paymentMessage").style.color = "#28a745";
          updateProductQuantities();
          var user = firebase.auth().currentUser;
          if (user) {
            database.ref("users/" + user.uid).once("value").then(function (snapshot) {
              var userData = snapshot.val();
              if (!userData || !userData.email) {
                alert("User data not found or missing email. Invoice not sent.");
                setTimeout(function () {
                  return location.reload();
                }, 2000);
                return;
              }
              var order_id = "ORD" + Date.now();
              var subtotal = Object.values(cart).reduce(function (acc, item) {
                return acc + item.price * item.quantity;
              }, 0);
              var gst = subtotal * 0.05;
              var total = subtotal + gst;
              sendInvoiceEmail(userData, cart, order_id, subtotal, gst, total).then(function () {
                setTimeout(function () {
                  document.getElementById("paymentModal").style.display = "none";
                  location.reload();
                }, 2000);
              })["catch"](function (error) {
                console.error("Email failed:", error);
                alert("Invoice email failed to send.");
                setTimeout(function () {
                  return location.reload();
                }, 2000);
              });
            });
          } else {
            alert("User not logged in. Cannot send email.");
            setTimeout(function () {
              return location.reload();
            }, 2000);
          }
        },
        prefill: {
          name: "",
          email: "",
          contact: ""
        },
        theme: {
          color: "#28a745"
        }
      };
      var phone = document.getElementById("userPhone").value.trim();
      if (!phone) {
        showAlert("Please enter your phone number before proceeding.");
        return;
      }
      options.prefill.contact = phone;
      var payBtn = document.getElementById("payNowButton");
payBtn.addEventListener("click", function () {
  var rzp = new Razorpay(options);
  rzp.on('payment.failed', function (response) {
    alert("Oops! Something went wrong.\nPayment Failed\nReason: " + response.error.description);
  });
  rzp.open(); // ✅ This now works in iOS 12 Safari
});;
    
    function generateItemsHTML(cart) {
      var html = "<tbody>";
      Object.keys(cart).forEach(function (productId) {
        var item = cart[productId];
        var total = (item.price * item.quantity).toFixed(2);
        html += "\n      <tr>\n        <td style=\"border: 1px solid #ccc; padding: 8px;\">".concat(item.name, "</td>\n        <td style=\"border: 1px solid #ccc; padding: 8px;\">").concat(item.quantity, "</td>\n        <td style=\"border: 1px solid #ccc; padding: 8px;\">\u20B9").concat(item.price, "</td>\n        <td style=\"border: 1px solid #ccc; padding: 8px;\">\u20B9").concat(total, "</td>\n      </tr>");
      });
      html += "</tbody>";
      return html;
    }
    function sendInvoiceEmail(userData, cart, order_id, subtotal, gst, total) {
      var serviceID = "service_b20ut2g";
      var templateID = "template_gmht4vj";
      var publicKey = "bk2Vm0Xl8N90ELyW7"; // ✅ Make sure this is correct
  
      var itemsHTML = generateItemsHTML(cart);
      var date = new Date().toLocaleDateString("en-IN");
      var templateParams = {
        to_name: userData.name,
        email: userData.email,
        order_id: order_id,
        items: itemsHTML,
        subtotal: subtotal.toFixed(2),
        gst: gst.toFixed(2),
        total: total.toFixed(2),
        date: date
      };
      console.log("📧 Sending invoice email with:", templateParams);
      // ✅ Return the promise for proper chaining
      return emailjs.send(serviceID, templateID, templateParams, publicKey).then(function () {
        // Store order in user's Firebase account
        return database.ref("users/" + firebase.auth().currentUser.uid + "/orders/" + order_id).set({
          order_id: order_id,
          date: date,
          subtotal: subtotal.toFixed(2),
          gst: gst.toFixed(2),
          total: total.toFixed(2),
          items: Object.values(cart).map(function (item) {
            return {
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.price.toFixed(2),
              total: (item.price * item.quantity).toFixed(2)
            };
          })
        });
      });
    }
    var items = Object.keys(cart).map(function (productId) {
      var item = cart[productId];
      return {
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.price * item.quantity
      };
    });
    var orderData = {
      order_id: order_id,
      date: new Date().toLocaleDateString("en-IN"),
      items: items,
      subtotal: subtotal.toFixed(2),
      gst: gst.toFixed(2),
      total: total.toFixed(2)
    };
    database.ref("users/" + user.uid + "/orders/" + order_id).set(orderData);
    function updateProductQuantities() {
      Object.keys(cart).forEach(function (productId) {
        var purchasedQuantity = cart[productId].quantity;
        var currentQuantity = products[productId].quantity;
        if (currentQuantity >= purchasedQuantity) {
          var newQuantity = currentQuantity - purchasedQuantity;
          database.ref("products/".concat(productId)).update({
            quantity: newQuantity
          }).then(function () {
            console.log("\u2705 Updated quantity for ".concat(products[productId].name, ": ").concat(newQuantity));
          })["catch"](function (error) {
            console.error("\u274C Error updating quantity for ".concat(products[productId].name, ":"), error);
          });
        } else {
          console.warn("\u26A0\uFE0F Not enough stock for ".concat(products[productId].name));
        }
      });
    }
    function hideAllPages() {
      document.querySelectorAll('.page').forEach(function (page) {
        page.classList.remove('active');
      });
    }
    function showAccountPage() {
      hideAllPages(); // hide all other sections
      document.getElementById("accountPage").classList.add("active");
      var user = firebase.auth().currentUser;
      if (user) {
        var uid = user.uid;
        database.ref("users/" + uid).once("value").then(function (snapshot) {
          var userData = snapshot.val();
          document.getElementById("accName").textContent = userData.name || "N/A";
          document.getElementById("accEmail").textContent = userData.email || "N/A";
          document.getElementById("accPhone").textContent = userData.phone || "N/A";
          // password is not stored here for security reasons
        })["catch"](function (error) {
          console.error("Error fetching user data:", error);
          showAlert("Unable to load account info", "error");
        });
      } else {
        showAlert("User not logged in", "error");
      }
    }
    function handleOptionClick(option) {
      // Hide the dropdown
      document.getElementById('profileDropdown').style.display = 'none';
  
      // Handle the option logic
      if (option === 'faq') {
        showFAQPage();
      } else if (option === 'orders') {
        showOrdersPage();
      } else if (option === 'privacy') {
        showPrivacyPage();
      } else if (option === 'account') {
        showAccountPage();
      }
    }
    function showFAQs() {
      hideAllPages(); // This hides all other sections
      document.getElementById("faqsPage").classList.add("active");
    }
  
    // ✅ Show products page
    function showProducts() {
      document.getElementById("homePage").classList.remove("active");
      document.getElementById("productsPage").classList.add("active");
  
      // New container IDs
      var bakeryBiscuits = document.getElementById("bakeryBiscuitsSection");
      var drinks = document.getElementById("drinksSection");
      var snacks = document.getElementById("snacksSection");
      var health = document.getElementById("healthSection");
  
      // Clear old content
      bakeryBiscuits.innerHTML = "";
      drinks.innerHTML = "";
      snacks.innerHTML = "";
      health.innerHTML = "";
      Object.keys(products).forEach(function (productId) {
        var product = products[productId];
        var isOutOfStock = product.quantity <= 0;
        var card = "\n    <div class=\"product-card\" id=\"product-".concat(productId, "\">\n      <img src=\"").concat(product.image, "\" alt=\"").concat(product.name, "\" onerror=\"this.src='images/default.jpg';\">\n      <h3>").concat(product.name, "</h3>\n      <p>Price: \u20B9").concat(product.price, "</p>\n      ").concat(isOutOfStock ? "\n        <p style=\"color: red; font-weight: bold;\">Out of Stock</p>\n          <button disabled style=\"background-color: grey; cursor: not-allowed;\">About Product</button>\n        " : "\n\n      <button onclick=\"showProductDetails('".concat(productId, "')\">About Product</button>\n  "), "\n      <div class=\"product-popup\" id=\"popup-").concat(productId, "\" style=\"display:none;\">\n        <strong>").concat(product.name, "</strong><br>\n        ID: ").concat(product.id, "<br>\n        ").concat(getProductDescription(productId), "\n      </div>\n    </div>\n  ");
        var name = product.name.toLowerCase();
        if (name.includes("cookie") || name.includes("biscuit") || name.includes("chocolate")) {
          bakeryBiscuits.innerHTML += card;
        } else if (name.includes("drink") || name.includes("milkshake") || name.includes("coffee")) {
          drinks.innerHTML += card;
        } else if (name.includes("chips") || name.includes("namkeen") || name.includes("bhujiya")) {
          snacks.innerHTML += card;
        } else if (name.includes("soap") || name.includes("moov") || name.includes("spray")) {
          health.innerHTML += card;
        }
      });
      document.getElementById("productsPage").scrollIntoView({
        behavior: 'smooth'
      });
    }
  
    // ✅ Scan product
    function handleEnter(event) {
      if (event.key === "Enter") {
        scanProduct();
      }
    }
    function scanProduct() {
      var scannedID = document.getElementById("scannedNumber").value.trim();
      if (!scannedID) {
        showAlert("Please scan a product ID.");
        return;
      }
      var product = products[scannedID];
      if (!product) {
        showAlert("Product not found!");
        return;
      }
      addToCart(scannedID);
      document.getElementById("scannedNumber").value = "";
    }
  
    // ✅ Add to Cart
    function addToCart(productId) {
      var product = products[productId];
      if (!product) {
        showAlert("Error: Product not found!");
        return;
      }
      // ✅ Check available quantity
      if (product.quantity <= 0) {
        showAlert("Sorry, this product is out of stock.");
        return;
      }
      if (cart[productId]) {
        // Check if adding more exceeds stock
        if (cart[productId].quantity < product.quantity) {
          cart[productId].quantity += 1;
        } else {
          showAlert("You cannot add more. Only " + product.quantity + " items available.");
        }
      } else {
        cart[productId] = {
          name: product.name,
          price: product.price,
          quantity: 1
        };
        document.getElementById("payNowButton").disabled = true;
        document.getElementById("payNowButton").classList.remove("ready-to-pay");
      }
      updateCartDisplay();
    }
  
    // ✅ Update cart display
    function updateCartDisplay() {
      var cartList = document.getElementById("cartList");
      cartList.innerHTML = "\n    <tr>\n      <th>Product Name (ID)</th>\n      <th>Quantity</th>\n      <th>Total Price</th>\n      <th>Remove</th>\n    </tr>\n  ";
      var totalAmount = 0;
      Object.keys(cart).forEach(function (productId) {
        var item = cart[productId];
        var row = "\n      <tr>\n        <td>".concat(item.name, " (").concat(productId, ")</td>\n        <td>\n          <button onclick=\"decreaseQuantity('").concat(productId, "')\">\u2212</button>\n          ").concat(item.quantity, "\n          <button onclick=\"increaseQuantity('").concat(productId, "')\">+</button>\n        </td>\n        <td>\u20B9").concat((item.price * item.quantity).toFixed(2), "</td>\n        <td><button onclick=\"removeFromCart('").concat(productId, "')\">Remove</button></td>\n      </tr>\n    ");
        cartList.innerHTML += row;
        totalAmount += item.price * item.quantity;
      });
      document.getElementById("totalAmount").innerText = totalAmount.toFixed(2);
    }
    function removeFromCart(productId) {
      delete cart[productId];
      updateCartDisplay();
      document.getElementById("payNowButton").disabled = true;
      document.getElementById("payNowButton").classList.remove("ready-to-pay");
    }
    function increaseQuantity(productId) {
      var product = products[productId];
      if (cart[productId].quantity < product.quantity) {
        cart[productId].quantity += 1;
        updateCartDisplay();
      } else {
        showAlert("Cannot add more. Only " + product.quantity + " available.");
      }
      document.getElementById("payNowButton").disabled = true;
      document.getElementById("payNowButton").classList.remove("ready-to-pay");
    }
    function decreaseQuantity(productId) {
      if (cart[productId].quantity > 1) {
        cart[productId].quantity -= 1;
      } else {
        delete cart[productId];
      }
      updateCartDisplay();
      document.getElementById("payNowButton").disabled = true;
      document.getElementById("payNowButton").classList.remove("ready-to-pay");
    }
  
    // ✅ Login / Register / Logout functions (same as before, no issues)
  
    function register() {
      var name = document.getElementById("name").value.trim();
      var phone = document.getElementById("phone").value.trim();
      var email = document.getElementById("registerEmail").value.trim();
      var password = document.getElementById("registerPassword").value.trim();
      if (!name || !phone || !email || !password) {
        showAlert("Please fill all fields.");
        return;
      }
      var passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
      if (!passwordRegex.test(password)) {
        showAlert("Password must have 8 characters, 1 number, and 1 special character.");
        return;
      }
      auth.createUserWithEmailAndPassword(email, password).then(function (userCredential) {
        var user = userCredential.user;
        return database.ref('users/' + user.uid).set({
          name: name,
          phone: phone,
          email: email
        });
      }).then(function () {
        showAlert("Registration successful! Please login.", "success");
        setTimeout(function () {
          showLogin(); // move to login page AFTER 2 seconds
        }, 1000); // 2 seconds wait (or 5000 if you made popup time 5 sec)
      })["catch"](function (error) {
        console.error(error);
        showAlert(error.message);
      });
    }
    function login() {
      var email = document.getElementById("loginEmail").value.trim();
      var password = document.getElementById("loginPassword").value.trim();
      if (!email || !password) {
        showAlert("Please enter email and password.");
        return;
      }
      auth.signInWithEmailAndPassword(email, password).then(function () {
        showAlert("Login successful!", "success");
        setTimeout(function () {
          document.getElementById("loginPage").classList.remove("active");
          document.getElementById("homePage").classList.add("active");
          document.getElementById("scannedNumber").focus();
        }, 2000); // ⏳ Wait for 2 seconds (popup shows), THEN go to home page
        auth.signInWithEmailAndPassword(email, password).then(function () {
          showAlert("Login successful!", "success");
          document.getElementById("chatbotContainer").style.display = "block";
          setTimeout(function () {
            var _dfMessenger$shadowRo;
            document.getElementById("loginPage").style.display = "none";
            document.getElementById("registerPage").style.display = "none";
            document.getElementById("homePage").style.display = "block";
            document.getElementById("scannedNumber").focus();
            var dfMessenger = document.querySelector("df-messenger");
            var iframe = dfMessenger === null || dfMessenger === void 0 || (_dfMessenger$shadowRo = dfMessenger.shadowRoot) === null || _dfMessenger$shadowRo === void 0 ? void 0 : _dfMessenger$shadowRo.querySelector("iframe");
            if (iframe) {
              iframe.contentWindow.postMessage({
                event: "df-emit-custom-event",
                eventName: "WELCOME",
                data: {}
              }, "*");
            }
          }, 1000);
        });
      })["catch"](function (error) {
        console.error(error);
        if (error.code === "auth/user-not-found") {
          showAlert("Account not found.", "#ff4d4d"); // 🔥 Account doesn't exist
        } else if (error.code === "auth/wrong-password") {
          showAlert("Wrong password, try again.", "#ff4d4d"); // 🔥 Wrong password
        } else {
          showAlert(error.message, "#ff4d4d"); // other unknown error fallback
        }
      });
    }
    2000;
    function logout() {
      showAlert("Logged out successfully!");
      document.getElementById("chatbotContainer").style.display = "none";
      location.reload();
    }
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        database.ref("users/" + user.uid).once("value").then(function (snapshot) {
          var _snapshot$val;
          var name = ((_snapshot$val = snapshot.val()) === null || _snapshot$val === void 0 ? void 0 : _snapshot$val.name) || "My Account";
          document.getElementById("profileBtn").title = name;
        });
      }
    });
  
    // ✅ Switching Pages
    function showRegister() {
      document.getElementById("loginPage").classList.remove("active");
      document.getElementById("registerPage").classList.add("active");
    }
    function showLogin() {
      document.getElementById("registerPage").classList.remove("active");
      document.getElementById("loginPage").classList.add("active");
    }
    function showHome() {
      hideAllPages(); // This hides all other `.page` sections
      document.getElementById("productsPage").classList.remove("active");
      document.getElementById("homePage").classList.add("active");
    }
  
    // 🔥 Correct — paste this OUTSIDE any function
    function showAlert(message) {
      var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "success";
      var alertBox = document.getElementById("customAlert");
      alertBox.innerText = message;
      if (type === "success") {
        alertBox.style.background = "#28a745"; // ✅ Green for Success
      } else if (type === "error") {
        alertBox.style.background = "#ff0019"; // ❌ Red for Error
      }
      alertBox.style.color = "white";
      alertBox.style.display = "block";
      setTimeout(function () {
        alertBox.style.display = "none";
      }, 2000);
    }
    function showProductDetails(productId) {
      // First, close any open popups
      document.querySelectorAll('.product-popup').forEach(function (popup) {
        popup.style.display = 'none';
      });
  
      // Then open the clicked product's popup
      var popup = document.getElementById("popup-".concat(productId));
      if (popup) {
        popup.style.display = 'block';
      }
    }
    function getProductDescription(productId) {
      switch (productId) {
        case "0012182728":
          return "Flavored dairy-based drinks ideal for a quick energy boost.";
        case "0039771949":
          return " Ready-to-drink Nescafé brews for instant freshness.";
        case "0039854003":
          return "Cinthol’s refreshing body soap for everyday freshness and hygiene.";
        case "0039854025":
          return "Treat yourself with classic crunchy chocolate bars.";
        case "0039854036":
          return "All-time favorite potato chips in different flavors for snacking fun.";
        case "0039855169":
          return " Light and crisp snacks to pair with tea or coffee.";
        case "0039855180":
          return "Carbonated favorites like Pepsi, Coke, and Sprite for refreshment anytime.";
        case "0039855191":
          return "Rich choco-filled indulgent cookies, perfect for dessert cravings.";
        default:
          return "No description available.";
      }
    }
    document.addEventListener("DOMContentLoaded", function () {
      var profileBtn = document.getElementById("profileBtn");
      var dropdown = document.getElementById("profileDropdown");
      if (profileBtn && dropdown) {
        profileBtn.addEventListener("click", function () {
          dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
        });
        window.addEventListener("click", function (event) {
          if (!event.target.closest(".profile-menu")) {
            dropdown.style.display = "none";
          }
        });
      }
    });
    function toggleProfileDropdown() {
      var dropdown = document.getElementById("profileDropdown");
      dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
    }
    function showOrdersPage() {
      hideAllPages();
      document.getElementById("ordersPage").classList.add("active");
      window.scrollTo({
        top: 0,
        behavior: 'auto'
      });
      var user = firebase.auth().currentUser;
      var container = document.getElementById("ordersList");
      container.innerHTML = "<p>Loading orders...</p>";
      if (!user) return;
      database.ref("users/" + user.uid + "/orders").once("value").then(function (snapshot) {
        container.innerHTML = "";
        if (!snapshot.exists()) {
          container.innerHTML = "<p>No orders found.</p>";
          return;
        }
        snapshot.forEach(function (orderSnap) {
          var order = orderSnap.val();
          var itemsHTML = "";
          var _iterator = _createForOfIteratorHelper(order.items),
            _step;
          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var _products$item$name;
              var item = _step.value;
              var productImage = ((_products$item$name = products[item.name]) === null || _products$item$name === void 0 ? void 0 : _products$item$name.image) || 'images/default.jpg'; // fallback
              itemsHTML += "\n            <li style=\"margin-bottom:10px;\">\n              <img src=\"".concat(productImage, "\" alt=\"").concat(item.name, "\" style=\"width:50px; height:50px; border-radius:6px; margin-right:10px; vertical-align:middle;\">\n              ").concat(item.name, " - ").concat(item.quantity, " x \u20B9").concat(item.unitPrice, " = \u20B9").concat(item.total, "\n            </li>");
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }
          container.innerHTML += "\n          <div class=\"order-card\" style=\"border: 1px solid #ccc; padding: 15px; margin-bottom: 20px;\">\n            <h4>\uD83E\uDDFE <span style=\"color:green;\">Order ID: ".concat(order.order_id, "</span></h4>\n            <p><strong>Date:</strong> ").concat(order.date, "</p>\n            <ul>").concat(itemsHTML, "</ul>\n            <p><strong>Total Paid:</strong> \u20B9").concat(order.total, "</p>\n          </div>");
        });
      })["catch"](function (error) {
        container.innerHTML = "<p>Error loading orders.</p>";
        console.error("Error fetching orders:", error);
      });
    }
    function hideDropdown() {
      document.querySelectorAll('.dropdown-content').forEach(function (drop) {
        drop.style.display = 'none';
      });
    }
    function goToHome() {
      hideAllPages(); // hide all other pages properly
      document.getElementById("homePage").style.display = "block";
      document.getElementById("homePage").classList.add("active");
    }
}})
