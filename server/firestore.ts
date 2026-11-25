import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import type {
  Equipment,
  EquipmentHistoryItem,
  EquipmentTypeRef,
  RepairRecord,
  RoomRef,
} from '../src/types/inventory.ts';
import type { DatabaseState, StoredUser } from './store.ts';

export interface FirestoreConnectionStatus {
  connected: boolean;
  mode: 'firestore' | 'fallback_local';
  projectId?: string;
  source?: 'service_account_path' | 'env_vars' | 'service_account_json' | 'adc' | 'emulator';
  message: string;
}

class FirestoreService {
  private app: App | null = null;
  private db: Firestore | null = null;
  private status: FirestoreConnectionStatus = {
    connected: false,
    mode: 'fallback_local',
    message: 'Firestore ulanmagan. Mahalliy rejim ishga tushirildi.',
  };

  constructor() {
    this.init();
  }

  private init(): void {
    try {
      // 1. Check if emulator is specified
      if (process.env.FIRESTORE_EMULATOR_HOST) {
        this.app =
          getApps().length > 0
            ? getApp()
            : initializeApp({
                projectId: process.env.FIREBASE_PROJECT_ID || 'demo-inventrack',
              });
        this.db = getFirestore(this.app);
        this.status = {
          connected: true,
          mode: 'firestore',
          projectId: process.env.FIREBASE_PROJECT_ID || 'demo-inventrack',
          source: 'emulator',
          message: `Firestore Emulator ulandi (${process.env.FIRESTORE_EMULATOR_HOST})`,
        };
        console.log(`[Firestore] ${this.status.message}`);
        return;
      }

      // 2. Service account JSON file path (explicit or auto-discovered)
      let serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      if (!serviceAccountPath) {
        const candidateDirs = [process.cwd(), path.resolve(process.cwd(), 'server')];
        for (const dir of candidateDirs) {
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            const found = files.find(
              (f) =>
                f.endsWith('.json') &&
                (f.includes('firebase-adminsdk') || f.includes('serviceAccount') || f.includes('service-account'))
            );
            if (found) {
              serviceAccountPath = path.join(dir, found);
              break;
            }
          }
        }
      }

      if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        const raw = fs.readFileSync(serviceAccountPath, 'utf8');
        const certData = JSON.parse(raw);
        this.app =
          getApps().length > 0
            ? getApp()
            : initializeApp({
                credential: cert(certData),
                projectId: certData.project_id || process.env.FIREBASE_PROJECT_ID,
              });
        this.db = getFirestore(this.app);
        this.status = {
          connected: true,
          mode: 'firestore',
          projectId: certData.project_id || process.env.FIREBASE_PROJECT_ID,
          source: 'service_account_path',
          message: `Firestore Service Account fayli orqali ulandi (${path.basename(serviceAccountPath)})`,
        };
        console.log(`[Firestore] ✅ ${this.status.message} [Project: ${this.status.projectId}]`);
        return;
      }

      // 3. Service account raw JSON string in env
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
        if (jsonStr.startsWith('{')) {
          const certData = JSON.parse(jsonStr);
          this.app =
            getApps().length > 0
              ? getApp()
              : initializeApp({
                  credential: cert(certData),
                  projectId: certData.project_id || process.env.FIREBASE_PROJECT_ID,
                });
          this.db = getFirestore(this.app);
          this.status = {
            connected: true,
            mode: 'firestore',
            projectId: certData.project_id || process.env.FIREBASE_PROJECT_ID,
            source: 'service_account_json',
            message: 'Firestore FIREBASE_SERVICE_ACCOUNT_JSON orqali ulandi',
          };
          console.log(`[Firestore] ✅ ${this.status.message} [Project: ${this.status.projectId}]`);
          return;
        }
      }

      // 4. Discrete Environment Variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (projectId && clientEmail && privateKey) {
        // Handle escaped newlines in .env private keys
        privateKey = privateKey.replace(/\\n/g, '\n');
        this.app =
          getApps().length > 0
            ? getApp()
            : initializeApp({
                credential: cert({
                  projectId,
                  clientEmail,
                  privateKey,
                }),
                projectId,
              });
        this.db = getFirestore(this.app);
        this.status = {
          connected: true,
          mode: 'firestore',
          projectId,
          source: 'env_vars',
          message: 'Firestore muhit o‘zgaruvchilari (env) orqali ulandi',
        };
        console.log(`[Firestore] ✅ ${this.status.message} [Project: ${projectId}]`);
        return;
      }

      // 5. Google Application Default Credentials (GCP / Cloud Run / gcloud auth)
      if (
        process.env.GOOGLE_APPLICATION_CREDENTIALS &&
        fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      ) {
        this.app =
          getApps().length > 0
            ? getApp()
            : initializeApp({
                credential: applicationDefault(),
                projectId: process.env.FIREBASE_PROJECT_ID,
              });
        this.db = getFirestore(this.app);
        this.status = {
          connected: true,
          mode: 'firestore',
          projectId: process.env.FIREBASE_PROJECT_ID,
          source: 'adc',
          message: 'Firestore Application Default Credentials orqali ulandi',
        };
        console.log(`[Firestore] ✅ ${this.status.message}`);
        return;
      }

      // Fallback: Not configured
      this.status = {
        connected: false,
        mode: 'fallback_local',
        message:
          'Firestore sozlanmagan. Tizim mahalliy fayl ombori (data/db.json) bilan ishlamoqda.',
      };
      console.log(`[Firestore] ℹ️ ${this.status.message}`);
      console.log(
        '[Firestore] 💡 Firestore-ni ulash uchun .env fayliga FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL va FIREBASE_PRIVATE_KEY parametrlarini kiriting.'
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.status = {
        connected: false,
        mode: 'fallback_local',
        message: `Firestore ulanishida xatolik yuz berdi: ${errMsg}`,
      };
      console.error(`[Firestore] ⚠️ ${this.status.message}`);
    }
  }

  public get isConnected(): boolean {
    return this.status.connected && this.db !== null;
  }

  public getStatus(): FirestoreConnectionStatus {
    return { ...this.status };
  }

  public getDb(): Firestore | null {
    return this.db;
  }

  /**
   * Loads all collections from Firestore.
   * If collections are empty, returns null so the caller can seed initial data.
   */
  public async loadAll(): Promise<DatabaseState | null> {
    if (!this.isConnected || !this.db) {
      return null;
    }

    try {
      const [usersSnap, typesSnap, roomsSnap, eqSnap, historySnap, repairsSnap] =
        await Promise.all([
          this.db.collection('users').get(),
          this.db.collection('types').get(),
          this.db.collection('rooms').get(),
          this.db.collection('equipment').get(),
          this.db.collection('history').orderBy('createdAt', 'desc').limit(200).get(),
          this.db.collection('repairs').orderBy('sentAt', 'desc').get(),
        ]);

      // If equipment and users are empty, Firestore hasn't been seeded yet
      if (usersSnap.empty && eqSnap.empty) {
        return null;
      }

      const users: StoredUser[] = [];
      usersSnap.forEach((doc) => users.push(doc.data() as StoredUser));

      const types: EquipmentTypeRef[] = [];
      typesSnap.forEach((doc) => types.push(doc.data() as EquipmentTypeRef));

      const rooms: RoomRef[] = [];
      roomsSnap.forEach((doc) => rooms.push(doc.data() as RoomRef));

      const equipment: Equipment[] = [];
      eqSnap.forEach((doc) => equipment.push(doc.data() as Equipment));

      const history: EquipmentHistoryItem[] = [];
      historySnap.forEach((doc) => history.push(doc.data() as EquipmentHistoryItem));

      const repairs: RepairRecord[] = [];
      repairsSnap.forEach((doc) => repairs.push(doc.data() as RepairRecord));

      return {
        users,
        types,
        rooms,
        equipment,
        history,
        repairs,
      };
    } catch (err) {
      console.error('[Firestore] Ma’lumotlarni yuklashda xatolik:', err);
      return null;
    }
  }

  /**
   * Seeds initial seed data into Firestore in batches.
   */
  public async seedData(
    seed: DatabaseState
  ): Promise<{ seeded: boolean; counts: Record<string, number> }> {
    if (!this.isConnected || !this.db) {
      throw new Error('Firestore ulanmagan.');
    }

    const counts: Record<string, number> = {
      users: 0,
      types: 0,
      rooms: 0,
      equipment: 0,
      history: 0,
      repairs: 0,
    };

    const batch = this.db.batch();

    for (const u of seed.users) {
      const ref = this.db.collection('users').doc(u.id);
      batch.set(ref, u, { merge: true });
      counts.users++;
    }

    for (const t of seed.types) {
      const ref = this.db.collection('types').doc(t.id);
      batch.set(ref, t, { merge: true });
      counts.types++;
    }

    for (const r of seed.rooms) {
      const ref = this.db.collection('rooms').doc(r.id);
      batch.set(ref, r, { merge: true });
      counts.rooms++;
    }

    for (const e of seed.equipment) {
      const ref = this.db.collection('equipment').doc(e.id);
      batch.set(ref, e, { merge: true });
      counts.equipment++;
    }

    for (const h of seed.history) {
      const ref = this.db.collection('history').doc(h.id);
      batch.set(ref, h, { merge: true });
      counts.history++;
    }

    for (const rep of seed.repairs) {
      const ref = this.db.collection('repairs').doc(rep.id);
      batch.set(ref, rep, { merge: true });
      counts.repairs++;
    }

    await batch.commit();
    console.log(
      '[Firestore] ✅ Boshlang‘ich ma’lumotlar Firestore-ga muvaffaqiyatli yuklandi:',
      counts
    );
    return { seeded: true, counts };
  }

  // --- CRUD Sync Methods (Fire-and-forget or awaited) ---

  public async saveEquipment(item: Equipment): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('equipment').doc(item.id).set(item, { merge: true });
    } catch (err) {
      console.error(`[Firestore] Jihozni saqlashda xatolik (${item.id}):`, err);
    }
  }

  public async deleteEquipment(id: string): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('equipment').doc(id).delete();
    } catch (err) {
      console.error(`[Firestore] Jihozni o‘chirishda xatolik (${id}):`, err);
    }
  }

  public async saveRepair(item: RepairRecord): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('repairs').doc(item.id).set(item, { merge: true });
    } catch (err) {
      console.error(`[Firestore] Ta’mirni saqlashda xatolik (${item.id}):`, err);
    }
  }

  public async saveHistory(item: EquipmentHistoryItem): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('history').doc(item.id).set(item, { merge: true });
    } catch (err) {
      console.error(`[Firestore] Tarix yozuvini saqlashda xatolik (${item.id}):`, err);
    }
  }

  public async saveUser(item: StoredUser): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('users').doc(item.id).set(item, { merge: true });
    } catch (err) {
      console.error(`[Firestore] Foydalanuvchini saqlashda xatolik (${item.id}):`, err);
    }
  }

  public async saveType(item: EquipmentTypeRef): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('types').doc(item.id).set(item, { merge: true });
    } catch (err) {
      console.error(`[Firestore] Jihoz turini saqlashda xatolik (${item.id}):`, err);
    }
  }

  public async deleteType(id: string): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('types').doc(id).delete();
    } catch (err) {
      console.error(`[Firestore] Jihoz turini o‘chirishda xatolik (${id}):`, err);
    }
  }

  public async saveRoom(item: RoomRef): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('rooms').doc(item.id).set(item, { merge: true });
    } catch (err) {
      console.error(`[Firestore] Xonani saqlashda xatolik (${item.id}):`, err);
    }
  }

  public async deleteRoom(id: string): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('rooms').doc(id).delete();
    } catch (err) {
      console.error(`[Firestore] Xonani o‘chirishda xatolik (${id}):`, err);
    }
  }
}

export const firestoreService = new FirestoreService();
