import { AlertCircle, ArrowLeft, Info, Loader2, Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  STATUS_LABELS,
  USAGE_LABELS,
  type Equipment,
  type EquipmentStatus,
  type ReferencesResponse,
  type UsageStatus,
} from '../types/inventory';

export function EquipmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();

  const isResponsibleOnly = user?.role === 'RESPONSIBLE';

  const [refs, setRefs] = useState<ReferencesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inventoryNumber, setInventoryNumber] = useState('');
  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [typeId, setTypeId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>('ACTIVE');
  const [usageStatus, setUsageStatus] = useState<UsageStatus>('IN_USE');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [warrantyUntil, setWarrantyUntil] = useState('2028-12-31');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const refData = await api.get<ReferencesResponse>('/api/references');
        if (!active) return;
        setRefs(refData);

        if (isEdit && id) {
          const detail = await api.get<{ equipment: Equipment }>(`/api/equipment/${id}`);
          if (!active) return;
          const eq = detail.equipment;
          setInventoryNumber(eq.inventoryNumber);
          setName(eq.name);
          setSerialNumber(eq.serialNumber);
          setTypeId(eq.typeId);
          setRoomId(eq.roomId);
          setResponsibleUserId(eq.responsibleUserId);
          setStatus(eq.status);
          setUsageStatus(eq.usageStatus);
          setPurchaseDate(eq.purchaseDate);
          setWarrantyUntil(eq.warrantyUntil);
          setNotes(eq.notes);
        } else {
          setTypeId(refData.types[0]?.id ?? '');
          setRoomId(refData.rooms[0]?.id ?? '');
          setResponsibleUserId(refData.responsibles[0]?.id ?? '');
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Ma’lumotlarni yuklashda xatolik.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit && id) {
        const payload = isResponsibleOnly
          ? { status, usageStatus, notes }
          : {
              inventoryNumber,
              name,
              serialNumber,
              typeId,
              roomId,
              responsibleUserId,
              status,
              usageStatus,
              purchaseDate,
              warrantyUntil,
              notes,
            };
        await api.put<{ equipment: Equipment }>(`/api/equipment/${id}`, payload);
        navigate(`/equipment/${id}`, { replace: true });
      } else {
        const res = await api.post<{ equipment: Equipment }>('/api/equipment', {
          inventoryNumber,
          name,
          serialNumber,
          typeId,
          roomId,
          responsibleUserId,
          status,
          usageStatus,
          purchaseDate,
          warrantyUntil,
          notes,
        });
        navigate(`/equipment/${res.equipment.id}`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlashda xatolik yuz berdi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title={isEdit ? 'Jihozni tahrirlash' : 'Yangi jihoz qo‘shish'}>
      <div className="max-w-3xl space-y-6">
        <Link
          to={isEdit && id ? `/equipment/${id}` : '/equipment'}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Orqaga qaytish</span>
        </Link>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 h-80 animate-pulse" />
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-lg p-6 space-y-6"
          >
            {isResponsibleOnly && (
              <div className="p-3.5 rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-800 flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Mas’ul shaxs sifatida siz faqat jihozning <strong>holati</strong>,{' '}
                  <strong>foydalanish darajasi</strong> va <strong>izohini</strong> yangilashingiz mumkin.
                </span>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-md border border-red-200 bg-red-50 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="inventoryNumber" className="block text-sm font-medium text-slate-700">
                  Inventar raqami *
                </label>
                <input
                  id="inventoryNumber"
                  type="text"
                  required
                  disabled={isResponsibleOnly}
                  value={inventoryNumber}
                  onChange={(e) => setInventoryNumber(e.target.value)}
                  placeholder="INV-2026-015"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="serialNumber" className="block text-sm font-medium text-slate-700">
                  Seriya raqami
                </label>
                <input
                  id="serialNumber"
                  type="text"
                  disabled={isResponsibleOnly}
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="SN-123456"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                  Jihoz nomi va modeli *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  disabled={isResponsibleOnly}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: Dell Latitude 5540"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="typeId" className="block text-sm font-medium text-slate-700">
                  Jihoz turi *
                </label>
                <select
                  id="typeId"
                  required
                  disabled={isResponsibleOnly}
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {refs?.types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="roomId" className="block text-sm font-medium text-slate-700">
                  Xona / Joylashuv *
                </label>
                <select
                  id="roomId"
                  required
                  disabled={isResponsibleOnly}
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {refs?.rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code}-xona · {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="responsibleUserId" className="block text-sm font-medium text-slate-700">
                  Mas’ul shaxs *
                </label>
                <select
                  id="responsibleUserId"
                  required
                  disabled={isResponsibleOnly}
                  value={responsibleUserId}
                  onChange={(e) => setResponsibleUserId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {refs?.responsibles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName} ({r.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="status" className="block text-sm font-medium text-slate-700">
                  Texnik holati *
                </label>
                <select
                  id="status"
                  required
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {(Object.keys(STATUS_LABELS) as EquipmentStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {STATUS_LABELS[st]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="usageStatus" className="block text-sm font-medium text-slate-700">
                  Foydalanish holati *
                </label>
                <select
                  id="usageStatus"
                  required
                  value={usageStatus}
                  onChange={(e) => setUsageStatus(e.target.value as UsageStatus)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {(Object.keys(USAGE_LABELS) as UsageStatus[]).map((u) => (
                    <option key={u} value={u}>
                      {USAGE_LABELS[u]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="purchaseDate" className="block text-sm font-medium text-slate-700">
                  Xarid sanasi
                </label>
                <input
                  id="purchaseDate"
                  type="date"
                  disabled={isResponsibleOnly}
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="warrantyUntil" className="block text-sm font-medium text-slate-700">
                  Kafolat muddati
                </label>
                <input
                  id="warrantyUntil"
                  type="date"
                  disabled={isResponsibleOnly}
                  value={warrantyUntil}
                  onChange={(e) => setWarrantyUntil(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
                  Izoh
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Jihoz haqida qo‘shimcha ma’lumot yoki eslatma..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Link
                to={isEdit && id ? `/equipment/${id}` : '/equipment'}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md"
              >
                Bekor qilish
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isEdit ? 'Saqlash' : 'Qo‘shish'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
