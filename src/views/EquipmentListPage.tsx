import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { EquipmentStatusLabel } from '../components/StatusLabel';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  STATUS_LABELS,
  USAGE_LABELS,
  type Equipment,
  type EquipmentStatus,
  type PaginatedEquipmentResponse,
  type ReferencesResponse,
} from '../types/inventory';

export function EquipmentListPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [roomId, setRoomId] = useState(searchParams.get('roomId') ?? '');
  const [typeId, setTypeId] = useState(searchParams.get('typeId') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const [refs, setRefs] = useState<ReferencesResponse | null>(null);
  const [result, setResult] = useState<PaginatedEquipmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<ReferencesResponse>('/api/references')
      .then(setRefs)
      .catch(() => {});
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status) params.set('status', status);
    if (roomId) params.set('roomId', roomId);
    if (typeId) params.set('typeId', typeId);
    params.set('page', String(page));
    params.set('limit', '8');

    try {
      const data = await api.get<PaginatedEquipmentResponse>(
        `/api/equipment?${params.toString()}`
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Jihozlarni yuklashda xatolik.');
    } finally {
      setLoading(false);
    }
  }, [q, status, roomId, typeId, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const syncQueryParams = (next: {
    q?: string;
    status?: string;
    roomId?: string;
    typeId?: string;
    page?: number;
  }) => {
    const p = new URLSearchParams();
    const nq = next.q !== undefined ? next.q : q;
    const ns = next.status !== undefined ? next.status : status;
    const nr = next.roomId !== undefined ? next.roomId : roomId;
    const nt = next.typeId !== undefined ? next.typeId : typeId;
    const np = next.page !== undefined ? next.page : page;
    if (nq.trim()) p.set('q', nq.trim());
    if (ns) p.set('status', ns);
    if (nr) p.set('roomId', nr);
    if (nt) p.set('typeId', nt);
    if (np > 1) p.set('page', String(np));
    setSearchParams(p, { replace: true });
  };

  const resetFilters = () => {
    setQ('');
    setStatus('');
    setRoomId('');
    setTypeId('');
    setPage(1);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handleDelete = async (item: Equipment) => {
    setDeletingId(item.id);
    try {
      await api.delete(`/api/equipment/${item.id}`);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'O‘chirishda xatolik yuz berdi.');
    } finally {
      setDeletingId(null);
    }
  };

  const hasFilters = Boolean(q.trim() || status || roomId || typeId);

  const canEditItem = (item: Equipment) => {
    if (user?.role === 'ADMIN') return true;
    if (user?.role === 'RESPONSIBLE' && item.responsibleUserId === user.id) return true;
    return false;
  };

  const addAction =
    user?.role === 'ADMIN' ? (
      <Link
        to="/equipment/new"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0"
      >
        <Plus className="w-4 h-4" />
        <span>Yangi jihoz</span>
      </Link>
    ) : undefined;

  return (
    <Layout title="Jihozlar reyestri" action={addAction}>
      <div className="space-y-5">
        {/* Search & Filter Toolbar */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={q}
                onChange={(e) => {
                  const val = e.target.value;
                  setQ(val);
                  setPage(1);
                  syncQueryParams({ q: val, page: 1 });
                }}
                placeholder="Nomi, inventar yoki seriya..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <select
              value={status}
              onChange={(e) => {
                const val = e.target.value;
                setStatus(val);
                setPage(1);
                syncQueryParams({ status: val, page: 1 });
              }}
              aria-label="Holat bo‘yicha filtr"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="">Barcha holatlar</option>
              {(Object.keys(STATUS_LABELS) as EquipmentStatus[]).map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABELS[st]}
                </option>
              ))}
            </select>

            <select
              value={typeId}
              onChange={(e) => {
                const val = e.target.value;
                setTypeId(val);
                setPage(1);
                syncQueryParams({ typeId: val, page: 1 });
              }}
              aria-label="Tur bo‘yicha filtr"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="">Barcha turlar</option>
              {refs?.types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={roomId}
              onChange={(e) => {
                const val = e.target.value;
                setRoomId(val);
                setPage(1);
                syncQueryParams({ roomId: val, page: 1 });
              }}
              aria-label="Xona bo‘yicha filtr"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="">Barcha xonalar</option>
              {refs?.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code}-xona · {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="tabular-nums">
              {result ? `Topildi: ${result.total} ta jihoz` : 'Yuklanmoqda...'}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Filtrlarni tozalash</span>
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-white border border-red-200 rounded-lg p-4 flex items-center justify-between gap-3 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadList()}
              className="px-3 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 rounded-md"
            >
              Qayta urinish
            </button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 h-14 animate-pulse bg-slate-50/40" />
            ))}
          </div>
        ) : result && result.items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
            <p className="text-base font-medium text-slate-900">Jihozlar topilmadi</p>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {hasFilters
                ? 'Tanlangan qidiruv yoki filtr shartlariga mos keladigan jihoz mavjud emas.'
                : 'Hozircha reyestrda birorta jihoz kiritilmagan.'}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md"
              >
                Filtrlarni tozalash
              </button>
            ) : user?.role === 'ADMIN' ? (
              <Link
                to="/equipment/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
              >
                <Plus className="w-4 h-4" />
                <span>Birinchi jihozni qo‘shish</span>
              </Link>
            ) : null}
          </div>
        ) : result ? (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                      <th className="py-3 px-4">Inventar №</th>
                      <th className="py-3 px-4">Jihoz va turi</th>
                      <th className="py-3 px-4">Xona</th>
                      <th className="py-3 px-4">Mas’ul shaxs</th>
                      <th className="py-3 px-4">Holati</th>
                      <th className="py-3 px-4">Foydalanish</th>
                      <th className="py-3 px-4 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {result.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs font-medium text-slate-700 tabular-nums whitespace-nowrap">
                          <Link to={`/equipment/${item.id}`} className="hover:text-blue-700">
                            {item.inventoryNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            to={`/equipment/${item.id}`}
                            className="font-medium text-slate-900 hover:text-blue-700 block"
                          >
                            {item.name}
                          </Link>
                          <span className="text-xs text-slate-500">
                            {item.typeName} · {item.serialNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">{item.roomLabel}</td>
                        <td className="py-3 px-4 text-slate-700 text-xs whitespace-nowrap">
                          {item.responsibleName}
                        </td>
                        <td className="py-3 px-4">
                          <EquipmentStatusLabel status={item.status} />
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                          {USAGE_LABELS[item.usageStatus]}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <Link
                              to={`/equipment/${item.id}`}
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-md"
                              title="Kartani ko‘rish"
                              aria-label={`${item.name} kartasini ko‘rish`}
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            {canEditItem(item) && (
                              <Link
                                to={`/equipment/${item.id}/edit`}
                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-md"
                                title="Tahrirlash"
                                aria-label={`${item.name} ni tahrirlash`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Link>
                            )}
                            {user?.role === 'ADMIN' && (
                              <button
                                type="button"
                                disabled={deletingId === item.id}
                                onClick={() => void handleDelete(item)}
                                className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md disabled:opacity-40"
                                title="O‘chirish"
                                aria-label={`${item.name} ni o‘chirish`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {result.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-slate-500 tabular-nums">
                        {item.inventoryNumber}
                      </p>
                      <Link
                        to={`/equipment/${item.id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-blue-700 block truncate"
                      >
                        {item.name}
                      </Link>
                    </div>
                    <EquipmentStatusLabel status={item.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {item.typeName} · {item.roomLabel} · {item.responsibleName}
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-600">{USAGE_LABELS[item.usageStatus]}</span>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/equipment/${item.id}`}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md"
                      >
                        Ko‘rish
                      </Link>
                      {canEditItem(item) && (
                        <Link
                          to={`/equipment/${item.id}/edit`}
                          className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md"
                        >
                          Tahrirlash
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {result.totalPages > 1 && (
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm">
                <span className="text-xs text-slate-500 tabular-nums">
                  Sahifa {result.page} / {result.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={result.page <= 1}
                    onClick={() => {
                      const next = result.page - 1;
                      setPage(next);
                      syncQueryParams({ page: next });
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Oldingi</span>
                  </button>
                  <button
                    type="button"
                    disabled={result.page >= result.totalPages}
                    onClick={() => {
                      const next = result.page + 1;
                      setPage(next);
                      syncQueryParams({ page: next });
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40"
                  >
                    <span>Keyingi</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </Layout>
  );
}
