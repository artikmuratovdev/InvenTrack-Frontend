import { AlertCircle, Check, Loader2, Plus, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { RepairStatusLabel } from '../components/StatusLabel';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type {
  Equipment,
  EquipmentStatus,
  PaginatedEquipmentResponse,
  RepairRecord,
} from '../types/inventory';

export function RepairsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManage = user?.role === 'ADMIN' || user?.role === 'RESPONSIBLE';

  const [tab, setTab] = useState<'ALL' | 'OPEN' | 'COMPLETED'>('ALL');
  const [repairs, setRepairs] = useState<RepairRecord[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dispatch modal state
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [selectedEqId, setSelectedEqId] = useState('');
  const [vendor, setVendor] = useState('');
  const [issue, setIssue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Return modal state
  const [returningRepair, setReturningRepair] = useState<RepairRecord | null>(null);
  const [targetStatus, setTargetStatus] = useState<EquipmentStatus>('ACTIVE');
  const [cost, setCost] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusQuery = tab === 'ALL' ? '' : `?status=${tab}`;
      const [repRes, eqRes] = await Promise.all([
        api.get<{ repairs: RepairRecord[] }>(`/api/repairs${statusQuery}`),
        canManage
          ? api.get<PaginatedEquipmentResponse>('/api/equipment?limit=50')
          : Promise.resolve({ items: [], total: 0, page: 1, limit: 50, totalPages: 1 }),
      ]);
      setRepairs(repRes.repairs);
      const dispatchable = eqRes.items.filter(
        (e) => e.status !== 'IN_REPAIR' && e.status !== 'WRITTEN_OFF'
      );
      setAvailableEquipment(dispatchable);

      const preselectId = searchParams.get('dispatch');
      if (preselectId && canManage && dispatchable.some((e) => e.id === preselectId)) {
        setSelectedEqId(preselectId);
        setDispatchOpen(true);
        setSearchParams({}, { replace: true });
      } else if (dispatchable[0] && !selectedEqId) {
        setSelectedEqId(dispatchable[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ta’mir ma’lumotlarini yuklashda xatolik.');
    } finally {
      setLoading(false);
    }
  }, [tab, canManage, searchParams, setSearchParams, selectedEqId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEqId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/api/repairs/dispatch', {
        equipmentId: selectedEqId,
        vendorOrTechnician: vendor,
        issueDescription: issue,
      });
      setDispatchOpen(false);
      setVendor('');
      setIssue('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ta’mirga yuborishda xatolik.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningRepair) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/repairs/${returningRepair.id}/return`, {
        targetStatus,
        cost: cost ? Number(cost) : 0,
        resolutionNotes,
      });
      setReturningRepair(null);
      setCost('');
      setResolutionNotes('');
      setTargetStatus('ACTIVE');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ta’mirdan qaytarishda xatolik.');
    } finally {
      setSubmitting(false);
    }
  };

  const openDispatchAction = canManage ? (
    <button
      type="button"
      onClick={() => setDispatchOpen(true)}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0"
    >
      <Plus className="w-4 h-4" />
      <span>Ta’mirga jo‘natish</span>
    </button>
  ) : undefined;

  return (
    <Layout title="Ta’mir jarayonlari" action={openDispatchAction}>
      <div className="space-y-5">
        {/* Filter Tabs */}
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {[
            { key: 'ALL', label: 'Barchasi' },
            { key: 'OPEN', label: 'Ta’mirda' },
            { key: 'COMPLETED', label: 'Yakunlangan' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key as typeof tab)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === item.key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-white border border-red-200 rounded-lg p-4 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-lg h-64 animate-pulse" />
        ) : repairs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
            <p className="text-base font-medium text-slate-900">Ta’mir yozuvlari topilmadi</p>
            <p className="text-sm text-slate-500">
              Ushbu filtr bo‘yicha hozircha ta’mirga yuborilgan jihozlar yo‘q.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {repairs.map((rep) => (
              <div
                key={rep.id}
                className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      to={`/equipment/${rep.equipmentId}`}
                      className="text-sm font-semibold text-slate-900 hover:text-blue-700"
                    >
                      {rep.equipmentName}
                    </Link>
                    <RepairStatusLabel status={rep.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    <span className="font-mono tabular-nums">{rep.inventoryNumber}</span>
                    <span aria-hidden="true"> · </span>
                    <span>Ijrochi: {rep.vendorOrTechnician}</span>
                    <span aria-hidden="true"> · </span>
                    <span>Mas’ul: {rep.sentByName}</span>
                  </p>
                  <p className="text-sm text-slate-700">{rep.issueDescription}</p>
                  {rep.resolutionNotes && (
                    <p className="text-xs text-emerald-700">
                      Natija: {rep.resolutionNotes}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 tabular-nums">
                    Jo‘natilgan: {rep.sentAt.slice(0, 10)}
                    {rep.returnedAt ? ` · Qaytarilgan: ${rep.returnedAt.slice(0, 10)}` : ''}
                    {typeof rep.cost === 'number' && rep.cost > 0
                      ? ` · Xarajat: ${rep.cost.toLocaleString('ru-RU')} so‘m`
                      : ''}
                  </p>
                </div>

                {canManage && rep.status === 'OPEN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setReturningRepair(rep);
                      setTargetStatus('ACTIVE');
                      setCost('');
                      setResolutionNotes('');
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Ta’mirdan qaytarish</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dispatch Modal */}
      {dispatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setDispatchOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Jihozni ta’mirga jo‘natish</h2>
              <button
                type="button"
                onClick={() => setDispatchOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {availableEquipment.length === 0 ? (
              <p className="text-sm text-slate-600">
                Hozirda ta’mirga yuborish uchun mos jihozlar mavjud emas.
              </p>
            ) : (
              <form onSubmit={handleDispatch} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Jihozni tanlang</label>
                  <select
                    required
                    value={selectedEqId}
                    onChange={(e) => setSelectedEqId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {availableEquipment.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.inventoryNumber} — {eq.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Servis markazi yoki usta *
                  </label>
                  <input
                    type="text"
                    required
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="Masalan: TechnoService Toshkent"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Nosozlik tavsifi *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    placeholder="Qanday muammo kuzatilmoqda?"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDispatchOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Jo‘natish</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returningRepair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setReturningRepair(null)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Ta’mirdan qaytarish</h2>
              <button
                type="button"
                onClick={() => setReturningRepair(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {returningRepair.inventoryNumber} · {returningRepair.equipmentName}
            </p>

            <form onSubmit={handleReturn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Qaytarish holati</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as EquipmentStatus)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="ACTIVE">Faol (ishga tayyor)</option>
                  <option value="RESERVE">Zaxirada</option>
                  <option value="WRITTEN_OFF">Hisobdan chiqarilgan (tuzatib bo‘lmadi)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Ta’mir xarajati (so‘m)
                </label>
                <input
                  type="number"
                  min={0}
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="Masalan: 350000"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Bajarilgan ishlar natijasi *
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Qaysi qism almashtirildi yoki tuzatildi?"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturningRepair(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Tasdiqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
