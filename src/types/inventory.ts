export type UserRole = 'ADMIN' | 'RESPONSIBLE' | 'EMPLOYEE';

export type EquipmentStatus = 'ACTIVE' | 'IN_REPAIR' | 'RESERVE' | 'WRITTEN_OFF';

export type UsageStatus = 'IN_USE' | 'IDLE' | 'SHARED';

export type RepairStatus = 'OPEN' | 'COMPLETED';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: string;
  active: boolean;
  createdAt: string;
}

export interface EquipmentTypeRef {
  id: string;
  name: string;
}

export interface RoomRef {
  id: string;
  code: string;
  name: string;
  floor: string;
}

export interface Equipment {
  id: string;
  inventoryNumber: string;
  name: string;
  serialNumber: string;
  typeId: string;
  roomId: string;
  responsibleUserId: string;
  status: EquipmentStatus;
  usageStatus: UsageStatus;
  purchaseDate: string;
  warrantyUntil: string;
  notes: string;
  updatedAt: string;
  // Hydrated read fields returned by API
  typeName?: string;
  roomLabel?: string;
  responsibleName?: string;
}

export interface EquipmentHistoryItem {
  id: string;
  equipmentId: string;
  actorId: string;
  actorName: string;
  action: string;
  changes: string;
  createdAt: string;
}

export interface RepairRecord {
  id: string;
  equipmentId: string;
  equipmentName: string;
  inventoryNumber: string;
  sentById: string;
  sentByName: string;
  vendorOrTechnician: string;
  issueDescription: string;
  status: RepairStatus;
  sentAt: string;
  returnedAt?: string;
  resolutionNotes?: string;
  cost?: number;
}

export interface DashboardSummary {
  totalCount: number;
  activeCount: number;
  inRepairCount: number;
  reserveCount: number;
  writtenOffCount: number;
  statusBreakdown: Array<{ status: EquipmentStatus; label: string; count: number }>;
  usageBreakdown: Array<{ usage: UsageStatus; label: string; count: number }>;
  typeBreakdown: Array<{ typeId: string; name: string; count: number }>;
  recentHistory: Array<EquipmentHistoryItem & { equipmentName: string; inventoryNumber: string }>;
  openRepairs: RepairRecord[];
}

export interface PaginatedEquipmentResponse {
  items: Equipment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReferencesResponse {
  types: EquipmentTypeRef[];
  rooms: RoomRef[];
  responsibles: Array<{ id: string; fullName: string; department: string; role: UserRole }>;
}

export interface ReportSummaryResponse {
  generatedAt: string;
  totalEquipment: number;
  totalRepairCost: number;
  openRepairsCount: number;
  byStatus: Array<{ status: EquipmentStatus; label: string; count: number; share: number }>;
  byType: Array<{ typeId: string; name: string; count: number; activeCount: number; inRepairCount: number }>;
  byRoom: Array<{ roomId: string; code: string; name: string; count: number; activeCount: number; inRepairCount: number }>;
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  RESPONSIBLE: 'Mas’ul shaxs',
  EMPLOYEE: 'Xodim',
};

export const STATUS_LABELS: Record<EquipmentStatus, string> = {
  ACTIVE: 'Faol',
  IN_REPAIR: 'Ta’mirda',
  RESERVE: 'Zaxirada',
  WRITTEN_OFF: 'Hisobdan chiqarilgan',
};

export const USAGE_LABELS: Record<UsageStatus, string> = {
  IN_USE: 'Foydalanilmoqda',
  IDLE: 'Bo‘sh turibdi',
  SHARED: 'Umumiy foydalanishda',
};

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  OPEN: 'Ta’mirda',
  COMPLETED: 'Yakunlangan',
};
