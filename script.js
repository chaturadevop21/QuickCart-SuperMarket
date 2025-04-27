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
  fetchProducts();


});
// ✅ Fetch products from Firebase
function fetchProducts() {
  database.ref("products").once('value')  // important: products/products
    .then(snapshot => {
      if (snapshot.exists()) {
        products = snapshot.val();
        console.log("Products fetched:", products);
      } else {
        console.log("No products found!");
      }
    })
    .catch(error => {
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
}

function processPayment() {
  let totalAmount = document.getElementById("totalAmount").innerText;
  if (parseFloat(totalAmount) === 0) {
    showAlert("No items in the cart! Add items before proceeding to payment.");
      return;
  }

  function updateProductQuantities() {
    Object.keys(cart).forEach(productId => {
      const purchasedQuantity = cart[productId].quantity;
      const currentQuantity = products[productId].quantity;
  
      if (currentQuantity >= purchasedQuantity) {
        const newQuantity = currentQuantity - purchasedQuantity;
  
        database.ref(`products/${productId}`).update({
          quantity: newQuantity
        })
        .then(() => {
          console.log(`✅ Updated quantity for ${products[productId].name}: ${newQuantity}`);
        })
        .catch(error => {
          console.error(`❌ Error updating quantity for ${products[productId].name}:`, error);
        });
      } else {
        console.warn(`⚠️ Not enough stock for ${products[productId].name}`);
      }
    });
  }
  // Show payment modal
  document.getElementById("paymentModal").style.display = "flex";
  // ✅ Reduce product quantity in Firebase after successful payment
  const updates = {}; // prepare all updates first

  Object.keys(cart).forEach(productId => {
    const item = cart[productId];
    const newQuantity = products[productId].quantity - item.quantity;
    if (newQuantity >= 0) {
      updates[`products/${productId}/quantity`] = newQuantity; // prepare update
    }
  });

  // Now update database
  database.ref().update(updates)
    .then(() => {
      console.log("Quantities updated successfully in database!");
    })
    .catch(error => {
      console.error("Error updating quantities:", error);
    });

  setTimeout(() => {
      document.getElementById("paymentMessage").innerText = "🎉 Payment Successful!";
      document.getElementById("paymentMessage").style.color = "#28a745";

      setTimeout(() => {
          document.getElementById("paymentModal").style.display = "none";
          updateProductQuantities();
          location.reload(); // Reloads the page to clear the cart
      }, 2000);
  }, 1500);
}
database.ref('products/' + productId).update({
  quantity: updatedQuantity
});
// ✅ Show products page
function showProducts() {
  document.getElementById("homePage").classList.remove("active");
  document.getElementById("productsPage").classList.add("active");

  const container = document.getElementById("productsContainer");
  container.innerHTML = "<h3>Loading...</h3>";

  // Wait for products to load
  if (Object.keys(products).length === 0) {
    setTimeout(showProducts, 300); // Try again after 300ms
    return;
  }

  container.innerHTML = ""; // Clear

  Object.keys(products).forEach(productId => {
    const product = products[productId];
    const card = `
      <div class="product-card">
        <img src="${product.image}" alt="${product.name}" onerror="this.src='images/default.jpg';">
        <h3>${product.name}</h3>
        <p>ID: ${product.id}</p>
        <p>Price: ₹${product.price}</p>
        <button onclick="addToCart('${productId}')">Add to Cart</button>
      </div>
    `;
    container.innerHTML += card;
  });
}


// ✅ Scan product
function handleEnter(event) {
  if (event.key === "Enter")
  {
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
}

function increaseQuantity(productId) {
  const product = products[productId];

  if (cart[productId].quantity < product.quantity) {
    cart[productId].quantity += 1;
    updateCartDisplay();
  } else {
    showAlert("Cannot add more. Only " + product.quantity + " available.");
  }
}

function decreaseQuantity(productId) {
  if (cart[productId].quantity > 1) {
    cart[productId].quantity -= 1;
  } else {
    delete cart[productId];
  }
  updateCartDisplay();
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

  auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      const user = userCredential.user;
      return database.ref('users/' + user.uid).set({
        name: name,
        phone: phone,
        email: email
      });
    })
    .then(() => {
      showAlert("Registration successful! Please login.", "success");
    
      setTimeout(() => {
        showLogin(); // move to login page AFTER 2 seconds
      }, 2000); // 2 seconds wait (or 5000 if you made popup time 5 sec)
      
    })
    .catch(error => {
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

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      showAlert("Login successful!", "#28a745"); // ✅ Success (green background)
      document.getElementById("loginPage").classList.remove("active");
      document.getElementById("homePage").classList.add("active");
      setTimeout(() => {
        document.getElementById("scannedNumber").focus();
      }, 300);
    })

    .catch(error => {
      console.error(error);
    
      const errorCode = error.code;
    
      if (errorCode === "auth/user-not-found") {
        showAlert("Account not found.", "#ff4d4d"); // 🔴 No account exists
      } else if (errorCode === "auth/wrong-password" || errorCode === "auth/invalid-login-credentials") {
        showAlert("Wrong password,Please Try again.", "#ff4d4d"); // 🔴 Wrong password
      } else {
        showAlert("Something went wrong. Please try again.", "#ff4d4d"); // 🔴 Some unknown issue
      }
    });
  }

function logout() {
  showAlert("Logged out successfully!");
  location.reload();
}

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
  
