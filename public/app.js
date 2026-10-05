const $ = (selector) => document.querySelector(selector);

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

const toast = (message) => {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  setTimeout(() => element.classList.remove("show"), 2200);
};

function shell(active, title, subtitle) {
  document.title = `Lavender · ${title}`;
  $("#app").innerHTML = `
    <aside class="side">
      <a class="brand" href="/"><img src="/logo.svg"><b>Lavender</b></a>
      <nav class="nav">
        <a class="${active === "dashboard" ? "active" : ""}" href="/">⌂ <span>Dashboard</span></a>
        <a class="${active === "customers" ? "active" : ""}" href="/customers">♙ <span>Customers</span></a>
        <a class="${active === "orders" ? "active" : ""}" href="/orders">▣ <span>Orders</span></a>
        <a class="${active === "revenue" ? "active" : ""}" href="/revenue">◈ <span>Revenue</span></a>
        <a class="${active === "analytics" ? "active" : ""}" href="/analytics">◒ <span>Analytics</span></a>
        <small>Integrations</small>
        <a class="${active === "webhooks" ? "active" : ""}" href="/webhooks">↯ <span>Webhook Logs</span></a>
        <a class="${active === "settings" ? "active" : ""}" href="/settings">⚙ <span>Settings</span></a>
      </nav>
    </aside>
    <main class="main">
      <div class="top">
        <div>
          <div class="eyebrow">Lavender CRM</div>
          <div class="title">${title}</div>
          <div class="sub">${subtitle}</div>
        </div>
        <div><a class="btn light" href="/customers">Customers</a></div>
      </div>
      <div id="page"></div>
    </main>
    <div id="toast" class="toast"></div>
  `;
}

function card(label, value) {
  return `<div class="card"><div class="label">${label}</div><div class="metric">${value}</div></div>`;
}

function ordersTable(rows, mini = false) {
  if (!rows.length) return '<div class="empty">No orders yet.</div>';

  return `
    <div style="overflow:auto">
      <table class="table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Total</th>
            ${mini ? "" : "<th>Action</th>"}
          </tr>
        </thead>
        <tbody>
          ${rows.map((order) => `
            <tr>
              <td><a class="tablelink" href="/order?id=${order.id}">#${esc(order.order_number || order.woo_order_id || order.id)}</a></td>
              <td>${order.customer_id ? `<a class="tablelink" href="/customer?id=${order.customer_id}">${esc(`${order.first_name || ""} ${order.last_name || ""}`.trim())}</a>` : esc(`${order.first_name || ""} ${order.last_name || ""}`.trim())}</td>
              <td><span class="pill">${esc(order.status)}</span></td>
              <td>${money(order.total)}</td>
              ${mini ? "" : `
                <td>
                  <button class="linkbtn" onclick="editOrder(${order.id})">Edit</button>
                  <button class="linkbtn danger" onclick="delOrder(${order.id})">Delete</button>
                </td>
              `}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function dashboard() {
  shell("dashboard", "Dashboard", "A polished local command center for your WooCommerce store.");
  const data = await api("/api/dashboard");

  $("#page").innerHTML = `
    <section class="hero">
      <div class="eyebrow">Customer intelligence</div>
      <h1>Welcome to Lavender.</h1>
      <p>Track customers, orders, revenue and WooCommerce sync activity from one lightweight local CRM.</p>
    </section>
    <div class="cards">
      ${card("Customers", data.stats.customers)}
      ${card("Orders", data.stats.orders)}
      ${card("Revenue", money(data.stats.revenue))}
      ${card("Avg. Customer", money(data.stats.avgCustomer))}
    </div>
    <div class="grid2">
      <section class="panel"><h2>Recent orders</h2>${ordersTable(data.recent, true)}</section>
      <section class="panel">
        <h2>Order status</h2>
        <div class="bars">
          ${data.byStatus.map((item) => `
            <div class="barrow">
              <span>${esc(item.status)}</span>
              <div class="bar"><i style="width:${Math.min(100, item.count * 12)}%"></i></div>
              <b>${item.count}</b>
            </div>
          `).join("") || '<div class="empty">No orders yet.</div>'}
        </div>
      </section>
    </div>
  `;
}

async function customers() {
  shell("customers", "Customers", "Manage your CRM contacts and customer value.");
  const rows = await api("/api/customers");

  $("#page").innerHTML = `
    <section class="panel">
      <div class="toolbar">
        <input id="cq" class="input" placeholder="Search name, email, phone or city">
        <button class="btn" onclick="customerModal()">+ Add customer</button>
      </div>
      <div id="ct">${customerTable(rows)}</div>
    </section>
  `;

  $("#cq").oninput = async (event) => {
    const results = await api(`/api/customers?q=${encodeURIComponent(event.target.value)}`);
    $("#ct").innerHTML = customerTable(results);
  };
}

function customerTable(rows) {
  if (!rows.length) return '<div class="empty">No customers found.</div>';

  return `
    <div style="overflow:auto">
      <table class="table">
        <thead>
          <tr><th>Customer</th><th>Email</th><th>City</th><th>Orders</th><th>Spend</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${rows.map((customer) => `
            <tr>
              <td><a class="tablelink" href="/customer?id=${customer.id}"><b>${esc(`${customer.first_name || ""} ${customer.last_name || ""}`.trim())}</b></a></td>
              <td>${esc(customer.email)}</td>
              <td>${esc(customer.city || "—")}</td>
              <td>${customer.order_count}</td>
              <td>${money(customer.total_spend)}</td>
              <td>
                <div class="actions">
                  <a class="linkbtn" href="/customer?id=${customer.id}">View details</a>
                  <button class="linkbtn" onclick='customerModal(${JSON.stringify(customer)})'>Edit</button>
                  <button class="linkbtn danger" onclick="delCustomer(${customer.id})">Delete</button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function customerModal(customer = {}) {
  const modal = document.createElement("div");
  modal.className = "modal open";

  modal.innerHTML = `
    <div class="modalbox">
      <div class="top">
        <div>
          <div class="eyebrow">CRM</div>
          <h2 style="margin:4px 0;font:700 24px Georgia;color:var(--plum)">${customer.id ? "Edit" : "New"} customer</h2>
        </div>
        <button class="linkbtn" type="button" onclick="this.closest('.modal').remove()">✕</button>
      </div>
      <form class="formgrid" id="customerForm">
        <label>First name<input class="input" name="first_name" required value="${esc(customer.first_name || "")}"></label>
        <label>Last name<input class="input" name="last_name" required value="${esc(customer.last_name || "")}"></label>
        <label class="full">Email<input class="input" name="email" type="email" required value="${esc(customer.email || "")}"></label>
        <label>Phone<input class="input" name="phone" value="${esc(customer.phone || "")}"></label>
        <label>City<input class="input" name="city" value="${esc(customer.city || "")}"></label>
        <label>Country<input class="input" name="country" value="${esc(customer.country || "IN")}"></label>
        <div class="full"><button class="btn" type="submit">${customer.id ? "Save changes" : "Create customer"}</button></div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("form").onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    data.first_name = String(data.first_name || "").trim();
    data.last_name = String(data.last_name || "").trim();
    data.email = String(data.email || "").trim();

    if (!data.first_name || !data.last_name || !data.email) {
      toast("First name, last name and email are required.");
      return;
    }

    try {
      await api(customer.id ? `/api/customers/${customer.id}` : "/api/customers", {
        method: customer.id ? "PUT" : "POST",
        body: JSON.stringify(data),
      });
      modal.remove();
      toast("Customer saved");
      customers();
    } catch (error) {
      toast(error.message);
    }
  };
}

async function customerPage() {
  const id = new URLSearchParams(location.search).get("id");
  const customer = await api(`/api/customers/${id}`);
  shell("customers", "Customer profile", "Customer relationship, value and complete order history.");

  $("#page").innerHTML = `
    <div class="grid2" style="margin-top:0">
      <section class="panel">
        <div class="eyebrow">Profile</div>
        <h2>${esc(`${customer.first_name} ${customer.last_name}`)}</h2>
        <p>${esc(customer.email)}</p>
        <p>${esc(customer.phone || "No phone")} · ${esc(customer.city || "No city")}</p>
        <div class="cards" style="grid-template-columns:1fr 1fr;margin-top:20px">
          ${card("Orders", customer.order_count)}
          ${card("Lifetime spend", money(customer.total_spend))}
        </div>
        <div style="margin-top:18px"><button class="btn" onclick='customerModal(${JSON.stringify(customer)})'>Edit customer</button></div>
      </section>
      <section class="panel"><h2>Customer orders</h2>${ordersTable(customer.orders, false)}</section>
    </div>
  `;
}

async function orderPage() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return orders();

  const order = await api(`/api/orders/${id}`);
  shell("orders", `Order #${order.order_number || order.woo_order_id || order.id}`, "Complete order information and customer context.");

  const customerName = `${order.first_name || ""} ${order.last_name || ""}`.trim() || "Unknown customer";
  const rawPayload = order.raw_payload
    ? `<pre class="codebox">${esc(JSON.stringify(order.raw_payload, null, 2))}</pre>`
    : '<div class="empty compact">No WooCommerce payload was stored for this order.</div>';

  $("#page").innerHTML = `
    <div class="detail-actions">
      <a class="backlink" href="/orders">← Back to orders</a>
      <div class="actions">
        <button class="btn light" onclick="editOrder(${order.id})">Edit order</button>
        <button class="btn" onclick="delOrderFromDetail(${order.id})">Delete order</button>
      </div>
    </div>

    <div class="detail-grid">
      <section class="panel">
        <div class="eyebrow">Order overview</div>
        <h2>Order #${esc(order.order_number || order.woo_order_id || order.id)}</h2>
        <div class="detail-list">
          <div><span>Status</span><strong><span class="pill">${esc(order.status)}</span></strong></div>
          <div><span>Total</span><strong>${money(order.total)}</strong></div>
          <div><span>Currency</span><strong>${esc(order.currency || "INR")}</strong></div>
          <div><span>Created</span><strong>${new Date(order.created_at).toLocaleString()}</strong></div>
          <div><span>WooCommerce ID</span><strong>${esc(order.woo_order_id || "—")}</strong></div>
          <div><span>Local order ID</span><strong>${esc(order.id)}</strong></div>
        </div>
      </section>

      <section class="panel">
        <div class="eyebrow">Customer</div>
        <h2>${esc(customerName)}</h2>
        <div class="detail-list">
          <div><span>Email</span><strong>${esc(order.email || "—")}</strong></div>
          <div><span>Phone</span><strong>${esc(order.phone || "—")}</strong></div>
          <div><span>City</span><strong>${esc(order.city || "—")}</strong></div>
          <div><span>Country</span><strong>${esc(order.country || "—")}</strong></div>
          <div><span>Customer orders</span><strong>${esc(order.order_count || 0)}</strong></div>
          <div><span>Lifetime spend</span><strong>${money(order.total_spend)}</strong></div>
        </div>
        <a class="btn" style="display:inline-block;margin-top:18px" href="/customer?id=${order.customer_id}">View customer profile</a>
      </section>
    </div>

    <section class="panel detail-panel">
      <div class="eyebrow">WooCommerce data</div>
      <h2>Original webhook payload</h2>
      ${rawPayload}
    </section>
  `;
}

async function delOrderFromDetail(id) {
  if (!confirm("Delete this order?")) return;
  await api(`/api/orders/${id}`, { method: "DELETE" });
  toast("Order deleted");
  setTimeout(() => { window.location.href = "/orders"; }, 250);
}

async function orders() {
  shell("orders", "Orders", "Create, update and remove orders while keeping customer totals in sync.");
  const rows = await api("/api/orders");

  $("#page").innerHTML = `
    <section class="panel">
      <div class="toolbar">
        <select id="os" class="select" style="max-width:220px">
          <option value="">All statuses</option>
          <option>pending</option><option>processing</option><option>completed</option><option>cancelled</option><option>refunded</option>
        </select>
        <button class="btn" onclick="orderModal()">+ Add order</button>
      </div>
      <div id="ot">${ordersTable(rows, false)}</div>
    </section>
  `;

  $("#os").onchange = async (event) => {
    const results = await api(`/api/orders?status=${encodeURIComponent(event.target.value)}`);
    $("#ot").innerHTML = ordersTable(results, false);
  };
}

async function orderModal(order = {}) {
  const customersList = await api("/api/customers");
  const modal = document.createElement("div");
  modal.className = "modal open";

  modal.innerHTML = `
    <div class="modalbox">
      <div class="top">
        <h2 style="margin:0;font:700 24px Georgia;color:var(--plum)">${order.id ? "Edit" : "New"} order</h2>
        <button class="linkbtn" type="button" onclick="this.closest('.modal').remove()">✕</button>
      </div>
      <form class="formgrid">
        <label>Customer<select class="select" name="customer_id" required>
          ${customersList.map((customer) => `<option value="${customer.id}" ${customer.id == order.customer_id ? "selected" : ""}>${esc(`${customer.first_name} ${customer.last_name}`)} · ${esc(customer.email)}</option>`).join("")}
        </select></label>
        <label>Status<select class="select" name="status">
          ${["pending", "processing", "completed", "cancelled", "refunded"].map((status) => `<option ${status === (order.status || "pending") ? "selected" : ""}>${status}</option>`).join("")}
        </select></label>
        <label>Order number<input class="input" name="order_number" value="${esc(order.order_number || "")}"></label>
        <label>Total<input class="input" name="total" type="number" step="0.01" min="0" value="${order.total || 0}"></label>
        <label>Currency<input class="input" name="currency" value="${esc(order.currency || "INR")}"></label>
        <div class="full"><button class="btn" type="submit">${order.id ? "Save order" : "Create order"}</button></div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector("form").onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api(order.id ? `/api/orders/${order.id}` : "/api/orders", {
        method: order.id ? "PUT" : "POST",
        body: JSON.stringify(data),
      });
      modal.remove();
      toast("Order saved");
      if (location.pathname === "/order") {
        await orderPage();
      } else {
        orders();
      }
    } catch (error) {
      toast(error.message);
    }
  };
}

async function editOrder(id) {
  const order = (await api("/api/orders")).find((item) => item.id == id);
  if (order) orderModal(order);
}

async function delOrder(id) {
  if (!confirm("Delete this order?")) return;
  await api(`/api/orders/${id}`, { method: "DELETE" });
  toast("Order deleted");
  orders();
}

async function delCustomer(id) {
  if (!confirm("Delete this customer and their orders?")) return;
  await api(`/api/customers/${id}`, { method: "DELETE" });
  toast("Customer deleted");
  customers();
}

async function revenue() {
  shell("revenue", "Revenue", "A focused view of sales performance from your local CRM data.");
  const dashboardData = await api("/api/dashboard");
  const ordersData = await api("/api/orders");
  const revenueByStatus = dashboardData.byStatus || [];
  const maxRevenue = Math.max(1, ...revenueByStatus.map((item) => Number(item.revenue || 0)));

  $("#page").innerHTML = `
    <div class="cards">
      ${card("Total revenue", money(dashboardData.stats.revenue))}
      ${card("Total orders", dashboardData.stats.orders)}
      ${card("Average order", money(dashboardData.stats.orders ? dashboardData.stats.revenue / dashboardData.stats.orders : 0))}
      ${card("Customers", dashboardData.stats.customers)}
    </div>
    <section class="panel" style="margin-top:18px">
      <h2>Revenue by order status</h2>
      <div class="bars">
        ${revenueByStatus.map((item) => `
          <div class="barrow">
            <span>${esc(item.status)}</span>
            <div class="bar"><i style="width:${Number(item.revenue || 0) / maxRevenue * 100}%"></i></div>
            <b>${money(item.revenue)}</b>
          </div>
        `).join("") || '<div class="empty">Add orders to see revenue.</div>'}
      </div>
    </section>
    <section class="panel" style="margin-top:18px">
      <h2>Revenue orders</h2>
      ${ordersTable(ordersData, true)}
    </section>
  `;
}

async function analytics() {
  shell("analytics", "Analytics", "Simple local insights from your SQLite CRM data.");
  const data = await api("/api/dashboard");
  const maxRevenue = Math.max(1, ...data.byStatus.map((item) => Number(item.revenue || 0)));

  $("#page").innerHTML = `
    <div class="cards">
      ${card("Customers", data.stats.customers)}
      ${card("Orders", data.stats.orders)}
      ${card("Revenue", money(data.stats.revenue))}
      ${card("Average value", money(data.stats.avgCustomer))}
    </div>
    <section class="panel" style="margin-top:18px">
      <h2>Revenue by order status</h2>
      <div class="bars">
        ${data.byStatus.map((item) => `
          <div class="barrow">
            <span>${esc(item.status)}</span>
            <div class="bar"><i style="width:${Number(item.revenue || 0) / maxRevenue * 100}%"></i></div>
            <b>${money(item.revenue)}</b>
          </div>
        `).join("") || '<div class="empty">Add orders to see analytics.</div>'}
      </div>
    </section>
  `;
}

async function webhooks() {
  shell("webhooks", "Webhook Logs", "See the latest WooCommerce synchronization events.");
  const rows = await api("/api/webhooks");

  $("#page").innerHTML = `
    <section class="panel">
      <h2>Recent webhook activity</h2>
      ${rows.length ? `
        <div style="overflow:auto">
          <table class="table">
            <thead><tr><th>Time</th><th>Event</th><th>Woo order</th><th>Status</th><th>Message</th></tr></thead>
            <tbody>
              ${rows.map((item) => `
                <tr>
                  <td>${new Date(item.created_at).toLocaleString()}</td>
                  <td>${esc(item.event_type)}</td>
                  <td>${esc(item.woo_order_id || "—")}</td>
                  <td><span class="pill">${esc(item.status)}</span></td>
                  <td>${esc(item.message)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : '<div class="empty">No webhook events yet.</div>'}
    </section>
  `;
}

function settings() {
  shell("settings", "Settings", "Local configuration notes for your WooCommerce integration.");
  $("#page").innerHTML = `
    <section class="panel">
      <div class="eyebrow">WooCommerce</div>
      <h2>Webhook connection</h2>
      <p class="sub">Your local endpoint is:</p>
      <input class="input" readonly value="${location.origin}/api/webhook/woocommerce">
      <p class="sub" style="margin-top:18px">In WooCommerce, create an Order webhook pointing to this endpoint. Keep API keys and webhook secrets on the server or in environment variables—never in the frontend.</p>
      <h2 style="margin-top:28px">Free local stack</h2>
      <p>Lavender uses Node.js, Express, SQLite and browser-side JavaScript. No paid database, hosting, chart service or SaaS subscription is required for this prototype.</p>
      <div style="margin-top:18px"><span class="pill">SQLite</span> <span class="pill">WooCommerce Webhooks</span> <span class="pill">CRUD</span> <span class="pill">Local</span></div>
    </section>
  `;
}

function route() {
  const path = location.pathname;
  if (path === "/" || path === "/index.html") return dashboard();
  if (path === "/customers") return customers();
  if (path === "/customer") return customerPage();
  if (path === "/orders") return orders();
  if (path === "/order") return orderPage();
  if (path === "/revenue") return revenue();
  if (path === "/analytics") return analytics();
  if (path === "/webhooks") return webhooks();
  if (path === "/settings") return settings();
  return dashboard();
}

window.addEventListener("popstate", route);
route();
