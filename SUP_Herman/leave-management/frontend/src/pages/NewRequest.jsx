import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiErrorMessage } from '../api';
import { useToast } from '../context/ToastContext';
import { IconUpload } from '../components/Icons';

const TYPES = ['CP', 'RTT', 'Sans Solde', 'Maladie', 'Formation', 'Autre'];

function countBusinessDays(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export default function NewRequest() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [type, setType] = useState('CP');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comment, setComment] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const days = useMemo(() => countBusinessDays(startDate, endDate), [startDate, endDate]);
  const dateError = startDate && endDate && new Date(endDate) < new Date(startDate);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (dateError) { setError('La date de fin doit être postérieure ou égale à la date de début.'); return; }
    if (days <= 0) { setError('La période sélectionnée ne contient aucun jour ouvré.'); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      if (comment) formData.append('comment', comment);
      if (file) formData.append('justificatif', file);

      await api.post('/leaves', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      push('Votre demande de congés a été soumise avec succès.');
      navigate('/mes-demandes');
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible de créer la demande."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="type">Type de congé</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="grid grid-3" style={{ gap: 14 }}>
          <div className="field">
            <label htmlFor="start">Date de début</label>
            <input id="start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="end">Date de fin</label>
            <input id="end" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Jours ouvrés</label>
            <input value={days} disabled />
          </div>
        </div>

        <div className="field">
          <label htmlFor="comment">Commentaire (facultatif)</label>
          <textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Précisions utiles pour votre manager..." />
        </div>

        <div className="field">
          <label htmlFor="file">Justificatif (facultatif — PDF, JPG ou PNG, 5 Mo max)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label htmlFor="file" className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
              <IconUpload size={15} /> Choisir un fichier
            </label>
            <span className="muted-text">{file ? file.name : 'Aucun fichier sélectionné'}</span>
          </div>
          <input id="file" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files[0] || null)} />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Envoi...' : 'Soumettre la demande'}
        </button>
      </form>
    </div>
  );
}
