
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new sqlite3.Database(path.join(__dirname, "lavender.db"));

app.use(cors());
app.use(bodyParser.json({limit:"2mb"}));
app.use(express.static(path.join(__dirname,"public")));

const run = (sql,p=[]) => new Promise((res,rej)=>db.run(sql,p,function(e){e?rej(e):res({id:this.lastID,changes:this.changes})}));
const get = (sql,p=[]) => new Promise((res,rej)=>db.get(sql,p,(e,r)=>e?rej(e):res(r)));
const all = (sql,p=[]) => new Promise((res,rej)=>db.all(sql,p,(e,r)=>e?rej(e):res(r)));

db.serialize(()=>{
  db.run("PRAGMA foreign_keys = ON");
  db.run(`CREATE TABLE IF NOT EXISTS customers(
    id INTEGER PRIMARY KEY AUTOINCREMENT, woo_customer_id INTEGER,
    first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    phone TEXT, city TEXT, country TEXT, total_spend REAL DEFAULT 0,
    order_count INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS orders(
    id INTEGER PRIMARY KEY AUTOINCREMENT, woo_order_id INTEGER UNIQUE,
    customer_id INTEGER NOT NULL, order_number TEXT, status TEXT DEFAULT 'pending',
    total REAL DEFAULT 0, currency TEXT DEFAULT 'INR', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    raw_json TEXT, FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE)`);
  db.run(`CREATE TABLE IF NOT EXISTS webhook_logs(
    id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT, woo_order_id INTEGER,
    status TEXT, message TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
});

function cleanCustomer(b){
  return {
    first_name:String(b.first_name||"").trim(),
    last_name:String(b.last_name||"").trim(),
    email:String(b.email||"").trim().toLowerCase(),
    phone:String(b.phone||"").trim(),
    city:String(b.city||"").trim(),
    country:String(b.country||"IN").trim().toUpperCase()
  };
}
async function recalc(id){
  const s=await get("SELECT COALESCE(SUM(total),0) spend, COUNT(*) cnt FROM orders WHERE customer_id=? AND status NOT IN ('cancelled','refunded')",[id]);
  await run("UPDATE customers SET total_spend=?,order_count=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",[s.spend,s.cnt,id]);
}

app.get("/api/health",(req,res)=>res.json({ok:true,service:"Lavender CRM"}));

app.get("/api/dashboard",async(req,res)=>{
  try{
    const c=await get("SELECT COUNT(*) n FROM customers");
    const o=await get("SELECT COUNT(*) n FROM orders");
    const r=await get("SELECT COALESCE(SUM(total),0) n FROM orders WHERE status NOT IN ('cancelled','refunded')");
    const a=await get("SELECT COALESCE(AVG(total_spend),0) n FROM customers");
    const recent=await all(`SELECT o.*,c.first_name,c.last_name,c.email FROM orders o JOIN customers c ON c.id=o.customer_id ORDER BY o.created_at DESC LIMIT 8`);
    const byStatus=await all("SELECT status,COUNT(*) count,COALESCE(SUM(total),0) revenue FROM orders GROUP BY status ORDER BY count DESC");
    res.json({stats:{customers:c.n,orders:o.n,revenue:r.n,avgCustomer:a.n},recent,byStatus});
  }catch(e){res.status(500).json({error:e.message})}
});

app.get("/api/customers",async(req,res)=>{
  try{
    const q=String(req.query.q||"").trim();
    const rows=await all(`SELECT * FROM customers
      WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ? OR city LIKE ?
      ORDER BY updated_at DESC`,[`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`]);
    res.json(rows);
  }catch(e){res.status(500).json({error:e.message})}
});
app.get("/api/customers/:id",async(req,res)=>{
  try{
    const c=await get("SELECT * FROM customers WHERE id=?",[req.params.id]);
    if(!c)return res.status(404).json({error:"Customer not found"});
    c.orders=await all("SELECT * FROM orders WHERE customer_id=? ORDER BY created_at DESC",[req.params.id]);
    res.json(c);
  }catch(e){res.status(500).json({error:e.message})}
});
app.post("/api/customers",async(req,res)=>{
  try{
    const c=cleanCustomer(req.body);
    if(!c.first_name||!c.last_name||!c.email)return res.status(400).json({error:"First name, last name and email are required"});
    const r=await run(`INSERT INTO customers(first_name,last_name,email,phone,city,country) VALUES(?,?,?,?,?,?)`,
      [c.first_name,c.last_name,c.email,c.phone,c.city,c.country]);
    res.status(201).json(await get("SELECT * FROM customers WHERE id=?",[r.id]));
  }catch(e){res.status(400).json({error:e.message.includes("UNIQUE")?"Email already exists":e.message})}
});
app.put("/api/customers/:id",async(req,res)=>{
  try{
    const c=cleanCustomer(req.body);
    await run(`UPDATE customers SET first_name=?,last_name=?,email=?,phone=?,city=?,country=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [c.first_name,c.last_name,c.email,c.phone,c.city,c.country,req.params.id]);
    const out=await get("SELECT * FROM customers WHERE id=?",[req.params.id]);
    if(!out)return res.status(404).json({error:"Customer not found"});
    res.json(out);
  }catch(e){res.status(400).json({error:e.message.includes("UNIQUE")?"Email already exists":e.message})}
});
app.delete("/api/customers/:id",async(req,res)=>{
  try{await run("DELETE FROM customers WHERE id=?",[req.params.id]);res.json({ok:true})}catch(e){res.status(500).json({error:e.message})}
});

app.get("/api/orders",async(req,res)=>{
  try{
    const status=String(req.query.status||"");
    const rows=await all(`SELECT o.*,c.first_name,c.last_name,c.email FROM orders o JOIN customers c ON c.id=o.customer_id
      ${status?"WHERE o.status=?":""} ORDER BY o.created_at DESC`,status?[status]:[]);
    res.json(rows);
  }catch(e){res.status(500).json({error:e.message})}
});
app.get("/api/orders/:id",async(req,res)=>{
  try{
    const order=await get(`SELECT o.*,c.first_name,c.last_name,c.email,c.phone,c.city,c.country,c.total_spend,c.order_count
      FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.id=?`,[req.params.id]);
    if(!order)return res.status(404).json({error:"Order not found"});
    if(order.raw_json){
      try{order.raw_payload=JSON.parse(order.raw_json)}catch{order.raw_payload=null}
    }
    res.json(order);
  }catch(e){res.status(500).json({error:e.message})}
});
app.post("/api/orders",async(req,res)=>{
  try{
    const b=req.body;
    const c=await get("SELECT id FROM customers WHERE id=?",[b.customer_id]);
    if(!c)return res.status(400).json({error:"Customer not found"});
    const r=await run(`INSERT INTO orders(woo_order_id,customer_id,order_number,status,total,currency,created_at,raw_json)
      VALUES(?,?,?,?,?,?,?,?)`,[b.woo_order_id||null,c.id,b.order_number||"",b.status||"pending",Number(b.total||0),b.currency||"INR",b.created_at||new Date().toISOString(),b.raw_json||null]);
    await recalc(c.id); res.status(201).json(await get("SELECT * FROM orders WHERE id=?",[r.id]));
  }catch(e){res.status(400).json({error:e.message})}
});
app.put("/api/orders/:id",async(req,res)=>{
  try{
    const old=await get("SELECT * FROM orders WHERE id=?",[req.params.id]);
    if(!old)return res.status(404).json({error:"Order not found"});
    const b=req.body;
    await run(`UPDATE orders SET order_number=?,status=?,total=?,currency=?,customer_id=? WHERE id=?`,
      [b.order_number??old.order_number,b.status??old.status,Number(b.total??old.total),b.currency??old.currency,b.customer_id??old.customer_id,req.params.id]);
    await recalc(old.customer_id); if((b.customer_id??old.customer_id)!=old.customer_id) await recalc(b.customer_id);
    res.json(await get("SELECT * FROM orders WHERE id=?",[req.params.id]));
  }catch(e){res.status(400).json({error:e.message})}
});
app.delete("/api/orders/:id",async(req,res)=>{
  try{const o=await get("SELECT * FROM orders WHERE id=?",[req.params.id]); if(!o)return res.status(404).json({error:"Order not found"}); await run("DELETE FROM orders WHERE id=?",[req.params.id]); await recalc(o.customer_id); res.json({ok:true})}catch(e){res.status(500).json({error:e.message})}
});

app.get("/api/webhooks",async(req,res)=>{
  try{res.json(await all("SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 100"))}catch(e){res.status(500).json({error:e.message})}
});

app.post("/api/webhook/woocommerce",async(req,res)=>{
  const payload=req.body||{};
  const event=req.get("x-wc-webhook-topic")||"order";
  try{
    const b=payload.billing||{};
    const email=String(b.email||"").trim().toLowerCase();
    if(!email) throw new Error("Webhook order has no billing email");
    let c=await get("SELECT * FROM customers WHERE email=?",[email]);
    const data=cleanCustomer({first_name:b.first_name,last_name:b.last_name,email,phone:b.phone,city:b.city,country:b.country});
    if(!c){
      const r=await run(`INSERT INTO customers(woo_customer_id,first_name,last_name,email,phone,city,country) VALUES(?,?,?,?,?,?,?)`,
        [payload.customer_id||null,data.first_name||"Customer",data.last_name||"",data.email,data.phone,data.city,data.country]);
      c=await get("SELECT * FROM customers WHERE id=?",[r.id]);
    }else{
      await run(`UPDATE customers SET woo_customer_id=COALESCE(?,woo_customer_id),first_name=?,last_name=?,phone=?,city=?,country=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [payload.customer_id||null,data.first_name||c.first_name,data.last_name||c.last_name,data.phone,data.city,data.country,c.id]);
    }
    const wooId=payload.id||null;
    let existing=wooId?await get("SELECT * FROM orders WHERE woo_order_id=?",[wooId]):null;
    if(existing){
      await run(`UPDATE orders SET customer_id=?,order_number=?,status=?,total=?,currency=?,created_at=?,raw_json=? WHERE id=?`,
        [c.id,payload.number||String(wooId||""),payload.status||"pending",Number(payload.total||0),payload.currency||"INR",payload.date_created||new Date().toISOString(),JSON.stringify(payload),existing.id]);
    }else{
      await run(`INSERT INTO orders(woo_order_id,customer_id,order_number,status,total,currency,created_at,raw_json) VALUES(?,?,?,?,?,?,?,?)`,
        [wooId,c.id,payload.number||String(wooId||""),payload.status||"pending",Number(payload.total||0),payload.currency||"INR",payload.date_created||new Date().toISOString(),JSON.stringify(payload)]);
    }
    await recalc(c.id);
    await run("INSERT INTO webhook_logs(event_type,woo_order_id,status,message) VALUES(?,?,?,?)",[event,wooId,"success","Order synced successfully"]);
    res.json({ok:true,message:"WooCommerce order synced"});
  }catch(e){
    await run("INSERT INTO webhook_logs(event_type,woo_order_id,status,message) VALUES(?,?,?,?)",[event,payload.id||null,"error",e.message]).catch(()=>{});
    res.status(400).json({error:e.message});
  }
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
db.on("open",()=>console.log("Lavender SQLite database is ready."));
app.listen(PORT,()=>console.log(`Lavender is running at http://localhost:${PORT}`));
