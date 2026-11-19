import { AlertCircle, FileSpreadsheet, Printer } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../lib/api';
import type { ReportSummaryResponse } from '../types/inventory';

export function ReportsPage() {
  const [summary, setSummary] = useState<ReportSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ReportSummaryResponse>('/api/reports/summary');
      setSummary(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hisobotni yuklashda xatolik.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleDownloadCsv = async () => {
    setExportingCsv(true);
    setError(null);
    try {
      await api.downloadCsv(
        '/api/reports/export/csv',
        `inventrack-hisobot-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV yuklashda xatolik.');
    } finally {
      setExportingCsv(false);
    }
  };

  const actions = (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={() => void handleDownloadCsv()}
        disabled={exportingCsv || loading}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
      >
        <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
        <span>Excel (CSV)</span>
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
      >
        <Printer className="w-4 h-4" />
        <span>PDF / Chop etish</span>
      </button>
    </div>
  );

  return (
    <Layout title="Hisobotlar va eksport" action={actions}>
      <div className="space-y-6">
        {/* Print-only Header */}
        <div className="hidden print-only border-b border-slate-300 pb-4 mb-4">
          <h1 className="text-xl font-bold text-slate-900">InvenTrack — Inventarizatsiya hisoboti</h1>
          <p className="text-xs text-slate-600 mt-1 tabular-nums">
            Shakllantirilgan sana: {new Date().toLocaleDateString('uz-UZ')}
          </p>
        </div>

        {error && (
          <div className="bg-white border border-red-200 rounded-lg p-4 flex items-center gap-2 text-sm text-red-700 no-print">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-lg h-72 animate-pulse" />
        ) : summary ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print-break-avoid">
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <p className="text-xs font-medium text-slate-500">Reyestrdagi jami jihozlar</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
                  {summary.totalEquipment} ta
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <p className="text-xs font-medium text-slate-500">Jami ta’mir xarajatlari</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
                  {summary.totalRepairCost.toLocaleString('ru-RU')} so‘m
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <p className="text-xs font-medium text-slate-500">Ochiq ta’mir ishlari</p>
                <p className="mt-2 text-2xl font-semibold text-amber-700 tabular-nums">
                  {summary.openRepairsCount} ta
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By Status */}
              <section className="bg-white border border-slate-200 rounded-lg overflow-hidden print-break-avoid">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h2 className="text-sm font-semibold text-slate-900">Holatlar kesimi</h2>
                </div>
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2.5 px-5 font-medium">Holat</th>
                      <th className="py-2.5 px-5 font-medium text-right">Soni</th>
                      <th className="py-2.5 px-5 font-medium text-right">Ulushi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.byStatus.map((row) => (
                      <tr key={row.status}>
                        <td className="py-2.5 px-5 text-slate-800">{row.label}</td>
                        <td className="py-2.5 px-5 text-right font-medium tabular-nums">
                          {row.count}
                        </td>
                        <td className="py-2.5 px-5 text-right text-slate-500 tabular-nums">
                          {row.share}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* By Type */}
              <section className="bg-white border border-slate-200 rounded-lg overflow-hidden print-break-avoid">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h2 className="text-sm font-semibold text-slate-900">Jihoz turlari kesimi</h2>
                </div>
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2.5 px-5 font-medium">Tur</th>
                      <th className="py-2.5 px-5 font-medium text-right">Jami</th>
                      <th className="py-2.5 px-5 font-medium text-right">Faol</th>
                      <th className="py-2.5 px-5 font-medium text-right">Ta’mirda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.byType.map((row) => (
                      <tr key={row.typeId}>
                        <td className="py-2.5 px-5 text-slate-800">{row.name}</td>
                        <td className="py-2.5 px-5 text-right font-medium tabular-nums">
                          {row.count}
                        </td>
                        <td className="py-2.5 px-5 text-right text-emerald-700 tabular-nums">
                          {row.activeCount}
                        </td>
                        <td className="py-2.5 px-5 text-right text-amber-700 tabular-nums">
                          {row.inRepairCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>

            {/* By Room */}
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden print-break-avoid">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-900">Xonalar kesimi</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2.5 px-5 font-medium">Xona kodi</th>
                      <th className="py-2.5 px-5 font-medium">Bo‘lim / Joylashuv</th>
                      <th className="py-2.5 px-5 font-medium text-right">Jami</th>
                      <th className="py-2.5 px-5 font-medium text-right">Faol</th>
                      <th className="py-2.5 px-5 font-medium text-right">Ta’mirda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.byRoom.map((row) => (
                      <tr key={row.roomId}>
                        <td className="py-2.5 px-5 font-mono text-xs text-slate-600 tabular-nums">
                          {row.code}
                        </td>
                        <td className="py-2.5 px-5 text-slate-800">{row.name}</td>
                        <td className="py-2.5 px-5 text-right font-medium tabular-nums">
                          {row.count}
                        </td>
                        <td className="py-2.5 px-5 text-right text-emerald-700 tabular-nums">
                          {row.activeCount}
                        </td>
                        <td className="py-2.5 px-5 text-right text-amber-700 tabular-nums">
                          {row.inRepairCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
