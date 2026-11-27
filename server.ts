import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  STATUS_LABELS,
  USAGE_LABELS,
  type Equipment,
  type EquipmentStatus,
  type RepairRecord,
  type UsageStatus,
  type User,
  type UserRole,
} from './src/types/inventory.ts';
import { generateInventoryChatReply } from './server/gemini.ts';
import { firestoreService } from './server/firestore.ts';
import { hashPassword, signJwt, store, verifyJwt, verifyPassword } from './server/store.ts';

interface AuthenticatedRequest extends Request {
  user?: User;
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Avtorizatsiya talab qilinadi. Qaytadan kiring.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyJwt(token);
  if (!payload) {
    res.status(401).json({ message: 'Sessiya muddati tugagan yoki token yaroqsiz.' });
    return;
  }
  const found = store.data.users.find((u) => u.id === payload.sub);
  if (!found || !found.active) {
    res.status(401).json({ message: 'Foydalanuvchi faol emas yoki topilmadi.' });
    return;
  }
  req.user = store.sanitizeUser(found);
  next();
}

function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Bu amal uchun ruxsatingiz yetarli emas.' });
      return;
    }
    next();
  };
}

function csvEscape(value: string | number | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export let app: express.Express;

async function startServer() {
  await store.init();
  app = express();
  app.use(express.json({ limit: '1mb' }));

  // --- AUTH ---
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ message: 'Email va parolni kiriting.' });
      return;
    }
    const found = store.data.users.find(
      (u) => u.email.toLowerCase() === String(email).trim().toLowerCase()
    );
    if (!found || !verifyPassword(String(password), found.passwordHash)) {
      res.status(401).json({ message: 'Email yoki parol noto‘g‘ri.' });
      return;
    }
    if (!found.active) {
      res.status(403).json({ message: 'Hisobingiz faol emas. Administratorga murojaat qiling.' });
      return;
    }
    const token = signJwt(found.id, found.role);
    res.json({
      token,
      user: store.sanitizeUser(found),
    });
  });

  app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.user });
  });

  // --- REFERENCES ---
  app.get('/api/references', authMiddleware, (_req: AuthenticatedRequest, res: Response) => {
    const responsibles = store.data.users
      .filter((u) => u.active && (u.role === 'RESPONSIBLE' || u.role === 'ADMIN'))
      .map((u) => ({
        id: u.id,
        fullName: u.fullName,
        department: u.department,
        role: u.role,
      }));
    res.json({
      types: store.data.types,
      rooms: store.data.rooms,
      responsibles,
    });
  });

  // --- DASHBOARD ---
  app.get('/api/dashboard', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const items = store.visibleEquipmentForUser(user);
    const statuses: EquipmentStatus[] = ['ACTIVE', 'IN_REPAIR', 'RESERVE', 'WRITTEN_OFF'];
    const usages: UsageStatus[] = ['IN_USE', 'IDLE', 'SHARED'];

    const statusBreakdown = statuses.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: items.filter((e) => e.status === status).length,
    }));

    const usageBreakdown = usages.map((usage) => ({
      usage,
      label: USAGE_LABELS[usage],
      count: items.filter((e) => e.usageStatus === usage).length,
    }));

    const typeBreakdown = store.data.types
      .map((t) => ({
        typeId: t.id,
        name: t.name,
        count: items.filter((e) => e.typeId === t.id).length,
      }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count);

    const visibleIds = new Set(items.map((e) => e.id));
    const recentHistory = store.data.history
      .filter((h) => visibleIds.has(h.equipmentId))
      .slice(0, 8)
      .map((h) => {
        const eq = store.data.equipment.find((e) => e.id === h.equipmentId);
        return {
          ...h,
          equipmentName: eq?.name ?? 'Noma’lum jihoz',
          inventoryNumber: eq?.inventoryNumber ?? '—',
        };
      });

    const openRepairs = store.data.repairs.filter(
      (r) => r.status === 'OPEN' && visibleIds.has(r.equipmentId)
    );

    res.json({
      totalCount: items.length,
      activeCount: items.filter((e) => e.status === 'ACTIVE').length,
      inRepairCount: items.filter((e) => e.status === 'IN_REPAIR').length,
      reserveCount: items.filter((e) => e.status === 'RESERVE').length,
      writtenOffCount: items.filter((e) => e.status === 'WRITTEN_OFF').length,
      statusBreakdown,
      usageBreakdown,
      typeBreakdown,
      recentHistory,
      openRepairs,
    });
  });

  // --- EQUIPMENT ---
  app.get('/api/equipment', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const status = String(req.query.status ?? '').trim();
    const roomId = String(req.query.roomId ?? '').trim();
    const typeId = String(req.query.typeId ?? '').trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 8));

    let items = store.visibleEquipmentForUser(user);

    if (q) {
      items = items.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.inventoryNumber.toLowerCase().includes(q) ||
          e.serialNumber.toLowerCase().includes(q) ||
          (e.responsibleName ?? '').toLowerCase().includes(q)
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
      totalPages,
    });
  });

  app.get('/api/equipment/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const eq = store.data.equipment.find((e) => e.id === req.params.id);
    if (!eq) {
      res.status(404).json({ message: 'Jihoz topilmadi.' });
      return;
    }
    if (user.role === 'RESPONSIBLE' && eq.responsibleUserId !== user.id) {
      res.status(403).json({ message: 'Siz faqat o‘zingizga biriktirilgan jihozlarni ko‘ra olasiz.' });
      return;
    }
    const history = store.data.history.filter((h) => h.equipmentId === eq.id);
    const repairs = store.data.repairs.filter((r) => r.equipmentId === eq.id);
    res.json({
      equipment: store.hydrateEquipment(eq),
      history,
      repairs,
    });
  });

  app.post(
    '/api/equipment',
    authMiddleware,
    requireRole('ADMIN'),
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.user!;
      const body = req.body ?? {};
      const name = String(body.name ?? '').trim();
      const inventoryNumber = String(body.inventoryNumber ?? '').trim();
      const serialNumber = String(body.serialNumber ?? '').trim();
      const typeId = String(body.typeId ?? '').trim();
      const roomId = String(body.roomId ?? '').trim();
      const responsibleUserId = String(body.responsibleUserId ?? '').trim();
      const status = String(body.status ?? 'ACTIVE');
      const usageStatus = String(body.usageStatus ?? 'IN_USE');

      if (!name || !inventoryNumber || !typeId || !roomId || !responsibleUserId) {
        res.status(400).json({ message: 'Majburiy maydonlar to‘ldirilishi shart.' });
        return;
      }
      if (!store.validateStatus(status) || !store.validateUsage(usageStatus)) {
        res.status(400).json({ message: 'Holat yoki foydalanish qiymati noto‘g‘ri.' });
        return;
      }
      if (
        store.data.equipment.some(
          (e) => e.inventoryNumber.toLowerCase() === inventoryNumber.toLowerCase()
        )
      ) {
        res.status(409).json({ message: 'Bu inventar raqami allaqachon mavjud.' });
        return;
      }

      const newEquipment: Equipment = {
        id: `eq-${Date.now()}`,
        inventoryNumber,
        name,
        serialNumber: serialNumber || '—',
        typeId,
        roomId,
        responsibleUserId,
        status,
        usageStatus,
        purchaseDate: String(body.purchaseDate || new Date().toISOString().slice(0, 10)),
        warrantyUntil: String(body.warrantyUntil || '2028-12-31'),
        notes: String(body.notes ?? '').trim(),
        updatedAt: new Date().toISOString(),
      };

      store.data.equipment.unshift(newEquipment);
      store.addHistory({
        equipmentId: newEquipment.id,
        actorId: user.id,
        actorName: user.fullName,
        action: 'Yangi jihoz qo‘shildi',
        changes: `Inventar: ${inventoryNumber} · Holat: ${STATUS_LABELS[status]}`,
      });
      store.save();
      void firestoreService.saveEquipment(newEquipment);

      res.status(201).json({ equipment: store.hydrateEquipment(newEquipment) });
    }
  );

  app.put(
    '/api/equipment/:id',
    authMiddleware,
    requireRole('ADMIN', 'RESPONSIBLE'),
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.user!;
      const idx = store.data.equipment.findIndex((e) => e.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ message: 'Jihoz topilmadi.' });
        return;
      }
      const current = store.data.equipment[idx];
      if (user.role === 'RESPONSIBLE' && current.responsibleUserId !== user.id) {
        res.status(403).json({
          message: 'Siz faqat o‘zingizga biriktirilgan jihozlarni tahrirlashingiz mumkin.',
        });
        return;
      }

      const body = req.body ?? {};
      const nextStatus = body.status !== undefined ? String(body.status) : current.status;
      const nextUsage =
        body.usageStatus !== undefined ? String(body.usageStatus) : current.usageStatus;

      if (!store.validateStatus(nextStatus) || !store.validateUsage(nextUsage)) {
        res.status(400).json({ message: 'Holat yoki foydalanish qiymati noto‘g‘ri.' });
        return;
      }

      const diffs: string[] = [];
      if (nextStatus !== current.status) {
        diffs.push(`Holat: ${STATUS_LABELS[current.status]} → ${STATUS_LABELS[nextStatus]}`);
      }
      if (nextUsage !== current.usageStatus) {
        diffs.push(
          `Foydalanish: ${USAGE_LABELS[current.usageStatus]} → ${USAGE_LABELS[nextUsage]}`
        );
      }
      const nextNotes = body.notes !== undefined ? String(body.notes).trim() : current.notes;
      if (nextNotes !== current.notes) {
        diffs.push('Izoh yangilandi');
      }

      let updated: Equipment;
      if (user.role === 'RESPONSIBLE') {
        // RESPONSIBLE may only update status, usageStatus, and notes
        updated = {
          ...current,
          status: nextStatus,
          usageStatus: nextUsage,
          notes: nextNotes,
          updatedAt: new Date().toISOString(),
        };
      } else {
        const nextName = body.name !== undefined ? String(body.name).trim() : current.name;
        const nextInv =
          body.inventoryNumber !== undefined
            ? String(body.inventoryNumber).trim()
            : current.inventoryNumber;
        if (!nextName || !nextInv) {
          res.status(400).json({ message: 'Nomi va inventar raqami bo‘sh bo‘lmasligi kerak.' });
          return;
        }
        if (nextName !== current.name) diffs.push(`Nomi: ${current.name} → ${nextName}`);
        if (body.roomId && body.roomId !== current.roomId) diffs.push('Xona o‘zgartirildi');
        if (body.responsibleUserId && body.responsibleUserId !== current.responsibleUserId) {
          diffs.push('Mas’ul shaxs almashtirildi');
        }
        updated = {
          ...current,
          name: nextName,
          inventoryNumber: nextInv,
          serialNumber:
            body.serialNumber !== undefined
              ? String(body.serialNumber).trim()
              : current.serialNumber,
          typeId: body.typeId ? String(body.typeId) : current.typeId,
          roomId: body.roomId ? String(body.roomId) : current.roomId,
          responsibleUserId: body.responsibleUserId
            ? String(body.responsibleUserId)
            : current.responsibleUserId,
          status: nextStatus,
          usageStatus: nextUsage,
          purchaseDate: body.purchaseDate ? String(body.purchaseDate) : current.purchaseDate,
          warrantyUntil: body.warrantyUntil ? String(body.warrantyUntil) : current.warrantyUntil,
          notes: nextNotes,
          updatedAt: new Date().toISOString(),
        };
      }

      store.data.equipment[idx] = updated;
      store.addHistory({
        equipmentId: updated.id,
        actorId: user.id,
        actorName: user.fullName,
        action: 'Jihoz ma’lumotlari yangilandi',
        changes: diffs.length > 0 ? diffs.join(' · ') : 'Saqlash tasdiqlandi',
      });
      store.save();
      void firestoreService.saveEquipment(updated);

      res.json({ equipment: store.hydrateEquipment(updated) });
    }
  );

  app.delete(
    '/api/equipment/:id',
    authMiddleware,
    requireRole('ADMIN'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = store.data.equipment.findIndex((e) => e.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ message: 'Jihoz topilmadi.' });
        return;
      }
      store.data.equipment.splice(idx, 1);
      store.save();
      void firestoreService.deleteEquipment(req.params.id);
      res.json({ ok: true });
    }
  );

  // --- REPAIRS ---
  app.get('/api/repairs', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const statusFilter = String(req.query.status ?? '').trim();
    const visibleIds = new Set(store.visibleEquipmentForUser(user).map((e) => e.id));

    let repairs = store.data.repairs.filter((r) => visibleIds.has(r.equipmentId));
    if (statusFilter === 'OPEN' || statusFilter === 'COMPLETED') {
      repairs = repairs.filter((r) => r.status === statusFilter);
    }
    repairs.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    res.json({ repairs });
  });

  app.post(
    '/api/repairs/dispatch',
    authMiddleware,
    requireRole('ADMIN', 'RESPONSIBLE'),
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.user!;
      const { equipmentId, vendorOrTechnician, issueDescription } = req.body ?? {};
      const eqIdx = store.data.equipment.findIndex((e) => e.id === equipmentId);
      if (eqIdx === -1) {
        res.status(404).json({ message: 'Jihoz topilmadi.' });
        return;
      }
      const eq = store.data.equipment[eqIdx];
      if (user.role === 'RESPONSIBLE' && eq.responsibleUserId !== user.id) {
        res.status(403).json({
          message: 'Faqat o‘zingizga biriktirilgan jihozni ta’mirga yubora olasiz.',
        });
        return;
      }
      if (eq.status === 'IN_REPAIR') {
        res.status(409).json({ message: 'Bu jihoz allaqachon ta’mirda.' });
        return;
      }
      if (!vendorOrTechnician || !issueDescription) {
        res.status(400).json({ message: 'Ustaxona/ijrochi va nosozlik tavsifini kiriting.' });
        return;
      }

      const prevStatus = eq.status;
      store.data.equipment[eqIdx] = {
        ...eq,
        status: 'IN_REPAIR',
        updatedAt: new Date().toISOString(),
      };

      const record: RepairRecord = {
        id: `rep-${Date.now()}`,
        equipmentId: eq.id,
        equipmentName: eq.name,
        inventoryNumber: eq.inventoryNumber,
        sentById: user.id,
        sentByName: user.fullName,
        vendorOrTechnician: String(vendorOrTechnician).trim(),
        issueDescription: String(issueDescription).trim(),
        status: 'OPEN',
        sentAt: new Date().toISOString(),
      };

      store.data.repairs.unshift(record);
      store.addHistory({
        equipmentId: eq.id,
        actorId: user.id,
        actorName: user.fullName,
        action: 'Ta’mirga jo‘natildi',
        changes: `Holat: ${STATUS_LABELS[prevStatus]} → Ta’mirda · Ijrochi: ${record.vendorOrTechnician}`,
      });
      store.save();
      void firestoreService.saveRepair(record);
      void firestoreService.saveEquipment(store.data.equipment[eqIdx]);

      res.status(201).json({ repair: record });
    }
  );

  app.post(
    '/api/repairs/:id/return',
    authMiddleware,
    requireRole('ADMIN', 'RESPONSIBLE'),
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.user!;
      const repIdx = store.data.repairs.findIndex((r) => r.id === req.params.id);
      if (repIdx === -1) {
        res.status(404).json({ message: 'Ta’mir yozuvi topilmadi.' });
        return;
      }
      const repair = store.data.repairs[repIdx];
      if (repair.status === 'COMPLETED') {
        res.status(409).json({ message: 'Bu ta’mir allaqachon yakunlangan.' });
        return;
      }
      const eqIdx = store.data.equipment.findIndex((e) => e.id === repair.equipmentId);
      if (eqIdx === -1) {
        res.status(404).json({ message: 'Bog‘langan jihoz topilmadi.' });
        return;
      }
      const eq = store.data.equipment[eqIdx];
      if (user.role === 'RESPONSIBLE' && eq.responsibleUserId !== user.id) {
        res.status(403).json({
          message: 'Faqat o‘zingizga biriktirilgan jihozni ta’mirdan qaytara olasiz.',
        });
        return;
      }

      const { targetStatus, resolutionNotes, cost } = req.body ?? {};
      const nextStatus: EquipmentStatus =
        targetStatus === 'RESERVE' || targetStatus === 'WRITTEN_OFF' ? targetStatus : 'ACTIVE';
      const parsedCost = cost !== undefined && cost !== '' ? Math.max(0, Number(cost) || 0) : 0;
      const notes = String(resolutionNotes ?? 'Ta’mir muvaffaqiyatli yakunlandi.').trim();

      store.data.repairs[repIdx] = {
        ...repair,
        status: 'COMPLETED',
        returnedAt: new Date().toISOString(),
        resolutionNotes: notes,
        cost: parsedCost,
      };
      store.data.equipment[eqIdx] = {
        ...eq,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };

      store.addHistory({
        equipmentId: eq.id,
        actorId: user.id,
        actorName: user.fullName,
        action: 'Ta’mirdan qaytarildi',
        changes: `Holat: Ta’mirda → ${STATUS_LABELS[nextStatus]} · Xarajat: ${parsedCost.toLocaleString('ru-RU')} so‘m`,
      });
      store.save();
      void firestoreService.saveRepair(store.data.repairs[repIdx]);
      void firestoreService.saveEquipment(store.data.equipment[eqIdx]);

      res.json({ repair: store.data.repairs[repIdx] });
    }
  );

  // --- REPORTS ---
  app.get('/api/reports/summary', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const items = store.visibleEquipmentForUser(user);
    const totalEquipment = items.length || 1;
    const statuses: EquipmentStatus[] = ['ACTIVE', 'IN_REPAIR', 'RESERVE', 'WRITTEN_OFF'];

    const byStatus = statuses.map((status) => {
      const count = items.filter((e) => e.status === status).length;
      return {
        status,
        label: STATUS_LABELS[status],
        count,
        share: Math.round((count / totalEquipment) * 100),
      };
    });

    const byType = store.data.types.map((t) => {
      const matched = items.filter((e) => e.typeId === t.id);
      return {
        typeId: t.id,
        name: t.name,
        count: matched.length,
        activeCount: matched.filter((e) => e.status === 'ACTIVE').length,
        inRepairCount: matched.filter((e) => e.status === 'IN_REPAIR').length,
      };
    });

    const byRoom = store.data.rooms.map((r) => {
      const matched = items.filter((e) => e.roomId === r.id);
      return {
        roomId: r.id,
        code: r.code,
        name: r.name,
        count: matched.length,
        activeCount: matched.filter((e) => e.status === 'ACTIVE').length,
        inRepairCount: matched.filter((e) => e.status === 'IN_REPAIR').length,
      };
    });

    const visibleIds = new Set(items.map((e) => e.id));
    const repairs = store.data.repairs.filter((r) => visibleIds.has(r.equipmentId));
    const totalRepairCost = repairs.reduce((sum, r) => sum + (r.cost || 0), 0);
    const openRepairsCount = repairs.filter((r) => r.status === 'OPEN').length;

    res.json({
      generatedAt: new Date().toISOString(),
      totalEquipment: items.length,
      totalRepairCost,
      openRepairsCount,
      byStatus,
      byType,
      byRoom,
    });
  });

  app.get(
    '/api/reports/export/csv',
    authMiddleware,
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.user!;
      const items = store.visibleEquipmentForUser(user);
      const headers = [
        'Inventar raqami',
        'Jihoz nomi',
        'Seriya raqami',
        'Turi',
        'Xona',
        'Masul shaxs',
        'Holati',
        'Foydalanish',
        'Xarid sanasi',
        'Kafolat muddati',
        'Izoh',
      ];
      const rows = items.map((e) =>
        [
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
          e.notes,
        ]
          .map(csvEscape)
          .join(',')
      );

      // UTF-8 BOM ensures Excel opens Uzbek characters cleanly
      const csvContent = '\uFEFF' + [headers.map(csvEscape).join(','), ...rows].join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="inventrack-hisobot-${new Date().toISOString().slice(0, 10)}.csv"`
      );
      res.send(csvContent);
    }
  );

  // --- ADMIN: USERS ---
  app.get(
    '/api/admin/users',
    authMiddleware,
    requireRole('ADMIN'),
    (_req: AuthenticatedRequest, res: Response) => {
      res.json({ users: store.data.users.map((u) => store.sanitizeUser(u)) });
    }
  );

  app.post(
    '/api/admin/users',
    authMiddleware,
    requireRole('ADMIN'),
    (req: AuthenticatedRequest, res: Response) => {
      const { fullName, email, password, role, department } = req.body ?? {};
      if (!fullName || !email || !password || !role) {
        res.status(400).json({ message: 'Barcha majburiy maydonlarni to‘ldiring.' });
        return;
      }
      if (!['ADMIN', 'RESPONSIBLE', 'EMPLOYEE'].includes(role)) {
        res.status(400).json({ message: 'Rol qiymati noto‘g‘ri.' });
        return;
      }
      if (
        store.data.users.some(
          (u) => u.email.toLowerCase() === String(email).trim().toLowerCase()
        )
      ) {
        res.status(409).json({ message: 'Bu email bilan foydalanuvchi allaqachon mavjud.' });
        return;
      }

      const newUser = {
        id: `u-${Date.now()}`,
        fullName: String(fullName).trim(),
        email: String(email).trim().toLowerCase(),
        passwordHash: hashPassword(String(password)),
        role: role as UserRole,
        department: String(department ?? 'Umumiy bo‘lim').trim(),
        active: true,
        createdAt: new Date().toISOString(),
      };
      store.data.users.push(newUser);
      store.save();
      void firestoreService.saveUser(newUser);
      res.status(201).json({ user: store.sanitizeUser(newUser) });
    }
  );

  app.patch(
    '/api/admin/users/:id',
    authMiddleware,
    requireRole('ADMIN'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = store.data.users.findIndex((u) => u.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ message: 'Foydalanuvchi topilmadi.' });
        return;
      }
      const current = store.data.users[idx];
      const { role, active, department, fullName } = req.body ?? {};
      if (role !== undefined && !['ADMIN', 'RESPONSIBLE', 'EMPLOYEE'].includes(role)) {
        res.status(400).json({ message: 'Rol qiymati noto‘g‘ri.' });
        return;
      }
      store.data.users[idx] = {
        ...current,
        fullName: fullName !== undefined ? String(fullName).trim() : current.fullName,
        department: department !== undefined ? String(department).trim() : current.department,
        role: role !== undefined ? (role as UserRole) : current.role,
        active: active !== undefined ? Boolean(active) : current.active,
      };
      store.save();
      void firestoreService.saveUser(store.data.users[idx]);
      res.json({ user: store.sanitizeUser(store.data.users[idx]) });
    }
  );

  // --- ADMIN: REFERENCES ---
  app.post(
    '/api/admin/references/types',
    authMiddleware,
    requireRole('ADMIN'),
    (req: AuthenticatedRequest, res: Response) => {
      const name = String(req.body?.name ?? '').trim();
      if (!name) {
        res.status(400).json({ message: 'Tur nomini kiriting.' });
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
    '/api/admin/references/types/:id',
    authMiddleware,
    requireRole('ADMIN'),
    (req: AuthenticatedRequest, res: Response) => {
      if (store.data.equipment.some((e) => e.typeId === req.params.id)) {
        res.status(409).json({
          message: 'Ushbu turga biriktirilgan jihozlar borligi sababli o‘chirib bo‘lmaydi.',
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
    '/api/admin/references/rooms',
    authMiddleware,
    requireRole('ADMIN'),
    (req: AuthenticatedRequest, res: Response) => {
      const code = String(req.body?.code ?? '').trim();
      const name = String(req.body?.name ?? '').trim();
      const floor = String(req.body?.floor ?? '1-qavat').trim();
      if (!code || !name) {
        res.status(400).json({ message: 'Xona kodi va nomini kiriting.' });
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
    '/api/admin/references/rooms/:id',
    authMiddleware,
    requireRole('ADMIN'),
    (req: AuthenticatedRequest, res: Response) => {
      if (store.data.equipment.some((e) => e.roomId === req.params.id)) {
        res.status(409).json({
          message: 'Ushbu xonada jihozlar mavjudligi sababli o‘chirib bo‘lmaydi.',
        });
        return;
      }
      store.data.rooms = store.data.rooms.filter((r) => r.id !== req.params.id);
      store.save();
      void firestoreService.deleteRoom(req.params.id);
      res.json({ ok: true });
    }
  );

  // --- ADMIN: FIRESTORE STATUS & SYNC ---
  app.get(
    '/api/admin/firestore/status',
    authMiddleware,
    requireRole('ADMIN'),
    (_req: AuthenticatedRequest, res: Response) => {
      res.json(firestoreService.getStatus());
    }
  );

  app.post(
    '/api/admin/firestore/sync',
    authMiddleware,
    requireRole('ADMIN'),
    async (_req: AuthenticatedRequest, res: Response) => {
      if (!firestoreService.isConnected) {
        res.status(400).json({
          message:
            'Firestore ulanmagan. Iltimos, avval .env faylida Firebase kalitlarini sozlang.',
          status: firestoreService.getStatus(),
        });
        return;
      }
      try {
        const result = await firestoreService.seedData(store.data);
        res.json({
          message: 'Barcha ma’lumotlar Firestore-ga muvaffaqiyatli sinxronlashtirildi.',
          result,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ message: `Sinxronlashda xatolik: ${errMsg}` });
      }
    }
  );

  // --- AI CHAT ---
  app.post('/api/ai/chat', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { message, history } = req.body ?? {};
    if (!message || !String(message).trim()) {
      res.status(400).json({ message: 'Xabar matni bo‘sh bo‘lmasligi kerak.' });
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
      const errMsg = err instanceof Error ? err.message : 'AI xizmatida xatolik yuz berdi.';
      console.error('Gemini AI chat error:', err);
      res.status(502).json({ message: errMsg });
    }
  });

  // --- VITE DEV / PROD STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build fayllari topilmadi.');
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '127.0.0.1';
  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  if (!process.env.VERCEL) {
    app.listen(port, host, () => {
      console.log(`InvenTrack server running at http://${displayHost}:${port}`);
    });
  }
}

export const serverReady = startServer().catch((err) => {
  console.error('Server start failed:', err);
  if (!process.env.VERCEL) process.exit(1);
  throw err;
});
