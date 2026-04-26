import { useEffect, useMemo, useState } from 'react';
import { resourcesAPI } from '../api/courseService';
import '../styles/pages.css';

const PAGE_SIZE = 8;

export default function ConsultationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      resourcesAPI.consultations
        .list()
        .then((res) => {
          if (!cancelled) setItems(Array.isArray(res?.data) ? res.data : []);
        })
        .catch((e) => {
          if (!cancelled) setError(e?.message || 'Не удалось загрузить консультации');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!q) return true;
      return (
        String(item.title || '').toLowerCase().includes(q) ||
        String(item.description || '').toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    if (sortBy === 'az') {
      return list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ru'));
    }
    if (sortBy === 'za') {
      return list.sort((a, b) => String(b.title || '').localeCompare(String(a.title || ''), 'ru'));
    }
    if (sortBy === 'oldest') {
      return list.sort(
        (a, b) => new Date(a.createdAtUtc || 0).getTime() - new Date(b.createdAtUtc || 0).getTime()
      );
    }
    return list.sort(
      (a, b) => new Date(b.createdAtUtc || 0).getTime() - new Date(a.createdAtUtc || 0).getTime()
    );
  }, [filteredItems, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedItems.slice(start, start + PAGE_SIZE);
  }, [sortedItems, page]);

  useEffect(() => {
    queueMicrotask(() => {
      setPage(1);
    });
  }, [search, sortBy]);

  useEffect(() => {
    queueMicrotask(() => {
      if (page > totalPages) setPage(totalPages);
    });
  }, [page, totalPages]);

  return (
    <div className="resource-page">
      <header className="resource-page-header">
        <h1>Консультации</h1>
        <p>Экспертные разборы, рекомендации и ответы на практические вопросы педагогов.</p>
      </header>

      <div className="resource-toolbar">
        <input
          type="text"
          className="resource-search"
          placeholder="Поиск по названию и описанию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="resource-filter" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
          <option value="az">По алфавиту (А-Я)</option>
          <option value="za">По алфавиту (Я-А)</option>
        </select>
      </div>

      {loading && <p className="loading">Загрузка...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && <p className="resource-found-count">Найдено {sortedItems.length} записей</p>}

      {!loading && !error && sortedItems.length === 0 && (
        <p className="resource-empty">Пока нет консультаций. Администратор добавит их через админ-панель.</p>
      )}

      <div className="resource-list-grid">
        {pageItems.map((item) => (
          <article key={item.id} className="resource-list-card">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noreferrer" className="btn btn-secondary">
                Открыть источник
              </a>
            ) : null}
          </article>
        ))}
      </div>

      {!loading && !error && sortedItems.length > PAGE_SIZE && (
        <div className="resource-pagination">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Назад
          </button>
          <span className="resource-page-indicator">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}
