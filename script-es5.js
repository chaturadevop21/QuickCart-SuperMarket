// ✅ Firebase Configuration
const firebaseConfig = {
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
  const database = firebase.database();
  const auth = firebase.auth();
  let products = {};
  let cart = {};
  document.addEventListener("DOMContentLoaded", () => {
    (function () {
      emailjs.init("bk2Vm0Xl8N90ELyW7");
    })();
    fetchProducts();
  });
  // ✅ Fetch products from Firebase
  function fetchProducts() {
    database.ref("products").once('value') // important: products/products
    .then(snapshot => {
      if (snapshot.exists()) {
        products = snapshot.val();
        console.log("Products fetched:", products);
      } else {
        console.log("No products found!");
      }
    }).catch(error => {
      console.error("Error fetching products:", error);
    });
  }
  function generateBill() {
    let billTable = document.getElementById("billDetails");
    let subtotal = 0;
    billTable.innerHTML = `
        <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>
        </tr>
    `;
    if (Object.keys(cart).length === 0) {
      showAlert("Your cart is empty! Please add items before generating the bill.");
      return;
    }
    Object.keys(cart).forEach(productId => {
      let item = cart[productId];
      let itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      let row = document.createElement("tr");
      row.innerHTML = `<td>${item.name}</td>
                         <td>${item.quantity}</td>
                         <td>₹${item.price.toFixed(2)}</td>
                         <td>₹${itemTotal.toFixed(2)}</td>`;
      billTable.appendChild(row);
    });
    let tax = subtotal * 0.05;
    let total = subtotal + tax;
    document.getElementById("subtotalAmount").innerText = subtotal.toFixed(2);
    document.getElementById("taxAmount").innerText = tax.toFixed(2);
    document.getElementById("totalAmount").innerText = total.toFixed(2);
    document.getElementById("payNowButton").disabled = false;
    document.getElementById("payNowButton").classList.add("ready-to-pay");
  }
  
  // ✅ FIXED: Corrected `processPayment` to ensure invoice email sends properly
  function processPayment() {
    let totalAmount = parseFloat(document.getElementById("totalAmount").innerText);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      showAlert("Cart is empty!", "error");
      return;
    }
    const options = {
      key: "rzp_live_pD8bgC6DxB4zzI",
      amount: totalAmount * 100,
      currency: "INR",
      name: "QuickCart SuperMarket",
      description: "Test Transaction",
      handler: function (response) {
        document.getElementById("paymentModal").style.display = "flex";
        document.getElementById("paymentMessage").innerText = "🎉 Payment Successful!";
        document.getElementById("paymentMessage").style.color = "#28a745";
        updateProductQuantities();
        const user = firebase.auth().currentUser;
        if (user) {
          database.ref("users/" + user.uid).once("value").then(snapshot => {
            const userData = snapshot.val();
            if (!userData || !userData.email) {
              alert("User data not found or missing email. Invoice not sent.");
              setTimeout(() => location.reload(), 2000);
              return;
            }
            const order_id = "ORD" + Date.now();
            const subtotal = Object.values(cart).reduce((acc, item) => acc + item.price * item.quantity, 0);
            const gst = subtotal * 0.05;
            const total = subtotal + gst;
            sendInvoiceEmail(userData, cart, order_id, subtotal, gst, total).then(() => {
              setTimeout(() => {
                document.getElementById("paymentModal").style.display = "none";
                location.reload();
              }, 2000);
            }).catch(error => {
              console.error("Email failed:", error);
              alert("Invoice email failed to send.");
              setTimeout(() => location.reload(), 2000);
            });
          });
        } else {
          alert("User not logged in. Cannot send email.");
          setTimeout(() => location.reload(), 2000);
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
    const phone = document.getElementById("userPhone").value.trim();
    if (!phone) {
      showAlert("Please enter your phone number before proceeding.");
      return;
    }
    options.prefill.contact = phone;
    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (response) {
      alert("Oops! Something went wrong.\nPayment Failed\nReason: " + response.error.description);
    });
    rzp.open();
  }
  function generateItemsHTML(cart) {
    let html = `<tbody>`;
    Object.keys(cart).forEach(productId => {
      const item = cart[productId];
      const total = (item.price * item.quantity).toFixed(2);
      html += `
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px;">${item.name}</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${item.quantity}</td>
          <td style="border: 1px solid #ccc; padding: 8px;">₹${item.price}</td>
          <td style="border: 1px solid #ccc; padding: 8px;">₹${total}</td>
        </tr>`;
    });
    html += `</tbody>`;
    return html;
  }
  function sendInvoiceEmail(userData, cart, order_id, subtotal, gst, total) {
    const serviceID = "service_b20ut2g";
    const templateID = "template_gmht4vj";
    const publicKey = "bk2Vm0Xl8N90ELyW7"; // ✅ Make sure this is correct
  
    const itemsHTML = generateItemsHTML(cart);
    const date = new Date().toLocaleDateString("en-IN");
    const templateParams = {
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
    return emailjs.send(serviceID, templateID, templateParams, publicKey).then(() => {
      // Store order in user's Firebase account
      return database.ref("users/" + firebase.auth().currentUser.uid + "/orders/" + order_id).set({
        order_id: order_id,
        date: date,
        subtotal: subtotal.toFixed(2),
        gst: gst.toFixed(2),
        total: total.toFixed(2),
        items: Object.values(cart).map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price.toFixed(2),
          total: (item.price * item.quantity).toFixed(2)
        }))
      });
    });
  }
  const items = Object.keys(cart).map(productId => {
    const item = cart[productId];
    return {
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.price * item.quantity
    };
  });
  const orderData = {
    order_id,
    date: new Date().toLocaleDateString("en-IN"),
    items: items,
    subtotal: subtotal.toFixed(2),
    gst: gst.toFixed(2),
    total: total.toFixed(2)
  };
  database.ref("users/" + user.uid + "/orders/" + order_id).set(orderData);
  function updateProductQuantities() {
    Object.keys(cart).forEach(productId => {
      const purchasedQuantity = cart[productId].quantity;
      const currentQuantity = products[productId].quantity;
      if (currentQuantity >= purchasedQuantity) {
        const newQuantity = currentQuantity - purchasedQuantity;
        database.ref(`products/${productId}`).update({
          quantity: newQuantity
        }).then(() => {
          console.log(`✅ Updated quantity for ${products[productId].name}: ${newQuantity}`);
        }).catch(error => {
          console.error(`❌ Error updating quantity for ${products[productId].name}:`, error);
        });
      } else {
        console.warn(`⚠️ Not enough stock for ${products[productId].name}`);
      }
    });
  }
  function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
  }
  function showAccountPage() {
    hideAllPages(); // hide all other sections
    document.getElementById("accountPage").classList.add("active");
    const user = firebase.auth().currentUser;
    if (user) {
      const uid = user.uid;
      database.ref("users/" + uid).once("value").then(snapshot => {
        const userData = snapshot.val();
        document.getElementById("accName").textContent = userData.name || "N/A";
        document.getElementById("accEmail").textContent = userData.email || "N/A";
        document.getElementById("accPhone").textContent = userData.phone || "N/A";
        // password is not stored here for security reasons
      }).catch(error => {
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
    const bakeryBiscuits = document.getElementById("bakeryBiscuitsSection");
    const drinks = document.getElementById("drinksSection");
    const snacks = document.getElementById("snacksSection");
    const health = document.getElementById("healthSection");
  
    // Clear old content
    bakeryBiscuits.innerHTML = "";
    drinks.innerHTML = "";
    snacks.innerHTML = "";
    health.innerHTML = "";
    Object.keys(products).forEach(productId => {
      const product = products[productId];
      const isOutOfStock = product.quantity <= 0;
      const card = `
      <div class="product-card" id="product-${productId}">
        <img src="${product.image}" alt="${product.name}" onerror="this.src='images/default.jpg';">
        <h3>${product.name}</h3>
        <p>Price: ₹${product.price}</p>
        ${isOutOfStock ? `
          <p style="color: red; font-weight: bold;">Out of Stock</p>
            <button disabled style="background-color: grey; cursor: not-allowed;">About Product</button>
          ` : `
  
        <button onclick="showProductDetails('${productId}')">About Product</button>
    `}
        <div class="product-popup" id="popup-${productId}" style="display:none;">
          <strong>${product.name}</strong><br>
          ID: ${product.id}<br>
          ${getProductDescription(productId)}
        </div>
      </div>
    `;
      const name = product.name.toLowerCase();
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
    const scannedID = document.getElementById("scannedNumber").value.trim();
    if (!scannedID) {
      showAlert("Please scan a product ID.");
      return;
    }
    const product = products[scannedID];
    if (!product) {
      showAlert("Product not found!");
      return;
    }
    addToCart(scannedID);
    document.getElementById("scannedNumber").value = "";
  }
  
  // ✅ Add to Cart
  function addToCart(productId) {
    const product = products[productId];
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
    const cartList = document.getElementById("cartList");
    cartList.innerHTML = `
      <tr>
        <th>Product Name (ID)</th>
        <th>Quantity</th>
        <th>Total Price</th>
        <th>Remove</th>
      </tr>
    `;
    let totalAmount = 0;
    Object.keys(cart).forEach(productId => {
      const item = cart[productId];
      const row = `
        <tr>
          <td>${item.name} (${productId})</td>
          <td>
            <button onclick="decreaseQuantity('${productId}')">−</button>
            ${item.quantity}
            <button onclick="increaseQuantity('${productId}')">+</button>
          </td>
          <td>₹${(item.price * item.quantity).toFixed(2)}</td>
          <td><button onclick="removeFromCart('${productId}')">Remove</button></td>
        </tr>
      `;
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
    const product = products[productId];
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
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    if (!name || !phone || !email || !password) {
      showAlert("Please fill all fields.");
      return;
    }
    const passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(password)) {
      showAlert("Password must have 8 characters, 1 number, and 1 special character.");
      return;
    }
    auth.createUserWithEmailAndPassword(email, password).then(userCredential => {
      const user = userCredential.user;
      return database.ref('users/' + user.uid).set({
        name: name,
        phone: phone,
        email: email
      });
    }).then(() => {
      showAlert("Registration successful! Please login.", "success");
      setTimeout(() => {
        showLogin(); // move to login page AFTER 2 seconds
      }, 1000); // 2 seconds wait (or 5000 if you made popup time 5 sec)
    }).catch(error => {
      console.error(error);
      showAlert(error.message);
    });
  }
  function login() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    if (!email || !password) {
      showAlert("Please enter email and password.");
      return;
    }
    auth.signInWithEmailAndPassword(email, password).then(() => {
      showAlert("Login successful!", "success");
      setTimeout(() => {
        document.getElementById("loginPage").classList.remove("active");
        document.getElementById("homePage").classList.add("active");
        document.getElementById("scannedNumber").focus();
      }, 2000); // ⏳ Wait for 2 seconds (popup shows), THEN go to home page
      auth.signInWithEmailAndPassword(email, password).then(() => {
        showAlert("Login successful!", "success");
        document.getElementById("chatbotContainer").style.display = "block";
        setTimeout(() => {
          var _dfMessenger$shadowRo;
          document.getElementById("loginPage").style.display = "none";
          document.getElementById("registerPage").style.display = "none";
          document.getElementById("homePage").style.display = "block";
          document.getElementById("scannedNumber").focus();
          const dfMessenger = document.querySelector("df-messenger");
          const iframe = dfMessenger === null || dfMessenger === void 0 || (_dfMessenger$shadowRo = dfMessenger.shadowRoot) === null || _dfMessenger$shadowRo === void 0 ? void 0 : _dfMessenger$shadowRo.querySelector("iframe");
          if (iframe) {
            iframe.contentWindow.postMessage({
              event: "df-emit-custom-event",
              eventName: "WELCOME",
              data: {}
            }, "*");
          }
        }, 1000);
      });
    }).catch(error => {
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
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      database.ref("users/" + user.uid).once("value").then(snapshot => {
        var _snapshot$val;
        const name = ((_snapshot$val = snapshot.val()) === null || _snapshot$val === void 0 ? void 0 : _snapshot$val.name) || "My Account";
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
  function showAlert(message, type = "success") {
    const alertBox = document.getElementById("customAlert");
    alertBox.innerText = message;
    if (type === "success") {
      alertBox.style.background = "#28a745"; // ✅ Green for Success
    } else if (type === "error") {
      alertBox.style.background = "#ff0019"; // ❌ Red for Error
    }
    alertBox.style.color = "white";
    alertBox.style.display = "block";
    setTimeout(() => {
      alertBox.style.display = "none";
    }, 2000);
  }
  function showProductDetails(productId) {
    // First, close any open popups
    document.querySelectorAll('.product-popup').forEach(popup => {
      popup.style.display = 'none';
    });
  
    // Then open the clicked product's popup
    const popup = document.getElementById(`popup-${productId}`);
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
  document.addEventListener("DOMContentLoaded", () => {
    const profileBtn = document.getElementById("profileBtn");
    const dropdown = document.getElementById("profileDropdown");
    if (profileBtn && dropdown) {
      profileBtn.addEventListener("click", () => {
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
    const dropdown = document.getElementById("profileDropdown");
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
  }
  function showOrdersPage() {
    hideAllPages();
    document.getElementById("ordersPage").classList.add("active");
    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });
    const user = firebase.auth().currentUser;
    const container = document.getElementById("ordersList");
    container.innerHTML = "<p>Loading orders...</p>";
    if (!user) return;
    database.ref("users/" + user.uid + "/orders").once("value").then(snapshot => {
      container.innerHTML = "";
      if (!snapshot.exists()) {
        container.innerHTML = "<p>No orders found.</p>";
        return;
      }
      snapshot.forEach(orderSnap => {
        const order = orderSnap.val();
        let itemsHTML = "";
        for (let item of order.items) {
          var _products$item$name;
          const productImage = ((_products$item$name = products[item.name]) === null || _products$item$name === void 0 ? void 0 : _products$item$name.image) || 'images/default.jpg'; // fallback
          itemsHTML += `
              <li style="margin-bottom:10px;">
                <img src="${productImage}" alt="${item.name}" style="width:50px; height:50px; border-radius:6px; margin-right:10px; vertical-align:middle;">
                ${item.name} - ${item.quantity} x ₹${item.unitPrice} = ₹${item.total}
              </li>`;
        }
        container.innerHTML += `
            <div class="order-card" style="border: 1px solid #ccc; padding: 15px; margin-bottom: 20px;">
              <h4>🧾 <span style="color:green;">Order ID: ${order.order_id}</span></h4>
              <p><strong>Date:</strong> ${order.date}</p>
              <ul>${itemsHTML}</ul>
              <p><strong>Total Paid:</strong> ₹${order.total}</p>
            </div>`;
      });
    }).catch(error => {
      container.innerHTML = "<p>Error loading orders.</p>";
      console.error("Error fetching orders:", error);
    });
  }
  function hideDropdown() {
    document.querySelectorAll('.dropdown-content').forEach(drop => {
      drop.style.display = 'none';
    });
  }
  function goToHome() {
    hideAllPages(); // hide all other pages properly
    document.getElementById("homePage").style.display = "block";
    document.getElementById("homePage").classList.add("active");
  }
