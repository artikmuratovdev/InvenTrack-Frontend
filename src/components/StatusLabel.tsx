import { AlertTriangle, Archive, CheckCircle2, Wrench, XCircle } from 'lucide-react';
import {
  REPAIR_STATUS_LABELS,
  STATUS_LABELS,
  type EquipmentStatus,
  type RepairStatus,
} from '../types/inventory';

export function EquipmentStatusLabel({ status }: { status: EquipmentStatus }) {
  const config: Record<
    EquipmentStatus,
    { text: string; icon: typeof CheckCircle2; classes: string }
  > = {
    ACTIVE: {
      text: STATUS_LABELS.ACTIVE,
      icon: CheckCircle2,
      classes: 'text-emerald-700',
    },
    IN_REPAIR: {
      text: STATUS_LABELS.IN_REPAIR,
      icon: Wrench,
      classes: 'text-amber-700',
    },
    RESERVE: {
      text: STATUS_LABELS.RESERVE,
      icon: Archive,
      classes: 'text-slate-600',
    },
    WRITTEN_OFF: {
      text: STATUS_LABELS.WRITTEN_OFF,
      icon: XCircle,
      classes: 'text-red-700',
    },
  };

  const item = config[status];
  const Icon = item.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${item.classes}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{item.text}</span>
    </span>
  );
}

export function RepairStatusLabel({ status }: { status: RepairStatus }) {
  if (status === 'OPEN') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{REPAIR_STATUS_LABELS.OPEN}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{REPAIR_STATUS_LABELS.COMPLETED}</span>
    </span>
  );
}
