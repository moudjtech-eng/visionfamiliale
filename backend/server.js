import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import multer from "multer";
import { DatabaseSync } from "node:sqlite";
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

// ============ BASE DE DONNÉES ============
const db = new DatabaseSync(path.join(__dirname, "database.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_verified INTEGER DEFAULT 0,
    otp_code TEXT,
    otp_expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS cvs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    template TEXT NOT NULL,
    data TEXT NOT NULL,
    photo_url TEXT,
    type TEXT DEFAULT 'cv',
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Migrations douces (au cas où la table existe déjà sans les colonnes)
try { db.exec("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN otp_code TEXT"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN otp_expires_at TEXT"); } catch {}
try { db.exec("ALTER TABLE cvs ADD COLUMN type TEXT DEFAULT 'cv'"); } catch {}

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
          Ce code expire dans 10 minutes. Si tu n'es pas à l'origine de cette
          inscription, ignore cet email.
        </p>
      </div>
    `
  });

  if (error) {
    console.error("❌ Erreur Resend :", error);
    throw new Error(error.message || "Impossible d'envoyer l'email");
  }
  console.log("📧 Email envoyé avec ID :", data?.id);
}

// ============ UPLOADS ============
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

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
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email et mot de passe requis" });
  if (password.length < 6)
    return res.status(400).json({ error: "Mot de passe : 6 caractères minimum" });

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists)
    return res.status(409).json({ error: "Cet email est déjà utilisé" });

  const hash = await bcrypt.hash(password, 10);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare(
    "INSERT INTO users (email, password_hash, is_verified, otp_code, otp_expires_at) VALUES (?, ?, 0, ?, ?)"
  ).run(email, hash, code, expiresAt);

  try {
    await sendOtpEmail(email, code);
    res.status(201).json({ message: "Code envoyé à " + email });
  } catch (err) {
    console.error("Erreur envoi email :", err.message);
    res.status(500).json({ error: "Impossible d'envoyer l'email : " + err.message });
  }
});

app.post("/api/auth/verify", (req, res) => {
  const { email, code } = req.body;
  if (!email || !code)
    return res.status(400).json({ error: "Email et code requis" });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
  if (user.is_verified) return res.json({ message: "Déjà vérifié" });

  if (user.otp_code !== code)
    return res.status(400).json({ error: "Code incorrect" });

  if (new Date(user.otp_expires_at) < new Date())
    return res.status(400).json({ error: "Code expiré, redemande-en un" });

  db.prepare(
    "UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires_at = NULL WHERE id = ?"
  ).run(user.id);

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, email: user.email });
});

app.post("/api/auth/resend-otp", async (req, res) => {
  const { email } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
  if (user.is_verified) return res.json({ message: "Déjà vérifié" });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare("UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?")
    .run(code, expiresAt, user.id);

  try {
    await sendOtpEmail(email, code);
    res.json({ message: "Nouveau code envoyé" });
  } catch (err) {
    res.status(500).json({ error: "Erreur envoi email : " + err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user)
    return res.status(401).json({ error: "Email ou mot de passe incorrect" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok)
    return res.status(401).json({ error: "Email ou mot de passe incorrect" });

  if (!user.is_verified)
    return res.status(403).json({ error: "Compte non vérifié", needsVerify: true, email });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, email: user.email });
});

app.get("/api/auth/me", auth, (req, res) => {
  const user = db.prepare("SELECT id, email FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(401).json({ error: "Utilisateur introuvable" });
  res.json(user);
});

// ============ ROUTES DOCUMENTS (ex-CV) ============
app.get("/api/cvs", auth, (req, res) => {
  const docs = db.prepare(
    "SELECT id, title, template, photo_url, type, updated_at FROM cvs WHERE user_id = ? ORDER BY updated_at DESC"
  ).all(req.userId);
  res.json(docs);
});

app.get("/api/cvs/:id", auth, (req, res) => {
  const doc = db.prepare("SELECT * FROM cvs WHERE id = ? AND user_id = ?").get(req.params.id, req.userId);
  if (!doc) return res.status(404).json({ error: "Document introuvable" });
  doc.data = JSON.parse(doc.data);
  res.json(doc);
});

app.post("/api/cvs", auth, (req, res) => {
  const { title, template, data, photo_url, type } = req.body;
  if (!title || !template)
    return res.status(400).json({ error: "Titre et modèle requis" });
  const result = db.prepare(
    "INSERT INTO cvs (user_id, title, template, data, photo_url, type) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    req.userId,
    title,
    template,
    JSON.stringify(data || {}),
    photo_url || null,
    type || "cv"
  );
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put("/api/cvs/:id", auth, (req, res) => {
  const { title, template, data, photo_url, type } = req.body;
  const existing = db.prepare("SELECT id FROM cvs WHERE id = ? AND user_id = ?").get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: "Document introuvable" });
  db.prepare(
    "UPDATE cvs SET title=?, template=?, data=?, photo_url=?, type=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
  ).run(
    title,
    template,
    JSON.stringify(data || {}),
    photo_url || null,
    type || "cv",
    req.params.id
  );
  res.json({ ok: true });
});

app.delete("/api/cvs/:id", auth, (req, res) => {
  const result = db.prepare("DELETE FROM cvs WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: "Document introuvable" });
  res.status(204).end();
});

// ============ PAIEMENT ============
app.post("/api/payment/verify", auth, async (req, res) => {
  const { transactionId } = req.body;
  if (!transactionId) {
    return res.status(400).json({ error: "ID de transaction requis" });
  }

  try {
    const verification = await k.verify(transactionId);

    if (verification.status === "SUCCESS") {
      res.json({ success: true, message: "Paiement vérifié avec succès." });
    } else {
      res.status(400).json({
        success: false,
        error: "La transaction a échoué ou est en attente."
      });
    }
  } catch (error) {
    console.error("Erreur lors de la vérification KkiaPay:", error);
    res.status(500).json({ error: "Impossible de vérifier la transaction." });
  }
});

// ============ UPLOAD PHOTO ============
app.post("/api/upload", auth, upload.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ============ DÉMARRAGE ============
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Serveur sur http://localhost:${PORT}`));