# Lavender Final Multi-Page CRM

## Run
1. Extract this folder and open it in VS Code.
2. Open a terminal in the project folder.
3. Run `npm install`
4. Run `npm start`
5. Open http://localhost:3000

## Pages
- Dashboard: /
- Customers: /customers
- Customer profile: /customer?id=1
- Orders: /orders
- Revenue: /revenue
- Analytics: /analytics
- Webhook Logs: /webhooks
- Settings: /settings

## WooCommerce
POST orders to:
`http://localhost:3000/api/webhook/woocommerce`

The webhook creates/updates customers and orders and records webhook activity.

## CRUD
Customers: GET/POST/PUT/DELETE `/api/customers`
Orders: GET/POST/PUT/DELETE `/api/orders`

## Testing
- `public/app.js` has been syntax-checked with Node.js.
- Customer forms trim and validate first name, last name and email before submitting.

## Notes
SQLite database is created automatically as `lavender.db`.
No paid service is required.

## Detail pages
- Click any customer name or **View details** to open the full customer profile at `/customer?id=...`.
- Click any order number to open the full order page at `/order?id=...`.
- Order detail pages show status, total, timestamps, WooCommerce ID, customer information, and the stored WooCommerce webhook payload when available.
