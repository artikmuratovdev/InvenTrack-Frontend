import {
  AlertCircle,
  ArrowLeft,
  Download,
  Pencil,
  Printer,
  Wrench,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { EquipmentStatusLabel, RepairStatusLabel } from '../components/StatusLabel';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  USAGE_LABELS,
  type Equipment,
  type EquipmentHistoryItem,
  type RepairRecord,
} from '../types/inventory';

interface EquipmentDetailPayload {
  equipment: Equipment;
  history: EquipmentHistoryItem[];
  repairs: RepairRecord[];
}

export function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qrContainerRef = useRef<HTMLDivElement | null>(null);

  const [data, setData] = useState<EquipmentDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<EquipmentDetailPayload>(`/api/equipment/${id}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Jihoz ma’lumotlarini yuklashda xatolik.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const downloadQrSvg = () => {
    const svg = qrContainerRef.current?.querySelector('svg');
    if (!svg || !data) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.equipment.inventoryNumber}-qr.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const canModify =
    data &&
    (user?.role === 'ADMIN' ||
      (user?.role === 'RESPONSIBLE' && data.equipment.responsibleUserId === user.id));

  const qrValue = data
    ? `${window.location.origin}/equipment/${data.equipment.id}`
    : '';

  return (
    <Layout
      title={data ? `${data.equipment.inventoryNumber} · Jihoz kartasi` : 'Jihoz kartasi'}
      action={
        canModify && data ? (
          <Link
            to={`/equipment/${data.equipment.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Pencil className="w-4 h-4" />
            <span>Tahrirlash</span>
          </Link>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <div className="no-print">
          <Link
            to="/equipment"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Jihozlar ro‘yxatiga qaytish</span>
          </Link>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 h-72 animate-pulse" />
        ) : error ? (
          <div className="bg-white border border-red-200 rounded-lg p-6 flex items-center gap-3 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Passport + History */}
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <p className="font-mono text-xs font-medium text-slate-500 tabular-nums">
                      {data.equipment.inventoryNumber} · S/N: {data.equipment.serialNumber}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                      {data.equipment.name}
                    </h2>
                  </div>
                  <EquipmentStatusLabel status={data.equipment.status} />
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Jihoz turi</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">{data.equipment.typeName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Joylashgan xona</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">{data.equipment.roomLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Mas’ul xodim</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">
                      {data.equipment.responsibleName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Foydalanish holati</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">
                      {USAGE_LABELS[data.equipment.usageStatus]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Xarid qilingan sana</dt>
                    <dd className="mt-0.5 font-mono text-xs text-slate-800 tabular-nums">
                      {data.equipment.purchaseDate}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Kafolat muddati</dt>
                    <dd className="mt-0.5 font-mono text-xs text-slate-800 tabular-nums">
                      {data.equipment.warrantyUntil}
                    </dd>
                  </div>
                </dl>

                {data.equipment.notes && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Izoh</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{data.equipment.notes}</p>
                  </div>
                )}

                {canModify && data.equipment.status !== 'IN_REPAIR' && (
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3 no-print">
                    <button
                      type="button"
                      onClick={() => navigate(`/repairs?dispatch=${data.equipment.id}`)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Ta’mirga jo‘natish</span>
                    </button>
                  </div>
                )}
              </section>

              {/* Change History */}
              <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 no-print">
                <h3 className="text-base font-semibold text-slate-900">O‘zgarishlar tarixi</h3>
                {data.history.length === 0 ? (
                  <p className="text-sm text-slate-500">Hozircha tarix yozuvlari mavjud emas.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.history.map((h) => (
                      <div key={h.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="font-medium text-slate-900">{h.action}</span>
                          <span className="text-xs font-mono text-slate-500 tabular-nums">
                            {h.createdAt.slice(0, 16).replace('T', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{h.changes}</p>
                        <p className="text-xs text-slate-500">Bajaruvchi: {h.actorName}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Repair History for this item */}
              <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 no-print">
                <h3 className="text-base font-semibold text-slate-900">Ta’mir tarixi</h3>
                {data.repairs.length === 0 ? (
                  <p className="text-sm text-slate-500">Bu jihoz hali ta’mirga yuborilmagan.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.repairs.map((r) => (
                      <div key={r.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {r.vendorOrTechnician}
                          </span>
                          <RepairStatusLabel status={r.status} />
                        </div>
                        <p className="text-xs text-slate-600">{r.issueDescription}</p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          Yuborilgan: {r.sentAt.slice(0, 10)}
                          {r.returnedAt ? ` · Qaytarilgan: ${r.returnedAt.slice(0, 10)}` : ''}
                          {typeof r.cost === 'number' && r.cost > 0
                            ? ` · Xarajat: ${r.cost.toLocaleString('ru-RU')} so‘m`
                            : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Right Column: QR Sticker Card */}
            <aside className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 print-break-avoid">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Inventar QR kodi</h3>
                  <p className="text-xs text-slate-500">
                    Jihoz korpusiga yopishtirish va tezkor skanerlash uchun
                  </p>
                </div>

                <div
                  ref={qrContainerRef}
                  className="bg-slate-50 border border-slate-200 rounded-md p-5 flex flex-col items-center gap-3"
                >
                  <QRCodeSVG
                    value={qrValue}
                    size={168}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                  />
                  <div className="text-center">
                    <p className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {data.equipment.inventoryNumber}
                    </p>
                    <p className="text-xs text-slate-500 truncate max-w-[180px]">
                      {data.equipment.name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 no-print">
                  <button
                    type="button"
                    onClick={downloadQrSvg}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>SVG yuklash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Chop etish</span>
                  </button>
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
