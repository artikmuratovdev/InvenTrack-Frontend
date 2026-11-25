// server.ts
import "dotenv/config";
import express from "express";
import fs3 from "fs";
import path3 from "path";

// src/types/inventory.ts
var ROLE_LABELS = {
  ADMIN: "Administrator",
  RESPONSIBLE: "Mas\u2019ul shaxs",
  EMPLOYEE: "Xodim"
};
var STATUS_LABELS = {
  ACTIVE: "Faol",
  IN_REPAIR: "Ta\u2019mirda",
  RESERVE: "Zaxirada",
  WRITTEN_OFF: "Hisobdan chiqarilgan"
};
var USAGE_LABELS = {
  IN_USE: "Foydalanilmoqda",
  IDLE: "Bo\u2018sh turibdi",
  SHARED: "Umumiy foydalanishda"
};

// server/gemini.ts
import { GoogleGenAI } from "@google/genai";

// server/store.ts
import crypto from "crypto";
import fs2 from "fs";
import path2 from "path";

// server/firestore.ts
import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
var FirestoreService = class {
  constructor() {
    this.app = null;
    this.db = null;
    this.status = {
      connected: false,
      mode: "fallback_local",
      message: "Firestore ulanmagan. Mahalliy rejim ishga tushirildi."
    };
    this.init();
  }
  init() {
    try {
      if (process.env.FIRESTORE_EMULATOR_HOST) {
        this.app = getApps().length > 0 ? getApp() : initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || "demo-inventrack"
        });
        this.db = getFirestore(this.app);
        this.status = {
          connected: true,
          mode: "firestore",
          projectId: process.env.FIREBASE_PROJECT_ID || "demo-inventrack",
          source: "emulator",
          message: `Firestore Emulator ulandi (${process.env.FIRESTORE_EMULATOR_HOST})`
        };
        console.log(`[Firestore] ${this.status.message}`);
        return;
      }
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || (fs.existsSync(path.resolve(process.cwd(), "serviceAccountKey.json")) ? path.resolve(process.cwd(), "serviceAccountKey.json") : null);
      if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        const raw = fs.readFileSync(serviceAccountPath, "utf8");
        const certData = JSON.parse(raw);
        this.app = getApps().length > 0 ? getApp() : initializeApp({
          credential: cert(certData),
          projectId: certData.project_id || process.env.FIREBASE_PROJECT_ID
        });
        this.db = getFirestore(this.app);
        this.status = {
          connected: true,
          mode: "firestore",
          projectId: certData.project_id || process.env.FIREBASE_PROJECT_ID,
          source: "service_account_path",
          message: `Firestore Service Account fayli orqali ulandi (${path.basename(serviceAccountPath)})`
        };
        console.log(`[Firestore] \u2705 ${this.status.message} [Project: ${this.status.projectId}]`);
        return;
      }
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
        if (jsonStr.startsWith("{")) {
          const certData = JSON.parse(jsonStr);
          this.app = getApps().length > 0 ? getApp() : initializeApp({
            credential: cert(certData),
            projectId: certData.project_id || process.env.FIREBASE_PROJECT_ID
          });
          this.db = getFirestore(this.app);
          this.status = {
            connected: true,
            mode: "firestore",
            projectId: certData.project_id || process.env.FIREBASE_PROJECT_ID,
            source: "service_account_json",
            message: "Firestore FIREBASE_SERVICE_ACCOUNT_JSON orqali ulandi"
          };
          console.log(`[Firestore] \u2705 ${this.status.message} [Project: ${this.status.projectId}]`);
          return;
        }
      }
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (projectId && clientEmail && privateKey) {
        privateKey = privateKey.replace(/\\n/g, "\n");
        this.app = getApps().length > 0 ? getApp() : initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey
          }),
          projectId
        });
        this.db = getFirestore(this.app);
        this.status = {
          connected: true,
          mode: "firestore",
          projectId,
          source: "env_vars",
          message: "Firestore muhit o\u2018zgaruvchilari (env) orqali ulandi"
        };
        console.log(`[Firestore] \u2705 ${this.status.message} [Project: ${projectId}]`);
        return;
      }
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        this.app = getApps().length > 0 ? getApp() : initializeApp({
          credential: applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
        this.db = getFirestore(this.app);
        this.status = {
          connected: true,
          mode: "firestore",
          projectId: process.env.FIREBASE_PROJECT_ID,
          source: "adc",
          message: "Firestore Application Default Credentials orqali ulandi"
        };
        console.log(`[Firestore] \u2705 ${this.status.message}`);
        return;
      }
      this.status = {
        connected: false,
        mode: "fallback_local",
        message: "Firestore sozlanmagan. Tizim mahalliy fayl ombori (data/db.json) bilan ishlamoqda."
      };
      console.log(`[Firestore] \u2139\uFE0F ${this.status.message}`);
      console.log(
        "[Firestore] \u{1F4A1} Firestore-ni ulash uchun .env fayliga FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL va FIREBASE_PRIVATE_KEY parametrlarini kiriting."
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.status = {
        connected: false,
        mode: "fallback_local",
        message: `Firestore ulanishida xatolik yuz berdi: ${errMsg}`
      };
      console.error(`[Firestore] \u26A0\uFE0F ${this.status.message}`);
    }
  }
  get isConnected() {
    return this.status.connected && this.db !== null;
  }
  getStatus() {
    return { ...this.status };
  }
  getDb() {
    return this.db;
  }
  /**
   * Loads all collections from Firestore.
   * If collections are empty, returns null so the caller can seed initial data.
   */
  async loadAll() {
    if (!this.isConnected || !this.db) {
      return null;
    }
    try {
      const [usersSnap, typesSnap, roomsSnap, eqSnap, historySnap, repairsSnap] = await Promise.all([
        this.db.collection("users").get(),
        this.db.collection("types").get(),
        this.db.collection("rooms").get(),
        this.db.collection("equipment").get(),
        this.db.collection("history").orderBy("createdAt", "desc").limit(200).get(),
        this.db.collection("repairs").orderBy("sentAt", "desc").get()
      ]);
      if (usersSnap.empty && eqSnap.empty) {
        return null;
      }
      const users = [];
      usersSnap.forEach((doc) => users.push(doc.data()));
      const types = [];
      typesSnap.forEach((doc) => types.push(doc.data()));
      const rooms = [];
      roomsSnap.forEach((doc) => rooms.push(doc.data()));
      const equipment = [];
      eqSnap.forEach((doc) => equipment.push(doc.data()));
      const history = [];
      historySnap.forEach((doc) => history.push(doc.data()));
      const repairs = [];
      repairsSnap.forEach((doc) => repairs.push(doc.data()));
      return {
        users,
        types,
        rooms,
        equipment,
        history,
        repairs
      };
    } catch (err) {
      console.error("[Firestore] Ma\u2019lumotlarni yuklashda xatolik:", err);
      return null;
    }
  }
  /**
   * Seeds initial seed data into Firestore in batches.
   */
  async seedData(seed) {
    if (!this.isConnected || !this.db) {
      throw new Error("Firestore ulanmagan.");
    }
    const counts = {
      users: 0,
      types: 0,
      rooms: 0,
      equipment: 0,
      history: 0,
      repairs: 0
    };
    const batch = this.db.batch();
    for (const u of seed.users) {
      const ref = this.db.collection("users").doc(u.id);
      batch.set(ref, u, { merge: true });
      counts.users++;
    }
    for (const t of seed.types) {
      const ref = this.db.collection("types").doc(t.id);
      batch.set(ref, t, { merge: true });
      counts.types++;
    }
    for (const r of seed.rooms) {
      const ref = this.db.collection("rooms").doc(r.id);
      batch.set(ref, r, { merge: true });
      counts.rooms++;
    }
    for (const e of seed.equipment) {
      const ref = this.db.collection("equipment").doc(e.id);
      batch.set(ref, e, { merge: true });
      counts.equipment++;
    }
    for (const h of seed.history) {
      const ref = this.db.collection("history").doc(h.id);
      batch.set(ref, h, { merge: true });
      counts.history++;
    }
    for (const rep of seed.repairs) {
      const ref = this.db.collection("repairs").doc(rep.id);
      batch.set(ref, rep, { merge: true });
      counts.repairs++;
    }
    await batch.commit();
    console.log(
      "[Firestore] \u2705 Boshlang\u2018ich ma\u2019lumotlar Firestore-ga muvaffaqiyatli yuklandi:",
      counts
    );
    return { seeded: true, counts };
  }
  // --- CRUD Sync Methods (Fire-and-forget or awaited) ---
  async saveEquipment(item) {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection("equipment").doc(item.id).set(item, { merge: true });
    } catch (err) {
      console.error(`[Firestore] Jihozni saqlashda xatolik (${item.id}):`, err);
    }
  }
  async deleteEquipment(id) {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection("equipment").doc(id).delete();
    } catch (err) {
      console.error(`[Firestore] Jihozni o\u2018chirishda xatolik (${id}):`, err);
    }
  }
  async saveRepair(item) {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection("repairs").doc(item.id).set(item, { merge: true });
    } catch (err) {
      console.error(`[Firestore] Ta\u2019mirni saqlashda xatolik (${item.id}):`, err);
    }
  }
  async saveHistory(item) {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection("history").doc(item.id).set(item, { merge: true });
    } catch (err) {
      console.error(`[Firestore] Tarix yozuvini saqlashda xatolik (${item.id}):`, err);
    }
  }
  async saveUser(item) {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection("users").doc(item.id).set(item, { merge: true });
    } catch (err) {
      console.error(`[Firestore] Foydalanuvchini saqlashda xatolik (${item.id}):`, err);
    }
  }
  async saveType(item) {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection("types").doc(item.id).set(item, { merge: true });
    } catch (err) {
      console.error(`[Firestore] Jihoz turini saqlashda xatolik (${item.id}):`, err);
    }
  }
  async deleteType(id) {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection("types").doc(id).delete();
    } catch (err) {
      console.error(`[Firestore] Jihoz turini o\u2018chirishda xatolik (${id}):`, err);
    }
  }
  async saveRoom(item) {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection("rooms").doc(item.id).set(item, { merge: true });
    } catch (err) {
      console.error(`[Firestore] Xonani saqlashda xatolik (${item.id}):`, err);
    }
  }
  async deleteRoom(id) {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection("rooms").doc(id).delete();
    } catch (err) {
      console.error(`[Firestore] Xonani o\u2018chirishda xatolik (${id}):`, err);
    }
  }
};
var firestoreService = new FirestoreService();

// server/store.ts
var DATA_DIR = path2.resolve(process.cwd(), "data");
var DB_FILE = path2.join(DATA_DIR, "db.json");
var JWT_SECRET = process.env.JWT_SECRET || "inventrack-local-dev-secret-key-2026";
function hashPassword(password) {
  const salt = "inventrack-salt-v1";
  return crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
}
function verifyPassword(password, passwordHash) {
  return hashPassword(password) === passwordHash;
}
function base64UrlEncode(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function base64UrlDecode(input) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - input.length % 4);
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString("utf8");
}
function signJwt(userId, role) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = {
    sub: userId,
    role,
    exp: Math.floor(Date.now() / 1e3) + 60 * 60 * 24 * 7
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = base64UrlEncode(
    crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${sig}`;
}
function verifyJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = base64UrlEncode(
      crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest()
    );
    if (sig !== expectedSig) return null;
    const decoded = JSON.parse(base64UrlDecode(body));
    if (!decoded.sub || !decoded.exp || decoded.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
function createInitialSeed() {
  const defaultPass = hashPassword("password123");
  const users = [
    {
      id: "u-admin",
      fullName: "G\u2018olibjon Karimov",
      email: "admin@inventrack.uz",
      passwordHash: defaultPass,
      role: "ADMIN",
      department: "IT va Infratuzilma",
      active: true,
      createdAt: "2026-01-10T09:00:00.000Z"
    },
    {
      id: "u-resp-1",
      fullName: "Nurmuhammad Tursunov",
      email: "masul@inventrack.uz",
      passwordHash: defaultPass,
      role: "RESPONSIBLE",
      department: "Dasturlash bo\u2018limi",
      active: true,
      createdAt: "2026-01-12T10:30:00.000Z"
    },
    {
      id: "u-resp-2",
      fullName: "Sanobar Alimova",
      email: "sanobar@inventrack.uz",
      passwordHash: defaultPass,
      role: "RESPONSIBLE",
      department: "Moliya va Hisob",
      active: true,
      createdAt: "2026-01-14T11:00:00.000Z"
    },
    {
      id: "u-emp",
      fullName: "Dilshod Rahimov",
      email: "xodim@inventrack.uz",
      passwordHash: defaultPass,
      role: "EMPLOYEE",
      department: "Kadrlar bo\u2018limi",
      active: true,
      createdAt: "2026-02-01T09:15:00.000Z"
    }
  ];
  const types = [
    { id: "type-laptop", name: "Noutbuk" },
    { id: "type-desktop", name: "Statsionar kompyuter" },
    { id: "type-printer", name: "Printer va MFU" },
    { id: "type-monitor", name: "Monitor" },
    { id: "type-network", name: "Tarmoq qurilmasi" },
    { id: "type-projector", name: "Proyektor va taqdimot" }
  ];
  const rooms = [
    { id: "room-101", code: "101", name: "Qabulxona va Boshqaruv", floor: "1-qavat" },
    { id: "room-204", code: "204", name: "Moliya bo\u2018limi", floor: "2-qavat" },
    { id: "room-301", code: "301", name: "Katta majlislar zali", floor: "3-qavat" },
    { id: "room-304", code: "304", name: "Dasturlash va IT markazi", floor: "3-qavat" },
    { id: "room-402", code: "402", name: "Server va tarmoq xonasi", floor: "4-qavat" },
    { id: "room-001", code: "001", name: "Markaziy zaxira ombori", floor: "Yerto\u2018la" }
  ];
  const equipment = [
    {
      id: "eq-1001",
      inventoryNumber: "INV-2026-001",
      name: "MacBook Pro 14 M3 Pro",
      serialNumber: "C02YM41KJG5H",
      typeId: "type-laptop",
      roomId: "room-304",
      responsibleUserId: "u-resp-1",
      status: "ACTIVE",
      usageStatus: "IN_USE",
      purchaseDate: "2025-03-14",
      warrantyUntil: "2028-03-14",
      notes: "Frontend va mobil ishlanma uchun asosiy ishchi noutbuk.",
      updatedAt: "2026-11-12T10:20:00.000Z"
    },
    {
      id: "eq-1002",
      inventoryNumber: "INV-2026-002",
      name: 'Dell UltraSharp U2723QE 27"',
      serialNumber: "CN-0X98K2-TV100",
      typeId: "type-monitor",
      roomId: "room-304",
      responsibleUserId: "u-resp-1",
      status: "ACTIVE",
      usageStatus: "IN_USE",
      purchaseDate: "2025-04-02",
      warrantyUntil: "2028-04-02",
      notes: "4K IPS USB-C hub bilan jihozlangan monitor.",
      updatedAt: "2026-11-10T14:05:00.000Z"
    },
    {
      id: "eq-1003",
      inventoryNumber: "INV-2026-003",
      name: "HP LaserJet Pro MFP M428fdw",
      serialNumber: "VNB3R19482",
      typeId: "type-printer",
      roomId: "room-204",
      responsibleUserId: "u-resp-2",
      status: "IN_REPAIR",
      usageStatus: "SHARED",
      purchaseDate: "2024-06-20",
      warrantyUntil: "2026-06-20",
      notes: "Qog\u2018oz tortish rolikida nosozlik kuzatilgan, servisga yuborilgan.",
      updatedAt: "2026-11-14T08:40:00.000Z"
    },
    {
      id: "eq-1004",
      inventoryNumber: "INV-2026-004",
      name: "Lenovo ThinkPad T14 Gen 4",
      serialNumber: "PF4A91KL",
      typeId: "type-laptop",
      roomId: "room-304",
      responsibleUserId: "u-resp-1",
      status: "IN_REPAIR",
      usageStatus: "IN_USE",
      purchaseDate: "2024-09-10",
      warrantyUntil: "2027-09-10",
      notes: "Batareya sig\u2018imi tushib ketgani va quvvatlash porti uchun ta\u2019mirda.",
      updatedAt: "2026-11-15T11:15:00.000Z"
    },
    {
      id: "eq-1005",
      inventoryNumber: "INV-2026-005",
      name: "MikroTik Cloud Core Router CCR2004",
      serialNumber: "MT-CCR2004-8821",
      typeId: "type-network",
      roomId: "room-402",
      responsibleUserId: "u-admin",
      status: "ACTIVE",
      usageStatus: "SHARED",
      purchaseDate: "2024-02-11",
      warrantyUntil: "2027-02-11",
      notes: "Asosiy magistral marshrutizator, 24/7 rejimda ishlaydi.",
      updatedAt: "2026-11-01T09:00:00.000Z"
    },
    {
      id: "eq-1006",
      inventoryNumber: "INV-2026-006",
      name: "Epson EB-L630U Lazer Proyektor",
      serialNumber: "EP-L630-44109",
      typeId: "type-projector",
      roomId: "room-301",
      responsibleUserId: "u-resp-1",
      status: "ACTIVE",
      usageStatus: "SHARED",
      purchaseDate: "2025-01-25",
      warrantyUntil: "2028-01-25",
      notes: "Katta majlislar zalida taqdimotlar uchun o\u2018rnatilgan.",
      updatedAt: "2026-10-28T16:30:00.000Z"
    },
    {
      id: "eq-1007",
      inventoryNumber: "INV-2026-007",
      name: "HP ProDesk 400 G9 Mini",
      serialNumber: "8CG31209PQ",
      typeId: "type-desktop",
      roomId: "room-204",
      responsibleUserId: "u-resp-2",
      status: "ACTIVE",
      usageStatus: "IN_USE",
      purchaseDate: "2025-02-18",
      warrantyUntil: "2028-02-18",
      notes: "1C va buxgalteriya hisobi uchun ajratilgan.",
      updatedAt: "2026-11-05T13:20:00.000Z"
    },
    {
      id: "eq-1008",
      inventoryNumber: "INV-2026-008",
      name: 'ASUS ProArt PA278QV 27"',
      serialNumber: "AS-PA278-77312",
      typeId: "type-monitor",
      roomId: "room-001",
      responsibleUserId: "u-resp-1",
      status: "RESERVE",
      usageStatus: "IDLE",
      purchaseDate: "2025-07-08",
      warrantyUntil: "2028-07-08",
      notes: "Yangi ishga olinadigan dizayner/dasturchi uchun zaxirada.",
      updatedAt: "2026-11-08T12:00:00.000Z"
    },
    {
      id: "eq-1009",
      inventoryNumber: "INV-2026-009",
      name: "Cisco Catalyst 2960X-48FPS",
      serialNumber: "FCW2140B09X",
      typeId: "type-network",
      roomId: "room-402",
      responsibleUserId: "u-admin",
      status: "ACTIVE",
      usageStatus: "SHARED",
      purchaseDate: "2023-11-19",
      warrantyUntil: "2026-11-19",
      notes: "3-qavat PoE IP-telefonlar va Wi-Fi nuqtalarini ta\u2019minlaydi.",
      updatedAt: "2026-10-15T10:10:00.000Z"
    },
    {
      id: "eq-1010",
      inventoryNumber: "INV-2026-010",
      name: "Canon i-SENSYS LBP236dw",
      serialNumber: "CN-236DW-1904",
      typeId: "type-printer",
      roomId: "room-101",
      responsibleUserId: "u-resp-2",
      status: "ACTIVE",
      usageStatus: "SHARED",
      purchaseDate: "2025-05-11",
      warrantyUntil: "2027-05-11",
      notes: "Qabulxona hujjatlarini tezkor chop etish uchun.",
      updatedAt: "2026-11-03T15:45:00.000Z"
    },
    {
      id: "eq-1011",
      inventoryNumber: "INV-2026-011",
      name: "Dell Latitude 5440",
      serialNumber: "DL-5440-9012M",
      typeId: "type-laptop",
      roomId: "room-001",
      responsibleUserId: "u-resp-1",
      status: "RESERVE",
      usageStatus: "IDLE",
      purchaseDate: "2025-08-22",
      warrantyUntil: "2028-08-22",
      notes: "Xizmat safarlari va vaqtinchalik almashtirish uchun zaxirada.",
      updatedAt: "2026-11-11T09:30:00.000Z"
    },
    {
      id: "eq-1012",
      inventoryNumber: "INV-2026-012",
      name: "HP Compaq Elite 8300 (Eski)",
      serialNumber: "CZC248910W",
      typeId: "type-desktop",
      roomId: "room-001",
      responsibleUserId: "u-admin",
      status: "WRITTEN_OFF",
      usageStatus: "IDLE",
      purchaseDate: "2019-03-04",
      warrantyUntil: "2022-03-04",
      notes: "Ma\u2019naviy eskirgani sababli komissiya qarori bilan hisobdan chiqarilgan.",
      updatedAt: "2026-09-20T17:00:00.000Z"
    }
  ];
  const history = [
    {
      id: "hist-1",
      equipmentId: "eq-1004",
      actorId: "u-resp-1",
      actorName: "Nurmuhammad Tursunov",
      action: "Ta\u2019mirga jo\u2018natildi",
      changes: "Holat: Faol \u2192 Ta\u2019mirda \xB7 Ijrochi: TechnoService Toshkent",
      createdAt: "2026-11-15T11:15:00.000Z"
    },
    {
      id: "hist-2",
      equipmentId: "eq-1003",
      actorId: "u-resp-2",
      actorName: "Sanobar Alimova",
      action: "Ta\u2019mirga jo\u2018natildi",
      changes: "Holat: Faol \u2192 Ta\u2019mirda \xB7 Sabab: Qog\u2018oz tortish mexanizmi nosozligi",
      createdAt: "2026-11-14T08:40:00.000Z"
    },
    {
      id: "hist-3",
      equipmentId: "eq-1001",
      actorId: "u-admin",
      actorName: "G\u2018olibjon Karimov",
      action: "Ma\u2019lumot yangilandi",
      changes: "Xona: 001 \u2192 304-xona \xB7 Mas\u2019ul: Nurmuhammad Tursunov",
      createdAt: "2026-11-12T10:20:00.000Z"
    },
    {
      id: "hist-4",
      equipmentId: "eq-1006",
      actorId: "u-resp-1",
      actorName: "Nurmuhammad Tursunov",
      action: "Ta\u2019mirdan qaytarildi",
      changes: "Holat: Ta\u2019mirda \u2192 Faol \xB7 Xarajat: 450 000 so\u2018m",
      createdAt: "2026-10-28T16:30:00.000Z"
    },
    {
      id: "hist-5",
      equipmentId: "eq-1012",
      actorId: "u-admin",
      actorName: "G\u2018olibjon Karimov",
      action: "Hisobdan chiqarildi",
      changes: "Holat: Zaxirada \u2192 Hisobdan chiqarilgan",
      createdAt: "2026-09-20T17:00:00.000Z"
    }
  ];
  const repairs = [
    {
      id: "rep-201",
      equipmentId: "eq-1004",
      equipmentName: "Lenovo ThinkPad T14 Gen 4",
      inventoryNumber: "INV-2026-004",
      sentById: "u-resp-1",
      sentByName: "Nurmuhammad Tursunov",
      vendorOrTechnician: "TechnoService Toshkent",
      issueDescription: "Batareya 20 daqiqada o\u2018chib qolmoqda va USB-C port qizib ketmoqda.",
      status: "OPEN",
      sentAt: "2026-11-15T11:15:00.000Z"
    },
    {
      id: "rep-202",
      equipmentId: "eq-1003",
      equipmentName: "HP LaserJet Pro MFP M428fdw",
      inventoryNumber: "INV-2026-003",
      sentById: "u-resp-2",
      sentByName: "Sanobar Alimova",
      vendorOrTechnician: "PrintMaster Servis",
      issueDescription: "Qog\u2018oz tortish roligi yeyilgan va skaner qopqog\u2018i bo\u2018shashgan.",
      status: "OPEN",
      sentAt: "2026-11-14T08:40:00.000Z"
    },
    {
      id: "rep-203",
      equipmentId: "eq-1006",
      equipmentName: "Epson EB-L630U Lazer Proyektor",
      inventoryNumber: "INV-2026-006",
      sentById: "u-resp-1",
      sentByName: "Nurmuhammad Tursunov",
      vendorOrTechnician: "AV Pro Servis Markazi",
      issueDescription: "Optik filtrni changdan tozalash va rang kalibrlash.",
      status: "COMPLETED",
      sentAt: "2026-10-22T09:00:00.000Z",
      returnedAt: "2026-10-28T16:30:00.000Z",
      resolutionNotes: "Filtr almashtirildi, optika tozalandi, to\u2018liq sinovdan o\u2018tdi.",
      cost: 45e4
    },
    {
      id: "rep-204",
      equipmentId: "eq-1010",
      equipmentName: "Canon i-SENSYS LBP236dw",
      inventoryNumber: "INV-2026-010",
      sentById: "u-resp-2",
      sentByName: "Sanobar Alimova",
      vendorOrTechnician: "PrintMaster Servis",
      issueDescription: "Pechka (fuser) plyonkasini almashtirish va profilaktika.",
      status: "COMPLETED",
      sentAt: "2026-09-10T10:00:00.000Z",
      returnedAt: "2026-09-12T15:20:00.000Z",
      resolutionNotes: "Yangi termo-plyonka o\u2018rnatildi, chop etish sifati tiklandi.",
      cost: 32e4
    }
  ];
  return { users, types, rooms, equipment, history, repairs };
}
var InventoryStore = class {
  constructor() {
    this.initialized = false;
    this.state = this.load();
  }
  async init() {
    if (this.initialized) return;
    this.initialized = true;
    if (firestoreService.isConnected) {
      try {
        console.log("[InvenTrack] \u{1F504} Firestore ma\u2019lumotlari yuklanmoqda...");
        const remoteState = await firestoreService.loadAll();
        if (remoteState && remoteState.equipment.length > 0) {
          this.state = remoteState;
          this.saveState(this.state);
          console.log(
            `[InvenTrack] \u{1F4E6} Firestore-dan ma\u2019lumotlar muvaffaqiyatli yuklandi: ${this.state.equipment.length} ta jihoz, ${this.state.repairs.length} ta ta\u2019mir.`
          );
        } else {
          console.log("[InvenTrack] \u{1F331} Firestore bo\u2018sh. Boshlang\u2018ich demo ma\u2019lumotlar yuklanmoqda...");
          await firestoreService.seedData(this.state);
          console.log("[InvenTrack] \u2705 Boshlang\u2018ich ma\u2019lumotlar Firestore-ga muvaffaqiyatli saqlandi.");
        }
      } catch (err) {
        console.error("[InvenTrack] \u26A0\uFE0F Firestore bilan sinxronlashda xatolik:", err);
      }
    }
  }
  load() {
    try {
      if (!fs2.existsSync(DATA_DIR)) {
        fs2.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs2.existsSync(DB_FILE)) {
        const raw = fs2.readFileSync(DB_FILE, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.equipment)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error("Ombor faylini o\u2018qishda xatolik, boshlang\u2018ich ma\u2019lumotlar yaratilmoqda:", err);
    }
    const seed = createInitialSeed();
    this.saveState(seed);
    return seed;
  }
  saveState(stateToSave) {
    try {
      if (!fs2.existsSync(DATA_DIR)) {
        fs2.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs2.writeFileSync(DB_FILE, JSON.stringify(stateToSave, null, 2), "utf8");
    } catch (err) {
      console.error("Ombor faylini saqlashda xatolik:", err);
    }
  }
  save() {
    this.saveState(this.state);
  }
  get data() {
    return this.state;
  }
  sanitizeUser(u) {
    const { passwordHash: _ignored, ...safe } = u;
    return safe;
  }
  hydrateEquipment(eq) {
    const type = this.state.types.find((t) => t.id === eq.typeId);
    const room = this.state.rooms.find((r) => r.id === eq.roomId);
    const resp = this.state.users.find((u) => u.id === eq.responsibleUserId);
    return {
      ...eq,
      typeName: type?.name ?? "Noma\u2019lum tur",
      roomLabel: room ? `${room.code}-xona \xB7 ${room.name}` : "Noma\u2019lum xona",
      responsibleName: resp?.fullName ?? "Biriktirilmagan"
    };
  }
  visibleEquipmentForUser(user) {
    const list = user.role === "RESPONSIBLE" ? this.state.equipment.filter((e) => e.responsibleUserId === user.id) : this.state.equipment;
    return list.map((e) => this.hydrateEquipment(e));
  }
  addHistory(entry) {
    const item = {
      ...entry,
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.state.history.unshift(item);
    void firestoreService.saveHistory(item);
    return item;
  }
  validateStatus(value) {
    return ["ACTIVE", "IN_REPAIR", "RESERVE", "WRITTEN_OFF"].includes(value);
  }
  validateUsage(value) {
    return ["IN_USE", "IDLE", "SHARED"].includes(value);
  }
};
var store = new InventoryStore();

// server/gemini.ts
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error(
      "GEMINI_API_KEY sozlanmagan. Iltimos, Settings > Secrets bo\u2018limida API kalitni kiriting."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
async function generateInventoryChatReply(user, message, history = []) {
  const ai = getGeminiClient();
  const visibleEquipment = store.visibleEquipmentForUser(user);
  const openRepairs = store.data.repairs.filter(
    (r) => user.role === "RESPONSIBLE" ? r.status === "OPEN" && visibleEquipment.some((eq) => eq.id === r.equipmentId) : r.status === "OPEN"
  );
  const compactInventory = visibleEquipment.slice(0, 40).map((e) => ({
    inventar: e.inventoryNumber,
    nomi: e.name,
    turi: e.typeName,
    xona: e.roomLabel,
    holat: STATUS_LABELS[e.status],
    foydalanish: USAGE_LABELS[e.usageStatus],
    masul: e.responsibleName,
    kafolat: e.warrantyUntil
  }));
  const compactRepairs = openRepairs.map((r) => ({
    inventar: r.inventoryNumber,
    jihoz: r.equipmentName,
    ijrochi: r.vendorOrTechnician,
    muammo: r.issueDescription,
    yuborilgan: r.sentAt.slice(0, 10)
  }));
  const systemInstruction = `Sen InvenTrack korporativ jihozlar va ta'mir boshqaruv tizimining AI yordamchisisan.
Faqat O'zbek tilida, aniq, lo'nda va amaliy javob ber.
Foydalanuvchi: ${user.fullName} (Rol: ${ROLE_LABELS[user.role]}, Bo'lim: ${user.department}).
Quyidagi real vaqt ma'lumotlariga tayanib javob ber:
- Ko'rinadigan jihozlar soni: ${visibleEquipment.length}
- Faol jihozlar: ${visibleEquipment.filter((e) => e.status === "ACTIVE").length}
- Ta'mirdagi jihozlar: ${visibleEquipment.filter((e) => e.status === "IN_REPAIR").length}
- Zaxiradagi jihozlar: ${visibleEquipment.filter((e) => e.status === "RESERVE").length}
- Hisobdan chiqarilgan: ${visibleEquipment.filter((e) => e.status === "WRITTEN_OFF").length}

Jihozlar ro'yxati (JSON):
${JSON.stringify(compactInventory)}

Ochiq ta'mir yozuvlari (JSON):
${JSON.stringify(compactRepairs)}

Agar foydalanuvchi tizimda yo'q jihoz haqida so'rasa, mavjud emasligini ochiq ayt. Javobingni qisqa bandlar bilan tushunarli formatda yoz.`;
  const recentHistory = history.slice(-8).map((h) => `${h.role === "user" ? "Foydalanuvchi" : "Yordamchi"}: ${h.content}`).join("\n");
  const promptContent = recentHistory ? `Oldingi suhbat:
${recentHistory}

Yangi savol: ${message}` : message;
  const response = await ai.models.generateContent({
    model: "gemini-4-hydrogen",
    contents: promptContent,
    config: {
      systemInstruction
    }
  });
  const text = response.text?.trim();
  if (!text) {
    throw new Error("AI modeli bo\u2018sh javob qaytardi.");
  }
  return text;
}

// server.ts
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Avtorizatsiya talab qilinadi. Qaytadan kiring." });
    return;
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyJwt(token);
  if (!payload) {
    res.status(401).json({ message: "Sessiya muddati tugagan yoki token yaroqsiz." });
    return;
  }
  const found = store.data.users.find((u) => u.id === payload.sub);
  if (!found || !found.active) {
    res.status(401).json({ message: "Foydalanuvchi faol emas yoki topilmadi." });
    return;
  }
  req.user = store.sanitizeUser(found);
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: "Bu amal uchun ruxsatingiz yetarli emas." });
      return;
    }
    next();
  };
}
function csvEscape(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
async function startServer() {
  await store.init();
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ message: "Email va parolni kiriting." });
      return;
    }
    const found = store.data.users.find(
      (u) => u.email.toLowerCase() === String(email).trim().toLowerCase()
    );
    if (!found || !verifyPassword(String(password), found.passwordHash)) {
      res.status(401).json({ message: "Email yoki parol noto\u2018g\u2018ri." });
      return;
    }
    if (!found.active) {
      res.status(403).json({ message: "Hisobingiz faol emas. Administratorga murojaat qiling." });
      return;
    }
    const token = signJwt(found.id, found.role);
    res.json({
      token,
      user: store.sanitizeUser(found)
    });
  });
  app.get("/api/auth/me", authMiddleware, (req, res) => {
    res.json({ user: req.user });
  });
  app.get("/api/references", authMiddleware, (_req, res) => {
    const responsibles = store.data.users.filter((u) => u.active && (u.role === "RESPONSIBLE" || u.role === "ADMIN")).map((u) => ({
      id: u.id,
      fullName: u.fullName,
      department: u.department,
      role: u.role
    }));
    res.json({
      types: store.data.types,
      rooms: store.data.rooms,
      responsibles
    });
  });
  app.get("/api/dashboard", authMiddleware, (req, res) => {
    const user = req.user;
    const items = store.visibleEquipmentForUser(user);
    const statuses = ["ACTIVE", "IN_REPAIR", "RESERVE", "WRITTEN_OFF"];
    const usages = ["IN_USE", "IDLE", "SHARED"];
    const statusBreakdown = statuses.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: items.filter((e) => e.status === status).length
    }));
    const usageBreakdown = usages.map((usage) => ({
      usage,
      label: USAGE_LABELS[usage],
      count: items.filter((e) => e.usageStatus === usage).length
    }));
    const typeBreakdown = store.data.types.map((t) => ({
      typeId: t.id,
      name: t.name,
      count: items.filter((e) => e.typeId === t.id).length
    })).filter((t) => t.count > 0).sort((a, b) => b.count - a.count);
    const visibleIds = new Set(items.map((e) => e.id));
    const recentHistory = store.data.history.filter((h) => visibleIds.has(h.equipmentId)).slice(0, 8).map((h) => {
      const eq = store.data.equipment.find((e) => e.id === h.equipmentId);
      return {
        ...h,
        equipmentName: eq?.name ?? "Noma\u2019lum jihoz",
        inventoryNumber: eq?.inventoryNumber ?? "\u2014"
      };
    });
    const openRepairs = store.data.repairs.filter(
      (r) => r.status === "OPEN" && visibleIds.has(r.equipmentId)
    );
    res.json({
      totalCount: items.length,
      activeCount: items.filter((e) => e.status === "ACTIVE").length,
      inRepairCount: items.filter((e) => e.status === "IN_REPAIR").length,
      reserveCount: items.filter((e) => e.status === "RESERVE").length,
      writtenOffCount: items.filter((e) => e.status === "WRITTEN_OFF").length,
      statusBreakdown,
      usageBreakdown,
      typeBreakdown,
      recentHistory,
      openRepairs
    });
  });
  app.get("/api/equipment", authMiddleware, (req, res) => {
    const user = req.user;
    const q = String(req.query.q ?? "").trim().toLowerCase();
    const status = String(req.query.status ?? "").trim();
    const roomId = String(req.query.roomId ?? "").trim();
    const typeId = String(req.query.typeId ?? "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 8));
    let items = store.visibleEquipmentForUser(user);
    if (q) {
      items = items.filter(
        (e) => e.name.toLowerCase().includes(q) || e.inventoryNumber.toLowerCase().includes(q) || e.serialNumber.toLowerCase().includes(q) || (e.responsibleName ?? "").toLowerCase().includes(q)
      );
    }
    if (status && store.validateStatus(status)) {
      items = items.filter((e) => e.status === status);
    }
    if (roomId) {
      items = items.filter((e) => e.roomId === roomId);
    }
    if (typeId) {
      items = items.filter((e) => e.typeId === typeId);
    }
    items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const paged = items.slice((safePage - 1) * limit, safePage * limit);
    res.json({
      items: paged,
      total,
      page: safePage,
      limit,
      totalPages
    });
  });
  app.get("/api/equipment/:id", authMiddleware, (req, res) => {
    const user = req.user;
    const eq = store.data.equipment.find((e) => e.id === req.params.id);
    if (!eq) {
      res.status(404).json({ message: "Jihoz topilmadi." });
      return;
    }
    if (user.role === "RESPONSIBLE" && eq.responsibleUserId !== user.id) {
      res.status(403).json({ message: "Siz faqat o\u2018zingizga biriktirilgan jihozlarni ko\u2018ra olasiz." });
      return;
    }
    const history = store.data.history.filter((h) => h.equipmentId === eq.id);
    const repairs = store.data.repairs.filter((r) => r.equipmentId === eq.id);
    res.json({
      equipment: store.hydrateEquipment(eq),
      history,
      repairs
    });
  });
  app.post(
    "/api/equipment",
    authMiddleware,
    requireRole("ADMIN"),
    (req, res) => {
      const user = req.user;
      const body = req.body ?? {};
      const name = String(body.name ?? "").trim();
      const inventoryNumber = String(body.inventoryNumber ?? "").trim();
      const serialNumber = String(body.serialNumber ?? "").trim();
      const typeId = String(body.typeId ?? "").trim();
      const roomId = String(body.roomId ?? "").trim();
      const responsibleUserId = String(body.responsibleUserId ?? "").trim();
      const status = String(body.status ?? "ACTIVE");
      const usageStatus = String(body.usageStatus ?? "IN_USE");
      if (!name || !inventoryNumber || !typeId || !roomId || !responsibleUserId) {
        res.status(400).json({ message: "Majburiy maydonlar to\u2018ldirilishi shart." });
        return;
      }
      if (!store.validateStatus(status) || !store.validateUsage(usageStatus)) {
        res.status(400).json({ message: "Holat yoki foydalanish qiymati noto\u2018g\u2018ri." });
        return;
      }
      if (store.data.equipment.some(
        (e) => e.inventoryNumber.toLowerCase() === inventoryNumber.toLowerCase()
      )) {
        res.status(409).json({ message: "Bu inventar raqami allaqachon mavjud." });
        return;
      }
      const newEquipment = {
        id: `eq-${Date.now()}`,
        inventoryNumber,
        name,
        serialNumber: serialNumber || "\u2014",
        typeId,
        roomId,
        responsibleUserId,
        status,
        usageStatus,
        purchaseDate: String(body.purchaseDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)),
        warrantyUntil: String(body.warrantyUntil || "2028-12-31"),
        notes: String(body.notes ?? "").trim(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      store.data.equipment.unshift(newEquipment);
      store.addHistory({
        equipmentId: newEquipment.id,
        actorId: user.id,
        actorName: user.fullName,
        action: "Yangi jihoz qo\u2018shildi",
        changes: `Inventar: ${inventoryNumber} \xB7 Holat: ${STATUS_LABELS[status]}`
      });
      store.save();
      void firestoreService.saveEquipment(newEquipment);
      res.status(201).json({ equipment: store.hydrateEquipment(newEquipment) });
    }
  );
  app.put(
    "/api/equipment/:id",
    authMiddleware,
    requireRole("ADMIN", "RESPONSIBLE"),
    (req, res) => {
      const user = req.user;
      const idx = store.data.equipment.findIndex((e) => e.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ message: "Jihoz topilmadi." });
        return;
      }
      const current = store.data.equipment[idx];
      if (user.role === "RESPONSIBLE" && current.responsibleUserId !== user.id) {
        res.status(403).json({
          message: "Siz faqat o\u2018zingizga biriktirilgan jihozlarni tahrirlashingiz mumkin."
        });
        return;
      }
      const body = req.body ?? {};
      const nextStatus = body.status !== void 0 ? String(body.status) : current.status;
      const nextUsage = body.usageStatus !== void 0 ? String(body.usageStatus) : current.usageStatus;
      if (!store.validateStatus(nextStatus) || !store.validateUsage(nextUsage)) {
        res.status(400).json({ message: "Holat yoki foydalanish qiymati noto\u2018g\u2018ri." });
        return;
      }
      const diffs = [];
      if (nextStatus !== current.status) {
        diffs.push(`Holat: ${STATUS_LABELS[current.status]} \u2192 ${STATUS_LABELS[nextStatus]}`);
      }
      if (nextUsage !== current.usageStatus) {
        diffs.push(
          `Foydalanish: ${USAGE_LABELS[current.usageStatus]} \u2192 ${USAGE_LABELS[nextUsage]}`
        );
      }
      const nextNotes = body.notes !== void 0 ? String(body.notes).trim() : current.notes;
      if (nextNotes !== current.notes) {
        diffs.push("Izoh yangilandi");
      }
      let updated;
      if (user.role === "RESPONSIBLE") {
        updated = {
          ...current,
          status: nextStatus,
          usageStatus: nextUsage,
          notes: nextNotes,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      } else {
        const nextName = body.name !== void 0 ? String(body.name).trim() : current.name;
        const nextInv = body.inventoryNumber !== void 0 ? String(body.inventoryNumber).trim() : current.inventoryNumber;
        if (!nextName || !nextInv) {
          res.status(400).json({ message: "Nomi va inventar raqami bo\u2018sh bo\u2018lmasligi kerak." });
          return;
        }
        if (nextName !== current.name) diffs.push(`Nomi: ${current.name} \u2192 ${nextName}`);
        if (body.roomId && body.roomId !== current.roomId) diffs.push("Xona o\u2018zgartirildi");
        if (body.responsibleUserId && body.responsibleUserId !== current.responsibleUserId) {
          diffs.push("Mas\u2019ul shaxs almashtirildi");
        }
        updated = {
          ...current,
          name: nextName,
          inventoryNumber: nextInv,
          serialNumber: body.serialNumber !== void 0 ? String(body.serialNumber).trim() : current.serialNumber,
          typeId: body.typeId ? String(body.typeId) : current.typeId,
          roomId: body.roomId ? String(body.roomId) : current.roomId,
          responsibleUserId: body.responsibleUserId ? String(body.responsibleUserId) : current.responsibleUserId,
          status: nextStatus,
          usageStatus: nextUsage,
          purchaseDate: body.purchaseDate ? String(body.purchaseDate) : current.purchaseDate,
          warrantyUntil: body.warrantyUntil ? String(body.warrantyUntil) : current.warrantyUntil,
          notes: nextNotes,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      store.data.equipment[idx] = updated;
      store.addHistory({
        equipmentId: updated.id,
        actorId: user.id,
        actorName: user.fullName,
        action: "Jihoz ma\u2019lumotlari yangilandi",
        changes: diffs.length > 0 ? diffs.join(" \xB7 ") : "Saqlash tasdiqlandi"
      });
      store.save();
      void firestoreService.saveEquipment(updated);
      res.json({ equipment: store.hydrateEquipment(updated) });
    }
  );
  app.delete(
    "/api/equipment/:id",
    authMiddleware,
    requireRole("ADMIN"),
    (req, res) => {
      const idx = store.data.equipment.findIndex((e) => e.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ message: "Jihoz topilmadi." });
        return;
      }
      store.data.equipment.splice(idx, 1);
      store.save();
      void firestoreService.deleteEquipment(req.params.id);
      res.json({ ok: true });
    }
  );
  app.get("/api/repairs", authMiddleware, (req, res) => {
    const user = req.user;
    const statusFilter = String(req.query.status ?? "").trim();
    const visibleIds = new Set(store.visibleEquipmentForUser(user).map((e) => e.id));
    let repairs = store.data.repairs.filter((r) => visibleIds.has(r.equipmentId));
    if (statusFilter === "OPEN" || statusFilter === "COMPLETED") {
      repairs = repairs.filter((r) => r.status === statusFilter);
    }
    repairs.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    res.json({ repairs });
  });
  app.post(
    "/api/repairs/dispatch",
    authMiddleware,
    requireRole("ADMIN", "RESPONSIBLE"),
    (req, res) => {
      const user = req.user;
      const { equipmentId, vendorOrTechnician, issueDescription } = req.body ?? {};
      const eqIdx = store.data.equipment.findIndex((e) => e.id === equipmentId);
      if (eqIdx === -1) {
        res.status(404).json({ message: "Jihoz topilmadi." });
        return;
      }
      const eq = store.data.equipment[eqIdx];
      if (user.role === "RESPONSIBLE" && eq.responsibleUserId !== user.id) {
        res.status(403).json({
          message: "Faqat o\u2018zingizga biriktirilgan jihozni ta\u2019mirga yubora olasiz."
        });
        return;
      }
      if (eq.status === "IN_REPAIR") {
        res.status(409).json({ message: "Bu jihoz allaqachon ta\u2019mirda." });
        return;
      }
      if (!vendorOrTechnician || !issueDescription) {
        res.status(400).json({ message: "Ustaxona/ijrochi va nosozlik tavsifini kiriting." });
        return;
      }
      const prevStatus = eq.status;
      store.data.equipment[eqIdx] = {
        ...eq,
        status: "IN_REPAIR",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const record = {
        id: `rep-${Date.now()}`,
        equipmentId: eq.id,
        equipmentName: eq.name,
        inventoryNumber: eq.inventoryNumber,
        sentById: user.id,
        sentByName: user.fullName,
        vendorOrTechnician: String(vendorOrTechnician).trim(),
        issueDescription: String(issueDescription).trim(),
        status: "OPEN",
        sentAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      store.data.repairs.unshift(record);
      store.addHistory({
        equipmentId: eq.id,
        actorId: user.id,
        actorName: user.fullName,
        action: "Ta\u2019mirga jo\u2018natildi",
        changes: `Holat: ${STATUS_LABELS[prevStatus]} \u2192 Ta\u2019mirda \xB7 Ijrochi: ${record.vendorOrTechnician}`
      });
      store.save();
      void firestoreService.saveRepair(record);
      void firestoreService.saveEquipment(store.data.equipment[eqIdx]);
      res.status(201).json({ repair: record });
    }
  );
  app.post(
    "/api/repairs/:id/return",
    authMiddleware,
    requireRole("ADMIN", "RESPONSIBLE"),
    (req, res) => {
      const user = req.user;
      const repIdx = store.data.repairs.findIndex((r) => r.id === req.params.id);
      if (repIdx === -1) {
        res.status(404).json({ message: "Ta\u2019mir yozuvi topilmadi." });
        return;
      }
      const repair = store.data.repairs[repIdx];
      if (repair.status === "COMPLETED") {
        res.status(409).json({ message: "Bu ta\u2019mir allaqachon yakunlangan." });
        return;
      }
      const eqIdx = store.data.equipment.findIndex((e) => e.id === repair.equipmentId);
      if (eqIdx === -1) {
        res.status(404).json({ message: "Bog\u2018langan jihoz topilmadi." });
        return;
      }
      const eq = store.data.equipment[eqIdx];
      if (user.role === "RESPONSIBLE" && eq.responsibleUserId !== user.id) {
        res.status(403).json({
          message: "Faqat o\u2018zingizga biriktirilgan jihozni ta\u2019mirdan qaytara olasiz."
        });
        return;
      }
      const { targetStatus, resolutionNotes, cost } = req.body ?? {};
      const nextStatus = targetStatus === "RESERVE" || targetStatus === "WRITTEN_OFF" ? targetStatus : "ACTIVE";
      const parsedCost = cost !== void 0 && cost !== "" ? Math.max(0, Number(cost) || 0) : 0;
      const notes = String(resolutionNotes ?? "Ta\u2019mir muvaffaqiyatli yakunlandi.").trim();
      store.data.repairs[repIdx] = {
        ...repair,
        status: "COMPLETED",
        returnedAt: (/* @__PURE__ */ new Date()).toISOString(),
        resolutionNotes: notes,
        cost: parsedCost
      };
      store.data.equipment[eqIdx] = {
        ...eq,
        status: nextStatus,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      store.addHistory({
        equipmentId: eq.id,
        actorId: user.id,
        actorName: user.fullName,
        action: "Ta\u2019mirdan qaytarildi",
        changes: `Holat: Ta\u2019mirda \u2192 ${STATUS_LABELS[nextStatus]} \xB7 Xarajat: ${parsedCost.toLocaleString("ru-RU")} so\u2018m`
      });
      store.save();
      void firestoreService.saveRepair(store.data.repairs[repIdx]);
      void firestoreService.saveEquipment(store.data.equipment[eqIdx]);
      res.json({ repair: store.data.repairs[repIdx] });
    }
  );
  app.get("/api/reports/summary", authMiddleware, (req, res) => {
    const user = req.user;
    const items = store.visibleEquipmentForUser(user);
    const totalEquipment = items.length || 1;
    const statuses = ["ACTIVE", "IN_REPAIR", "RESERVE", "WRITTEN_OFF"];
    const byStatus = statuses.map((status) => {
      const count = items.filter((e) => e.status === status).length;
      return {
        status,
        label: STATUS_LABELS[status],
        count,
        share: Math.round(count / totalEquipment * 100)
      };
    });
    const byType = store.data.types.map((t) => {
      const matched = items.filter((e) => e.typeId === t.id);
      return {
        typeId: t.id,
        name: t.name,
        count: matched.length,
        activeCount: matched.filter((e) => e.status === "ACTIVE").length,
        inRepairCount: matched.filter((e) => e.status === "IN_REPAIR").length
      };
    });
    const byRoom = store.data.rooms.map((r) => {
      const matched = items.filter((e) => e.roomId === r.id);
      return {
        roomId: r.id,
        code: r.code,
        name: r.name,
        count: matched.length,
        activeCount: matched.filter((e) => e.status === "ACTIVE").length,
        inRepairCount: matched.filter((e) => e.status === "IN_REPAIR").length
      };
    });
    const visibleIds = new Set(items.map((e) => e.id));
    const repairs = store.data.repairs.filter((r) => visibleIds.has(r.equipmentId));
    const totalRepairCost = repairs.reduce((sum, r) => sum + (r.cost || 0), 0);
    const openRepairsCount = repairs.filter((r) => r.status === "OPEN").length;
    res.json({
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      totalEquipment: items.length,
      totalRepairCost,
      openRepairsCount,
      byStatus,
      byType,
      byRoom
    });
  });
  app.get(
    "/api/reports/export/csv",
    authMiddleware,
    (req, res) => {
      const user = req.user;
      const items = store.visibleEquipmentForUser(user);
      const headers = [
        "Inventar raqami",
        "Jihoz nomi",
        "Seriya raqami",
        "Turi",
        "Xona",
        "Masul shaxs",
        "Holati",
        "Foydalanish",
        "Xarid sanasi",
        "Kafolat muddati",
        "Izoh"
      ];
      const rows = items.map(
        (e) => [
          e.inventoryNumber,
          e.name,
          e.serialNumber,
          e.typeName,
          e.roomLabel,
          e.responsibleName,
          STATUS_LABELS[e.status],
          USAGE_LABELS[e.usageStatus],
          e.purchaseDate,
          e.warrantyUntil,
          e.notes
        ].map(csvEscape).join(",")
      );
      const csvContent = "\uFEFF" + [headers.map(csvEscape).join(","), ...rows].join("\r\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="inventrack-hisobot-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`
      );
      res.send(csvContent);
    }
  );
  app.get(
    "/api/admin/users",
    authMiddleware,
    requireRole("ADMIN"),
    (_req, res) => {
      res.json({ users: store.data.users.map((u) => store.sanitizeUser(u)) });
    }
  );
  app.post(
    "/api/admin/users",
    authMiddleware,
    requireRole("ADMIN"),
    (req, res) => {
      const { fullName, email, password, role, department } = req.body ?? {};
      if (!fullName || !email || !password || !role) {
        res.status(400).json({ message: "Barcha majburiy maydonlarni to\u2018ldiring." });
        return;
      }
      if (!["ADMIN", "RESPONSIBLE", "EMPLOYEE"].includes(role)) {
        res.status(400).json({ message: "Rol qiymati noto\u2018g\u2018ri." });
        return;
      }
      if (store.data.users.some(
        (u) => u.email.toLowerCase() === String(email).trim().toLowerCase()
      )) {
        res.status(409).json({ message: "Bu email bilan foydalanuvchi allaqachon mavjud." });
        return;
      }
      const newUser = {
        id: `u-${Date.now()}`,
        fullName: String(fullName).trim(),
        email: String(email).trim().toLowerCase(),
        passwordHash: hashPassword(String(password)),
        role,
        department: String(department ?? "Umumiy bo\u2018lim").trim(),
        active: true,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      store.data.users.push(newUser);
      store.save();
      void firestoreService.saveUser(newUser);
      res.status(201).json({ user: store.sanitizeUser(newUser) });
    }
  );
  app.patch(
    "/api/admin/users/:id",
    authMiddleware,
    requireRole("ADMIN"),
    (req, res) => {
      const idx = store.data.users.findIndex((u) => u.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ message: "Foydalanuvchi topilmadi." });
        return;
      }
      const current = store.data.users[idx];
      const { role, active, department, fullName } = req.body ?? {};
      if (role !== void 0 && !["ADMIN", "RESPONSIBLE", "EMPLOYEE"].includes(role)) {
        res.status(400).json({ message: "Rol qiymati noto\u2018g\u2018ri." });
        return;
      }
      store.data.users[idx] = {
        ...current,
        fullName: fullName !== void 0 ? String(fullName).trim() : current.fullName,
        department: department !== void 0 ? String(department).trim() : current.department,
        role: role !== void 0 ? role : current.role,
        active: active !== void 0 ? Boolean(active) : current.active
      };
      store.save();
      void firestoreService.saveUser(store.data.users[idx]);
      res.json({ user: store.sanitizeUser(store.data.users[idx]) });
    }
  );
  app.post(
    "/api/admin/references/types",
    authMiddleware,
    requireRole("ADMIN"),
    (req, res) => {
      const name = String(req.body?.name ?? "").trim();
      if (!name) {
        res.status(400).json({ message: "Tur nomini kiriting." });
        return;
      }
      const item = { id: `type-${Date.now()}`, name };
      store.data.types.push(item);
      store.save();
      void firestoreService.saveType(item);
      res.status(201).json({ type: item });
    }
  );
  app.delete(
    "/api/admin/references/types/:id",
    authMiddleware,
    requireRole("ADMIN"),
    (req, res) => {
      if (store.data.equipment.some((e) => e.typeId === req.params.id)) {
        res.status(409).json({
          message: "Ushbu turga biriktirilgan jihozlar borligi sababli o\u2018chirib bo\u2018lmaydi."
        });
        return;
      }
      store.data.types = store.data.types.filter((t) => t.id !== req.params.id);
      store.save();
      void firestoreService.deleteType(req.params.id);
      res.json({ ok: true });
    }
  );
  app.post(
    "/api/admin/references/rooms",
    authMiddleware,
    requireRole("ADMIN"),
    (req, res) => {
      const code = String(req.body?.code ?? "").trim();
      const name = String(req.body?.name ?? "").trim();
      const floor = String(req.body?.floor ?? "1-qavat").trim();
      if (!code || !name) {
        res.status(400).json({ message: "Xona kodi va nomini kiriting." });
        return;
      }
      const item = { id: `room-${Date.now()}`, code, name, floor };
      store.data.rooms.push(item);
      store.save();
      void firestoreService.saveRoom(item);
      res.status(201).json({ room: item });
    }
  );
  app.delete(
    "/api/admin/references/rooms/:id",
    authMiddleware,
    requireRole("ADMIN"),
    (req, res) => {
      if (store.data.equipment.some((e) => e.roomId === req.params.id)) {
        res.status(409).json({
          message: "Ushbu xonada jihozlar mavjudligi sababli o\u2018chirib bo\u2018lmaydi."
        });
        return;
      }
      store.data.rooms = store.data.rooms.filter((r) => r.id !== req.params.id);
      store.save();
      void firestoreService.deleteRoom(req.params.id);
      res.json({ ok: true });
    }
  );
  app.get(
    "/api/admin/firestore/status",
    authMiddleware,
    requireRole("ADMIN"),
    (_req, res) => {
      res.json(firestoreService.getStatus());
    }
  );
  app.post(
    "/api/admin/firestore/sync",
    authMiddleware,
    requireRole("ADMIN"),
    async (_req, res) => {
      if (!firestoreService.isConnected) {
        res.status(400).json({
          message: "Firestore ulanmagan. Iltimos, avval .env faylida Firebase kalitlarini sozlang.",
          status: firestoreService.getStatus()
        });
        return;
      }
      try {
        const result = await firestoreService.seedData(store.data);
        res.json({
          message: "Barcha ma\u2019lumotlar Firestore-ga muvaffaqiyatli sinxronlashtirildi.",
          result
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ message: `Sinxronlashda xatolik: ${errMsg}` });
      }
    }
  );
  app.post("/api/ai/chat", authMiddleware, async (req, res) => {
    const user = req.user;
    const { message, history } = req.body ?? {};
    if (!message || !String(message).trim()) {
      res.status(400).json({ message: "Xabar matni bo\u2018sh bo\u2018lmasligi kerak." });
      return;
    }
    try {
      const reply = await generateInventoryChatReply(
        user,
        String(message).trim(),
        Array.isArray(history) ? history : []
      );
      res.json({ reply });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "AI xizmatida xatolik yuz berdi.";
      console.error("Gemini AI chat error:", err);
      res.status(502).json({ message: errMsg });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path3.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      const indexFile = path3.join(distDir, "index.html");
      if (fs3.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send("Build fayllari topilmadi.");
      }
    });
  }
  const port = Number(process.env.PORT) || 3e3;
  const host = process.env.HOST || "127.0.0.1";
  const displayHost = host === "0.0.0.0" ? "localhost" : host;
  app.listen(port, host, () => {
    console.log(`InvenTrack server running at http://${displayHost}:${port}`);
  });
}
startServer().catch((err) => {
  console.error("Server start failed:", err);
  process.exit(1);
});
