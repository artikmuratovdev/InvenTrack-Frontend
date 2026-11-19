import { AlertCircle, ArrowRight, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StatusDonutChart, UsageBarChart } from '../components/Charts';
import { Layout } from '../components/Layout';
import { RepairStatusLabel } from '../components/StatusLabel';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { DashboardSummary } from '../types/inventory';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<DashboardSummary>('/api/dashboard');
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ma’lumotlarni yuklashda xatolik.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const primaryAction =
    user?.role === 'ADMIN' ? (
      <Link
        to="/equipment/new"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0"
      >
        <Plus className="w-4 h-4" />
        <span>Jihoz qo‘shish</span>
      </Link>
    ) : undefined;

  return (
    <Layout title="Boshqaruv paneli" action={primaryAction}>
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg p-5 h-24 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6 h-64 animate-pulse" />
            <div className="bg-white border border-slate-200 rounded-lg p-6 h-64 animate-pulse" />
          </div>
        </div>
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-lg p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Qayta urinish</span>
          </button>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Jami jihozlar</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900 tabular-nums">
                {data.totalCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {user?.role === 'RESPONSIBLE' ? 'Sizga biriktirilgan' : 'Umumiy reyestr'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Faol ishlatilmoqda</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-700 tabular-nums">
                {data.activeCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">Ishchi holatda</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Ta’mirda</p>
              <p className="mt-2 text-3xl font-semibold text-amber-700 tabular-nums">
                {data.inRepairCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">Servis nazoratida</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Zaxira va boshqa</p>
              <p className="mt-2 text-3xl font-semibold text-slate-700 tabular-nums">
                {data.reserveCount + data.writtenOffCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Zaxirada: {data.reserveCount} · Chiqarilgan: {data.writtenOffCount}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Holat bo‘yicha taqsimot</h2>
                  <p className="text-xs text-slate-500">
                    Ro‘yxatni filtrlash uchun holat ustiga bosing
                  </p>
                </div>
              </div>
              <StatusDonutChart
                data={data.statusBreakdown}
                onSelectStatus={(status) => navigate(`/equipment?status=${status}`)}
              />
            </section>

            <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Foydalanish darajasi</h2>
                <p className="text-xs text-slate-500">
                  Jihozlarning bandlik va zaxira ko‘rsatkichlari
                </p>
              </div>
              <UsageBarChart data={data.usageBreakdown} />

              {data.typeBreakdown.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-2.5">
                    Asosiy jihoz turlari
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
                    {data.typeBreakdown.slice(0, 5).map((t) => (
                      <span key={t.typeId} className="tabular-nums">
                        {t.name}: <strong className="text-slate-900">{t.count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Open Repairs & Recent History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Ochiq ta’mirlar</h2>
                <Link
                  to="/repairs"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
                >
                  <span>Barchasi</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {data.openRepairs.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">
                  Hozirda ta’mirda turgan jihoz yo‘q.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.openRepairs.map((rep) => (
                    <div key={rep.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          to={`/equipment/${rep.equipmentId}`}
                          className="text-sm font-medium text-slate-900 hover:text-blue-700 truncate"
                        >
                          {rep.equipmentName}
                        </Link>
                        <RepairStatusLabel status={rep.status} />
                      </div>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono tabular-nums">{rep.inventoryNumber}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{rep.vendorOrTechnician}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="tabular-nums">{rep.sentAt.slice(0, 10)}</span>
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-1">{rep.issueDescription}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">So‘nggi o‘zgarishlar</h2>
                <Link
                  to="/equipment"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
                >
                  <span>Jihozlar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {data.recentHistory.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">
                  Hozircha harakatlar tarixi bo‘sh.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.recentHistory.map((item) => (
                    <div key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          to={`/equipment/${item.equipmentId}`}
                          className="text-sm font-medium text-slate-900 hover:text-blue-700 truncate"
                        >
                          {item.equipmentName}
                        </Link>
                        <span className="text-xs text-slate-500 tabular-nums shrink-0">
                          {item.createdAt.slice(0, 10)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        <span className="font-medium text-slate-700">{item.action}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{item.actorName}</span>
                      </p>
                      <p className="text-xs text-slate-500 truncate">{item.changes}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
