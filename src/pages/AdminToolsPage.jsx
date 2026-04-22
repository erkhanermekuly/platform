import { useEffect, useState } from 'react';
import { adminToolsAPI } from '../api/courseService';
import '../styles/pages.css';

export default function AdminToolsPage() {
  const [audit, setAudit] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminToolsAPI.getAuditRecent(150);
        if (!cancelled) setAudit(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Не удалось загрузить аудит');
      } finally {
        if (!cancelled) setLoadingAudit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async (label, fn) => {
    setError('');
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      setError(e?.message || 'Ошибка');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="admin-tools-page">
      <h1>Админ: экспорт и аудит</h1>
      <p className="admin-tools-lead">
        CSV в кодировке UTF-8 с BOM — удобно открывать в Excel. Аудит фиксирует изменяющие запросы администраторов к API
        (POST/PUT/PATCH/DELETE), кроме служебных путей.
      </p>

      {error ? <p className="admin-tools-error">{error}</p> : null}

      <div className="admin-tools-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!!busy}
          onClick={() => run('payments', () => adminToolsAPI.downloadPaymentsCsv())}
        >
          {busy === 'payments' ? '…' : 'Скачать платежи (CSV)'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!!busy}
          onClick={() => run('olympiads', () => adminToolsAPI.downloadOlympiadAttemptsCsv())}
        >
          {busy === 'olympiads' ? '…' : 'Скачать попытки олимпиад (CSV)'}
        </button>
      </div>

      <section className="admin-tools-audit">
        <h2>Последние записи аудита</h2>
        {loadingAudit ? (
          <p>Загрузка…</p>
        ) : audit.length === 0 ? (
          <p className="muted">Пока нет записей (или таблица только что создана).</p>
        ) : (
          <div className="admin-tools-table-wrap">
            <table className="admin-tools-table">
              <thead>
                <tr>
                  <th>Время (UTC)</th>
                  <th>Email</th>
                  <th>Метод</th>
                  <th>Путь</th>
                  <th>Код</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((row) => (
                  <tr key={row.id}>
                    <td>{row.createdAtUtc ? String(row.createdAtUtc).replace('T', ' ').slice(0, 19) : '—'}</td>
                    <td>{row.actorEmail}</td>
                    <td>{row.httpMethod}</td>
                    <td className="admin-tools-path">{row.path}</td>
                    <td>{row.statusCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
