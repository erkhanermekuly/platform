import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resourcesAPI } from '../api/courseService';
import '../styles/pages.css';

const RESOURCE_META = {
  documents: {
    title: 'Нормативные документы',
    intro: 'Подборка ключевых документов и ориентиров для дошкольных педагогов.',
    loader: resourcesAPI.documents.list,
  },
  scenarios: {
    title: 'Сценарии мероприятий',
    intro: 'Готовые сценарии для праздников, тематических дней и развивающих активностей.',
    loader: resourcesAPI.scenarios.list,
  },
  materials: {
    title: 'Дополнительные материалы',
    intro: 'Шаблоны, методические материалы и полезные ресурсы для ежедневной практики.',
    loader: resourcesAPI.materials.list,
  },
};

export default function ResourceCategoryPage() {
  const pageSize = 8;
  const { kind } = useParams();
  const meta = useMemo(() => RESOURCE_META[kind] || null, [kind]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    if (!meta) {
      setLoading(false);
      setItems([]);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    setError(null);
    meta
      .loader()
      .then((res) => {
        if (cancelled) return;
        setItems(Array.isArray(res?.data) ? res.data : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Не удалось загрузить раздел');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [meta]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((item) => {
        if (filter === 'with_link') return Boolean(item.url);
        if (filter === 'without_link') return !item.url;
        return true;
      })
      .filter((item) => {
        if (!q) return true;
        return (
          String(item.title || '').toLowerCase().includes(q) ||
          String(item.description || '').toLowerCase().includes(q)
        );
      });
  }, [items, search, filter]);

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

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  }, [page, totalPages]);
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, filter, sortBy, kind]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (!meta) {
    return (
      <div className="resource-page">
        <h1>Раздел не найден</h1>
        <Link to="/home" className="btn btn-secondary">
          На главную
        </Link>
      </div>
    );
  }

  return (
    <div className="resource-page">
      <header className="resource-page-header">
        <h1>{meta.title}</h1>
        <p>{meta.intro}</p>
      </header>

      <div className="resource-toolbar">
        <input
          type="text"
          className="resource-search"
          placeholder="Поиск по названию и описанию…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="resource-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Все записи</option>
          <option value="with_link">Только со ссылкой</option>
          <option value="without_link">Без ссылки</option>
        </select>
        <select className="resource-filter" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
          <option value="az">По алфавиту (А-Я)</option>
          <option value="za">По алфавиту (Я-А)</option>
        </select>
      </div>

      {loading && <p className="loading">Загрузка…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <p className="resource-found-count">Найдено {sortedItems.length} записей</p>
      )}

      {!loading && !error && sortedItems.length === 0 && (
        <p className="resource-empty">Пока здесь нет записей. Администратор добавит их через админ-панель.</p>
      )}

      <div className="resource-list-grid">
        {pageItems.map((item) => (
          <article key={item.id} className="resource-list-card">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer" className="btn btn-secondary">
                Открыть источник
              </a>
            )}
          </article>
        ))}
      </div>

      {!loading && !error && sortedItems.length > pageSize && (
        <div className="resource-pagination">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage(1)}
            title="Первая страница"
          >
            {'<<'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Назад
          </button>
          <div className="resource-page-numbers" aria-label="Нумерация страниц">
            {pageNumbers.map((p, idx) =>
              p === '...' ? (
                <span key={`dots-${idx}`} className="resource-page-dots">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`resource-page-number ${p === page ? 'active' : ''}`}
                  onClick={() => setPage(Number(p))}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              )
            )}
          </div>
          <span className="resource-page-indicator">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Вперед
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage(totalPages)}
            title="Последняя страница"
          >
            {'>>'}
          </button>
        </div>
      )}
    </div>
  );
}
