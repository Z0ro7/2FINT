const MAP = {
  'En attente': { cls: 'badge-pending' },
  'Validée': { cls: 'badge-approved' },
  'Refusée': { cls: 'badge-rejected' },
  'Annulée': { cls: 'badge-cancelled' }
};

export default function StatusBadge({ status }) {
  const conf = MAP[status] || { cls: 'badge-cancelled' };
  return <span className={`badge ${conf.cls}`}>{status}</span>;
}
