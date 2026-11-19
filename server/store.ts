import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  Equipment,
  EquipmentHistoryItem,
  EquipmentStatus,
  EquipmentTypeRef,
  RepairRecord,
  RoomRef,
  UsageStatus,
  User,
  UserRole,
} from '../src/types/inventory.ts';

export interface StoredUser extends User {
  passwordHash: string;
}

export interface DatabaseState {
  users: StoredUser[];
  types: EquipmentTypeRef[];
  rooms: RoomRef[];
  equipment: Equipment[];
  history: EquipmentHistoryItem[];
  repairs: RepairRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'inventrack-local-dev-secret-key-2026';

export function hashPassword(password: string): string {
  const salt = 'inventrack-salt-v1';
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  return hashPassword(password) === passwordHash;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
  exp: number;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64').toString('utf8');
}

export function signJwt(userId: string, role: UserRole): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: JwtPayload = {
    sub: userId,
    role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = base64UrlEncode(
    crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest()
    );
    if (sig !== expectedSig) return null;
    const decoded = JSON.parse(base64UrlDecode(body)) as JwtPayload;
    if (!decoded.sub || !decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function createInitialSeed(): DatabaseState {
  const defaultPass = hashPassword('password123');
  const users: StoredUser[] = [
    {
      id: 'u-admin',
      fullName: 'G‘olibjon Karimov',
      email: 'admin@inventrack.uz',
      passwordHash: defaultPass,
      role: 'ADMIN',
      department: 'IT va Infratuzilma',
      active: true,
      createdAt: '2026-01-10T09:00:00.000Z',
    },
    {
      id: 'u-resp-1',
      fullName: 'Nurmuhammad Tursunov',
      email: 'masul@inventrack.uz',
      passwordHash: defaultPass,
      role: 'RESPONSIBLE',
      department: 'Dasturlash bo‘limi',
      active: true,
      createdAt: '2026-01-12T10:30:00.000Z',
    },
    {
      id: 'u-resp-2',
      fullName: 'Sanobar Alimova',
      email: 'sanobar@inventrack.uz',
      passwordHash: defaultPass,
      role: 'RESPONSIBLE',
      department: 'Moliya va Hisob',
      active: true,
      createdAt: '2026-01-14T11:00:00.000Z',
    },
    {
      id: 'u-emp',
      fullName: 'Dilshod Rahimov',
      email: 'xodim@inventrack.uz',
      passwordHash: defaultPass,
      role: 'EMPLOYEE',
      department: 'Kadrlar bo‘limi',
      active: true,
      createdAt: '2026-02-01T09:15:00.000Z',
    },
  ];

  const types: EquipmentTypeRef[] = [
    { id: 'type-laptop', name: 'Noutbuk' },
    { id: 'type-desktop', name: 'Statsionar kompyuter' },
    { id: 'type-printer', name: 'Printer va MFU' },
    { id: 'type-monitor', name: 'Monitor' },
    { id: 'type-network', name: 'Tarmoq qurilmasi' },
    { id: 'type-projector', name: 'Proyektor va taqdimot' },
  ];

  const rooms: RoomRef[] = [
    { id: 'room-101', code: '101', name: 'Qabulxona va Boshqaruv', floor: '1-qavat' },
    { id: 'room-204', code: '204', name: 'Moliya bo‘limi', floor: '2-qavat' },
    { id: 'room-301', code: '301', name: 'Katta majlislar zali', floor: '3-qavat' },
    { id: 'room-304', code: '304', name: 'Dasturlash va IT markazi', floor: '3-qavat' },
    { id: 'room-402', code: '402', name: 'Server va tarmoq xonasi', floor: '4-qavat' },
    { id: 'room-001', code: '001', name: 'Markaziy zaxira ombori', floor: 'Yerto‘la' },
  ];

  const equipment: Equipment[] = [
    {
      id: 'eq-1001',
      inventoryNumber: 'INV-2026-001',
      name: 'MacBook Pro 14 M3 Pro',
      serialNumber: 'C02YM41KJG5H',
      typeId: 'type-laptop',
      roomId: 'room-304',
      responsibleUserId: 'u-resp-1',
      status: 'ACTIVE',
      usageStatus: 'IN_USE',
      purchaseDate: '2025-03-14',
      warrantyUntil: '2028-03-14',
      notes: 'Frontend va mobil ishlanma uchun asosiy ishchi noutbuk.',
      updatedAt: '2026-11-12T10:20:00.000Z',
    },
    {
      id: 'eq-1002',
      inventoryNumber: 'INV-2026-002',
      name: 'Dell UltraSharp U2723QE 27"',
      serialNumber: 'CN-0X98K2-TV100',
      typeId: 'type-monitor',
      roomId: 'room-304',
      responsibleUserId: 'u-resp-1',
      status: 'ACTIVE',
      usageStatus: 'IN_USE',
      purchaseDate: '2025-04-02',
      warrantyUntil: '2028-04-02',
      notes: '4K IPS USB-C hub bilan jihozlangan monitor.',
      updatedAt: '2026-11-10T14:05:00.000Z',
    },
    {
      id: 'eq-1003',
      inventoryNumber: 'INV-2026-003',
      name: 'HP LaserJet Pro MFP M428fdw',
      serialNumber: 'VNB3R19482',
      typeId: 'type-printer',
      roomId: 'room-204',
      responsibleUserId: 'u-resp-2',
      status: 'IN_REPAIR',
      usageStatus: 'SHARED',
      purchaseDate: '2024-06-20',
      warrantyUntil: '2026-06-20',
      notes: 'Qog‘oz tortish rolikida nosozlik kuzatilgan, servisga yuborilgan.',
      updatedAt: '2026-11-14T08:40:00.000Z',
    },
    {
      id: 'eq-1004',
      inventoryNumber: 'INV-2026-004',
      name: 'Lenovo ThinkPad T14 Gen 4',
      serialNumber: 'PF4A91KL',
      typeId: 'type-laptop',
      roomId: 'room-304',
      responsibleUserId: 'u-resp-1',
      status: 'IN_REPAIR',
      usageStatus: 'IN_USE',
      purchaseDate: '2024-09-10',
      warrantyUntil: '2027-09-10',
      notes: 'Batareya sig‘imi tushib ketgani va quvvatlash porti uchun ta’mirda.',
      updatedAt: '2026-11-15T11:15:00.000Z',
    },
    {
      id: 'eq-1005',
      inventoryNumber: 'INV-2026-005',
      name: 'MikroTik Cloud Core Router CCR2004',
      serialNumber: 'MT-CCR2004-8821',
      typeId: 'type-network',
      roomId: 'room-402',
      responsibleUserId: 'u-admin',
      status: 'ACTIVE',
      usageStatus: 'SHARED',
      purchaseDate: '2024-02-11',
      warrantyUntil: '2027-02-11',
      notes: 'Asosiy magistral marshrutizator, 24/7 rejimda ishlaydi.',
      updatedAt: '2026-11-01T09:00:00.000Z',
    },
    {
      id: 'eq-1006',
      inventoryNumber: 'INV-2026-006',
      name: 'Epson EB-L630U Lazer Proyektor',
      serialNumber: 'EP-L630-44109',
      typeId: 'type-projector',
      roomId: 'room-301',
      responsibleUserId: 'u-resp-1',
      status: 'ACTIVE',
      usageStatus: 'SHARED',
      purchaseDate: '2025-01-25',
      warrantyUntil: '2028-01-25',
      notes: 'Katta majlislar zalida taqdimotlar uchun o‘rnatilgan.',
      updatedAt: '2026-10-28T16:30:00.000Z',
    },
    {
      id: 'eq-1007',
      inventoryNumber: 'INV-2026-007',
      name: 'HP ProDesk 400 G9 Mini',
      serialNumber: '8CG31209PQ',
      typeId: 'type-desktop',
      roomId: 'room-204',
      responsibleUserId: 'u-resp-2',
      status: 'ACTIVE',
      usageStatus: 'IN_USE',
      purchaseDate: '2025-02-18',
      warrantyUntil: '2028-02-18',
      notes: '1C va buxgalteriya hisobi uchun ajratilgan.',
      updatedAt: '2026-11-05T13:20:00.000Z',
    },
    {
      id: 'eq-1008',
      inventoryNumber: 'INV-2026-008',
      name: 'ASUS ProArt PA278QV 27"',
      serialNumber: 'AS-PA278-77312',
      typeId: 'type-monitor',
      roomId: 'room-001',
      responsibleUserId: 'u-resp-1',
      status: 'RESERVE',
      usageStatus: 'IDLE',
      purchaseDate: '2025-07-08',
      warrantyUntil: '2028-07-08',
      notes: 'Yangi ishga olinadigan dizayner/dasturchi uchun zaxirada.',
      updatedAt: '2026-11-08T12:00:00.000Z',
    },
    {
      id: 'eq-1009',
      inventoryNumber: 'INV-2026-009',
      name: 'Cisco Catalyst 2960X-48FPS',
      serialNumber: 'FCW2140B09X',
      typeId: 'type-network',
      roomId: 'room-402',
      responsibleUserId: 'u-admin',
      status: 'ACTIVE',
      usageStatus: 'SHARED',
      purchaseDate: '2023-11-19',
      warrantyUntil: '2026-11-19',
      notes: '3-qavat PoE IP-telefonlar va Wi-Fi nuqtalarini ta’minlaydi.',
      updatedAt: '2026-10-15T10:10:00.000Z',
    },
    {
      id: 'eq-1010',
      inventoryNumber: 'INV-2026-010',
      name: 'Canon i-SENSYS LBP236dw',
      serialNumber: 'CN-236DW-1904',
      typeId: 'type-printer',
      roomId: 'room-101',
      responsibleUserId: 'u-resp-2',
      status: 'ACTIVE',
      usageStatus: 'SHARED',
      purchaseDate: '2025-05-11',
      warrantyUntil: '2027-05-11',
      notes: 'Qabulxona hujjatlarini tezkor chop etish uchun.',
      updatedAt: '2026-11-03T15:45:00.000Z',
    },
    {
      id: 'eq-1011',
      inventoryNumber: 'INV-2026-011',
      name: 'Dell Latitude 5440',
      serialNumber: 'DL-5440-9012M',
      typeId: 'type-laptop',
      roomId: 'room-001',
      responsibleUserId: 'u-resp-1',
      status: 'RESERVE',
      usageStatus: 'IDLE',
      purchaseDate: '2025-08-22',
      warrantyUntil: '2028-08-22',
      notes: 'Xizmat safarlari va vaqtinchalik almashtirish uchun zaxirada.',
      updatedAt: '2026-11-11T09:30:00.000Z',
    },
    {
      id: 'eq-1012',
      inventoryNumber: 'INV-2026-012',
      name: 'HP Compaq Elite 8300 (Eski)',
      serialNumber: 'CZC248910W',
      typeId: 'type-desktop',
      roomId: 'room-001',
      responsibleUserId: 'u-admin',
      status: 'WRITTEN_OFF',
      usageStatus: 'IDLE',
      purchaseDate: '2019-03-04',
      warrantyUntil: '2022-03-04',
      notes: 'Ma’naviy eskirgani sababli komissiya qarori bilan hisobdan chiqarilgan.',
      updatedAt: '2026-09-20T17:00:00.000Z',
    },
  ];

  const history: EquipmentHistoryItem[] = [
    {
      id: 'hist-1',
      equipmentId: 'eq-1004',
      actorId: 'u-resp-1',
      actorName: 'Nurmuhammad Tursunov',
      action: 'Ta’mirga jo‘natildi',
      changes: 'Holat: Faol → Ta’mirda · Ijrochi: TechnoService Toshkent',
      createdAt: '2026-11-15T11:15:00.000Z',
    },
    {
      id: 'hist-2',
      equipmentId: 'eq-1003',
      actorId: 'u-resp-2',
      actorName: 'Sanobar Alimova',
      action: 'Ta’mirga jo‘natildi',
      changes: 'Holat: Faol → Ta’mirda · Sabab: Qog‘oz tortish mexanizmi nosozligi',
      createdAt: '2026-11-14T08:40:00.000Z',
    },
    {
      id: 'hist-3',
      equipmentId: 'eq-1001',
      actorId: 'u-admin',
      actorName: 'G‘olibjon Karimov',
      action: 'Ma’lumot yangilandi',
      changes: 'Xona: 001 → 304-xona · Mas’ul: Nurmuhammad Tursunov',
      createdAt: '2026-11-12T10:20:00.000Z',
    },
    {
      id: 'hist-4',
      equipmentId: 'eq-1006',
      actorId: 'u-resp-1',
      actorName: 'Nurmuhammad Tursunov',
      action: 'Ta’mirdan qaytarildi',
      changes: 'Holat: Ta’mirda → Faol · Xarajat: 450 000 so‘m',
      createdAt: '2026-10-28T16:30:00.000Z',
    },
    {
      id: 'hist-5',
      equipmentId: 'eq-1012',
      actorId: 'u-admin',
      actorName: 'G‘olibjon Karimov',
      action: 'Hisobdan chiqarildi',
      changes: 'Holat: Zaxirada → Hisobdan chiqarilgan',
      createdAt: '2026-09-20T17:00:00.000Z',
    },
  ];

  const repairs: RepairRecord[] = [
    {
      id: 'rep-201',
      equipmentId: 'eq-1004',
      equipmentName: 'Lenovo ThinkPad T14 Gen 4',
      inventoryNumber: 'INV-2026-004',
      sentById: 'u-resp-1',
      sentByName: 'Nurmuhammad Tursunov',
      vendorOrTechnician: 'TechnoService Toshkent',
      issueDescription: 'Batareya 20 daqiqada o‘chib qolmoqda va USB-C port qizib ketmoqda.',
      status: 'OPEN',
      sentAt: '2026-11-15T11:15:00.000Z',
    },
    {
      id: 'rep-202',
      equipmentId: 'eq-1003',
      equipmentName: 'HP LaserJet Pro MFP M428fdw',
      inventoryNumber: 'INV-2026-003',
      sentById: 'u-resp-2',
      sentByName: 'Sanobar Alimova',
      vendorOrTechnician: 'PrintMaster Servis',
      issueDescription: 'Qog‘oz tortish roligi yeyilgan va skaner qopqog‘i bo‘shashgan.',
      status: 'OPEN',
      sentAt: '2026-11-14T08:40:00.000Z',
    },
    {
      id: 'rep-203',
      equipmentId: 'eq-1006',
      equipmentName: 'Epson EB-L630U Lazer Proyektor',
      inventoryNumber: 'INV-2026-006',
      sentById: 'u-resp-1',
      sentByName: 'Nurmuhammad Tursunov',
      vendorOrTechnician: 'AV Pro Servis Markazi',
      issueDescription: 'Optik filtrni changdan tozalash va rang kalibrlash.',
      status: 'COMPLETED',
      sentAt: '2026-10-22T09:00:00.000Z',
      returnedAt: '2026-10-28T16:30:00.000Z',
      resolutionNotes: 'Filtr almashtirildi, optika tozalandi, to‘liq sinovdan o‘tdi.',
      cost: 450000,
    },
    {
      id: 'rep-204',
      equipmentId: 'eq-1010',
      equipmentName: 'Canon i-SENSYS LBP236dw',
      inventoryNumber: 'INV-2026-010',
      sentById: 'u-resp-2',
      sentByName: 'Sanobar Alimova',
      vendorOrTechnician: 'PrintMaster Servis',
      issueDescription: 'Pechka (fuser) plyonkasini almashtirish va profilaktika.',
      status: 'COMPLETED',
      sentAt: '2026-09-10T10:00:00.000Z',
      returnedAt: '2026-09-12T15:20:00.000Z',
      resolutionNotes: 'Yangi termo-plyonka o‘rnatildi, chop etish sifati tiklandi.',
      cost: 320000,
    },
  ];

  return { users, types, rooms, equipment, history, repairs };
}

class InventoryStore {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
  }

  private load(): DatabaseState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw) as DatabaseState;
        if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.equipment)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Ombor faylini o‘qishda xatolik, boshlang‘ich ma’lumotlar yaratilmoqda:', err);
    }
    const seed = createInitialSeed();
    this.saveState(seed);
    return seed;
  }

  private saveState(stateToSave: DatabaseState): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(stateToSave, null, 2), 'utf8');
    } catch (err) {
      console.error('Ombor faylini saqlashda xatolik:', err);
    }
  }

  save(): void {
    this.saveState(this.state);
  }

  get data(): DatabaseState {
    return this.state;
  }

  sanitizeUser(u: StoredUser): User {
    const { passwordHash: _ignored, ...safe } = u;
    return safe;
  }

  hydrateEquipment(eq: Equipment): Equipment {
    const type = this.state.types.find((t) => t.id === eq.typeId);
    const room = this.state.rooms.find((r) => r.id === eq.roomId);
    const resp = this.state.users.find((u) => u.id === eq.responsibleUserId);
    return {
      ...eq,
      typeName: type?.name ?? 'Noma’lum tur',
      roomLabel: room ? `${room.code}-xona · ${room.name}` : 'Noma’lum xona',
      responsibleName: resp?.fullName ?? 'Biriktirilmagan',
    };
  }

  visibleEquipmentForUser(user: User): Equipment[] {
    const list =
      user.role === 'RESPONSIBLE'
        ? this.state.equipment.filter((e) => e.responsibleUserId === user.id)
        : this.state.equipment;
    return list.map((e) => this.hydrateEquipment(e));
  }

  addHistory(entry: Omit<EquipmentHistoryItem, 'id' | 'createdAt'>): EquipmentHistoryItem {
    const item: EquipmentHistoryItem = {
      ...entry,
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.state.history.unshift(item);
    return item;
  }

  validateStatus(value: string): value is EquipmentStatus {
    return ['ACTIVE', 'IN_REPAIR', 'RESERVE', 'WRITTEN_OFF'].includes(value);
  }

  validateUsage(value: string): value is UsageStatus {
    return ['IN_USE', 'IDLE', 'SHARED'].includes(value);
  }
}

export const store = new InventoryStore();
