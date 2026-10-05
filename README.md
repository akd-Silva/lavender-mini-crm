# Lavender — WooCommerce Mini CRM

Lavender is a lightweight, local-first customer relationship management (CRM) dashboard built for WooCommerce order data.

It provides a clean interface for managing customers and orders, viewing customer/order details, tracking revenue, monitoring webhook activity, and testing WooCommerce integrations without requiring a paid external service.

## ✨ Features

### Dashboard
- Customer count
- Order count
- Total revenue
- Average customer spend
- Recent orders
- Order status overview

### Customers
- Create customers
- View customers
- Search customers
- Edit customer details
- Delete customers
- View a dedicated customer details page
- View customer contact information
- View total spend and order count
- View complete customer order history

### Orders
- Create orders
- View orders
- Filter orders by status
- Edit orders
- Delete orders
- Click an order to open a dedicated order details page
- View complete order information
- View associated customer information

### Revenue & Analytics
- Dedicated Revenue page
- Total revenue
- Revenue by order status
- Average order value
- Revenue/order summaries
- Analytics dashboard

### WooCommerce Integration
- WooCommerce order webhook endpoint
- Automatically creates or updates customers
- Automatically creates or updates orders
- Recalculates customer order count and total spend
- Stores webhook activity in webhook logs
- Stores the original WooCommerce payload for reference

### Local Database
- SQLite database
- No external database service required
- Database is created automatically when the server starts

## 🛠 Tech Stack

- **Node.js**
- **Express.js**
- **SQLite**
- **sqlite3**
- **HTML5**
- **CSS3**
- **Vanilla JavaScript**
- **CORS**
- **Body Parser**

## 📁 Project Structure

```text
lavender-mini-crm/
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── .gitignore
├── package.json
├── README.md
└── server.js
```

The SQLite database (`lavender.db`) is generated locally and should not be committed to GitHub.

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/akd-Silva/lavender-mini-crm.git
cd lavender-mini-crm
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start Lavender

```bash
npm start
```

The application will run at:

```text
http://localhost:3000
```

Open that address in your browser.

## 🖥️ Application Pages

| Page | Purpose |
|---|---|
| Dashboard | Overall CRM summary |
| Customers | Customer management |
| Customer Details | Full customer profile and order history |
| Orders | Order management |
| Order Details | Full order and customer information |
| Revenue | Revenue reporting |
| Analytics | Order/revenue analysis |
| Webhook Logs | WooCommerce webhook activity |
| Settings | Local application/API information |

## 🔗 API Endpoints

### Health

```http
GET /api/health
```

### Dashboard

```http
GET /api/dashboard
```

### Customers

```http
GET    /api/customers
GET    /api/customers/:id
POST   /api/customers
PUT    /api/customers/:id
DELETE /api/customers/:id
```

### Orders

```http
GET    /api/orders
GET    /api/orders/:id
POST   /api/orders
PUT    /api/orders/:id
DELETE /api/orders/:id
```

### Webhook Logs

```http
GET /api/webhooks
```

### WooCommerce Webhook

```http
POST /api/webhook/woocommerce
```

## 🛒 WooCommerce Webhook

Configure WooCommerce to send order events to:

```text
http://YOUR-SERVER:3000/api/webhook/woocommerce
```

For local testing, you can send a sample order from PowerShell.

### Example webhook

```powershell
$body = @{
  id = 3005
  number = "3005"
  status = "completed"
  currency = "INR"
  total = "3299.00"
  date_created = "2026-10-05T16:30:00"
  customer_id = 72
  billing = @{
    first_name = "Riya"
    last_name = "Deshmukh"
    email = "riya.deshmukh@example.com"
    phone = "+91 8765432109"
    city = "Mapusa"
    country = "IN"
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Uri "http://localhost:3000/api/webhook/woocommerce" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

After a successful webhook:

1. The customer is created or updated.
2. The order is created or updated.
3. Customer order count is recalculated.
4. Customer total spend is recalculated.
5. The webhook event is recorded in Webhook Logs.

## 🧪 Testing Checklist

After starting the application, verify:

- [ ] Dashboard loads
- [ ] Customer can be created
- [ ] Customer can be edited
- [ ] Customer can be deleted
- [ ] Customer details page opens
- [ ] Customer order history appears
- [ ] Order can be created
- [ ] Order can be edited
- [ ] Order can be deleted
- [ ] Order details page opens
- [ ] Revenue updates after an order
- [ ] Analytics displays order/revenue information
- [ ] WooCommerce webhook creates an order
- [ ] WooCommerce webhook creates/updates the customer
- [ ] Customer spend updates after webhook
- [ ] Webhook Logs records the event

## 🔐 Git & Security

The following local files should not be committed:

```text
node_modules/
lavender.db
.env
*.log
```

The project `.gitignore` is configured to exclude these files.

Do not commit real WooCommerce API keys, webhook secrets, customer credentials, or production customer data.

## 💡 Local Development

Start the server:

```bash
npm start
```

Stop the server:

```text
Ctrl + C
```

The SQLite database will be created automatically in the project directory.

If you want to reset the local demo database, stop the server and remove:

```text
lavender.db
```

Then restart the application.

## 🎯 Project Goal

Lavender demonstrates a practical mini-CRM workflow around WooCommerce:

```text
WooCommerce
     │
     │ Order Webhook
     ▼
Lavender API
     │
     ├── Customers
     ├── Orders
     ├── Revenue
     ├── Analytics
     └── Webhook Logs
             │
             ▼
        SQLite Database
```

The project is designed to be simple to run locally while demonstrating customer management, order management, data relationships, webhook processing, and a polished CRM-style interface.

## 📄 License

This project is intended as a prototype/demo application for the WooCommerce integration challenge.
