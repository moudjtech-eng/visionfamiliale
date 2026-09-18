import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import multer from "multer";
import pg from "pg";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { kkiapay } from "@kkiapay-org/nodejs-sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// ============ KKIAPAY ============
const k = kkiapay({
  publickey: process.env.KKIA_PUBLIC_KEY,
  privatekey: process.env.KKIA_PRIVATE_KEY,
  secretkey: process.env.KKIA_SECRET_KEY,
  sandbox: true // → false en production
});

// ============ POSTGRESQL (Neon) ============
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Création des tables au démarrage
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_verified INTEGER DEFAULT 0,
      otp_code TEXT,
      otp_expires_at TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cvs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      template TEXT NOT NULL,
      data TEXT NOT NULL,
      photo_url TEXT,
      type TEXT DEFAULT 'cv',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✅ Base de données initialisée");
}

// ============ EMAIL (Resend) ============
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOtpEmail(email, code) {
  console.log("🔵 Tentative d'envoi email à :", email);
  const { data, error } = await resend.emails.send({
    from: "VisionFamiliale <onboarding@resend.dev>",
    to: email,
    subject: "🔐 Vérifie ton adresse email",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: auto;">
        <h2>Bienvenue sur VisionFamiliale ! 👋</h2>
        <p>Pour activer ton compte, entre ce code :</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px;
                    background: #f0f2f5; padding: 20px; text-align: center;
                    border-radius: 10px; color: #6c5ce7;">
          ${code}
        </div>
        <p style="color:#888; font-size: 13px; margin-top: 20px;">
          Ce code expire dans 10 minutes.
        </p>
      </div>
    `
  });
  if (error) {
    console.error("❌ Erreur Resend :", error);
    throw new Error(error.message || "Impossible d'envoyer l'email");
  }
  console.log("📧 Email envoyé :", data?.id);
}

// ============ UPLOADS ============
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ============ APP ============
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadsDir));
app.use(express.static(path.join(__dirname, "..", "public")));

// ============ MIDDLEWARE AUTH ============
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Session expirée, reconnecte-toi" });
  }
}

// ============ ROUTES AUTH ============

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email et mot de passe requis" });
    if (password.length < 6)
      return res.status(400).json({ error: "Mot de passe : 6 caractères minimum" });

    const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (exists.rows.length > 0)
      return res.status(409).json({ error: "Cet email est déjà utilisé" });

    const hash = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await pool.query(
      "INSERT INTO users (email, password_hash, is_verified, otp_code, otp_expires_at) VALUES ($1, $2, 0, $3, $4)",
      [email, hash, code, expiresAt]
    );

    await sendOtpEmail(email, code);
    res.status(201).json({ message: "Code envoyé à " + email });
  } catch (err) {
    console.error("Erreur register :", err);
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});

app.post("/api/auth/verify", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json({ error: "Email et code requis" });

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    if (user.is_verified) return res.json({ message: "Déjà vérifié" });
    if (user.otp_code !== code)
      return res.status(400).json({ error: "Code incorrect" });
    if (new Date(user.otp_expires_at) < new Date())
      return res.status(400).json({ error: "Code expiré, redemande-en un" });

    await pool.query(
      "UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires_at = NULL WHERE id = $1",
      [user.id]
    );

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, email: user.email });
  } catch (err) {
    console.error("Erreur verify :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/auth/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    if (user.is_verified) return res.json({ message: "Déjà vérifié" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await pool.query(
      "UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3",
      [code, expiresAt, user.id]
    );

    await sendOtpEmail(email, code);
    res.json({ message: "Nouveau code envoyé" });
  } catch (err) {
    console.error("Erreur resend :", err);
    res.status(500).json({ error: "Erreur envoi email" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user)
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });

    if (!user.is_verified)
      return res.status(403).json({ error: "Compte non vérifié", needsVerify: true, email });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, email: user.email });
  } catch (err) {
    console.error("Erreur login :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, email FROM users WHERE id = $1", [req.userId]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Utilisateur introuvable" });
    res.json(user);
  } catch (err) {
    console.error("Erreur me :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ============ ROUTES DOCUMENTS ============
app.get("/api/cvs", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, template, photo_url, type, updated_at FROM cvs WHERE user_id = $1 ORDER BY updated_at DESC",
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur get cvs :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/cvs/:id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM cvs WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    const doc = result.rows[0];
    if (!doc) return res.status(404).json({ error: "Document introuvable" });
    doc.data = JSON.parse(doc.data);
    res.json(doc);
  } catch (err) {
    console.error("Erreur get cv :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/cvs", auth, async (req, res) => {
  try {
    const { title, template, data, photo_url, type } = req.body;
    if (!title || !template)
      return res.status(400).json({ error: "Titre et modèle requis" });
    const result = await pool.query(
      "INSERT INTO cvs (user_id, title, template, data, photo_url, type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [req.userId, title, template, JSON.stringify(data || {}), photo_url || null, type || "cv"]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error("Erreur create cv :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/cvs/:id", auth, async (req, res) => {
  try {
    const { title, template, data, photo_url, type } = req.body;
    const existing = await pool.query(
      "SELECT id FROM cvs WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    if (existing.rows.length === 0)
      return res.status(404).json({ error: "Document introuvable" });

    await pool.query(
      "UPDATE cvs SET title = $1, template = $2, data = $3, photo_url = $4, type = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6",
      [title, template, JSON.stringify(data || {}), photo_url || null, type || "cv", req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur update cv :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.delete("/api/cvs/:id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM cvs WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Document introuvable" });
    res.status(204).end();
  } catch (err) {
    console.error("Erreur delete cv :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ============ PAIEMENT ============
app.post("/api/payment/verify", auth, async (req, res) => {
  try {
    const { transactionId } = req.body;
    if (!transactionId)
      return res.status(400).json({ error: "ID de transaction requis" });

    const verification = await k.verify(transactionId);
    if (verification.status === "SUCCESS") {
      res.json({ success: true, message: "Paiement vérifié avec succès." });
    } else {
      res.status(400).json({ success: false, error: "La transaction a échoué ou est en attente." });
    }
  } catch (error) {
    console.error("Erreur KkiaPay :", error);
    res.status(500).json({ error: "Impossible de vérifier la transaction." });
  }
});

// ============ UPLOAD PHOTO ============
app.post("/api/upload", auth, upload.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ============ DÉMARRAGE ============
const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`✅ Serveur sur http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("❌ Erreur initialisation DB :", err);
    process.exit(1);
  });