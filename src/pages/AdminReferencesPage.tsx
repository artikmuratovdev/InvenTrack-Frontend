import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../lib/api';
import type { ReferencesResponse } from '../types/inventory';

export function AdminReferencesPage() {
  const [refs, setRefs] = useState<ReferencesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTypeName, setNewTypeName] = useState('');
  const [newRoomCode, setNewRoomCode] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState('1-qavat');

  const loadRefs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ReferencesResponse>('/api/references');
      setRefs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ma’lumotnomalarni yuklashda xatolik.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRefs();
  }, [loadRefs]);

  const addType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    setError(null);
    try {
      await api.post('/api/admin/references/types', { name: newTypeName.trim() });
      setNewTypeName('');
      await loadRefs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tur qo‘shishda xatolik.');
    }
  };

  const deleteType = async (id: string) => {
    setError(null);
    try {
      await api.delete(`/api/admin/references/types/${id}`);
      await loadRefs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'O‘chirishda xatolik.');
    }
  };

  const addRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomCode.trim() || !newRoomName.trim()) return;
    setError(null);
    try {
      await api.post('/api/admin/references/rooms', {
        code: newRoomCode.trim(),
        name: newRoomName.trim(),
        floor: newRoomFloor.trim() || '1-qavat',
      });
      setNewRoomCode('');
      setNewRoomName('');
      await loadRefs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xona qo‘shishda xatolik.');
    }
  };

  const deleteRoom = async (id: string) => {
    setError(null);
    try {
      await api.delete(`/api/admin/references/rooms/${id}`);
      await loadRefs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xonani o‘chirishda xatolik.');
    }
  };

  return (
    <Layout title="Ma’lumotnomalar">
      <div className="space-y-6">
        {error && (
          <div className="bg-white border border-red-200 rounded-lg p-4 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-lg h-64 animate-pulse" />
            <div className="bg-white border border-slate-200 rounded-lg h-64 animate-pulse" />
          </div>
        ) : refs ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Equipment Types */}
            <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Jihoz turlari</h2>
                <p className="text-xs text-slate-500">
                  Katalog va filtrlarda ishlatiladigan jihoz toifalari
                </p>
              </div>

              <form onSubmit={addType} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Yangi tur nomi (masalan: Skaner)"
                  className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Qo‘shish</span>
                </button>
              </form>

              <ul className="divide-y divide-slate-100">
                {refs.types.map((t) => (
                  <li key={t.id} className="py-2.5 flex items-center justify-between text-sm">
                    <span className="text-slate-800 font-medium">{t.name}</span>
                    <button
                      type="button"
                      onClick={() => void deleteType(t.id)}
                      className="p-1.5 text-slate-400 hover:text-red-700 rounded-md"
                      title="O‘chirish"
                      aria-label={`${t.name} turini o‘chirish`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Rooms */}
            <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Xonalar va bo‘limlar</h2>
                <p className="text-xs text-slate-500">
                  Jihozlar biriktiriladigan xizmat xonalari ro‘yxati
                </p>
              </div>

              <form onSubmit={addRoom} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  value={newRoomCode}
                  onChange={(e) => setNewRoomCode(e.target.value)}
                  placeholder="Kod (305)"
                  className="px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Xona nomi"
                  className="px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(e.target.value)}
                    placeholder="Qavat"
                    className="w-full min-w-0 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md shrink-0"
                    title="Xona qo‘shish"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </form>

              <ul className="divide-y divide-slate-100">
                {refs.rooms.map((r) => (
                  <li key={r.id} className="py-2.5 flex items-center justify-between text-sm gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-semibold text-slate-700 mr-2 tabular-nums">
                        {r.code}
                      </span>
                      <span className="text-slate-800 font-medium">{r.name}</span>
                      <span className="text-xs text-slate-500 ml-2">· {r.floor}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteRoom(r.id)}
                      className="p-1.5 text-slate-400 hover:text-red-700 rounded-md shrink-0"
                      title="O‘chirish"
                      aria-label={`${r.name} xonasini o‘chirish`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
