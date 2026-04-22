import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI, learningAPI, olympiadsAPI } from '../../api/courseService';
import { useAuth } from '../../context/AuthContext';
import './profile.css';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** @param {'all' | 'best' | 'last'} mode */
function buildOlympiadDisplayList(rows, mode) {
  if (!rows.length) return [];
  if (mode === 'all') {
    return [...rows].sort(
      (a, b) => new Date(b.submittedAtUtc).getTime() - new Date(a.submittedAtUtc).getTime(),
    );
  }

  const rowsActive = rows.filter((r) => !r.isVoided);
  const groups = new Map();
  for (const row of rowsActive) {
    const key = row.olympiadId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const out = [];
  for (const attempts of groups.values()) {
    if (mode === 'best') {
      let best = attempts[0];
      for (const a of attempts) {
        const sp = a.scorePercent || 0;
        const bsp = best.scorePercent || 0;
        if (sp > bsp) best = a;
        else if (sp === bsp && new Date(a.submittedAtUtc) > new Date(best.submittedAtUtc)) best = a;
      }
      out.push({ ...best, attemptCount: attempts.length });
    } else {
      let last = attempts[0];
      for (const a of attempts) {
        if (new Date(a.submittedAtUtc) > new Date(last.submittedAtUtc)) last = a;
      }
      out.push({ ...last, attemptCount: attempts.length });
    }
  }

  return out.sort(
    (a, b) => new Date(b.submittedAtUtc).getTime() - new Date(a.submittedAtUtc).getTime(),
  );
}

function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(user || null);
  const [myCourses, setMyCourses] = useState([]);
  const [olympiadResults, setOlympiadResults] = useState([]);
  const [olympiadView, setOlympiadView] = useState('all');
  const [courseSort, setCourseSort] = useState('progress_desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [meRes, coursesRes, olympRes] = await Promise.all([
          authAPI.getCurrentUser(),
          learningAPI.getMyLearning(),
          olympiadsAPI.getMyResults(),
        ]);

        if (meRes?.success && meRes?.data) {
          setProfile(meRes.data);
        }

        setMyCourses(Array.isArray(coursesRes?.data) ? coursesRes.data : []);
        setOlympiadResults(Array.isArray(olympRes?.data) ? olympRes.data : []);
      } catch (e) {
        setError(e?.message || 'Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const completedCourses = useMemo(
    () => myCourses.filter((item) => item.progress === 100).length,
    [myCourses],
  );

  const avgProgress = useMemo(() => {
    if (!myCourses.length) return 0;
    const sum = myCourses.reduce((acc, item) => acc + (item.progress || 0), 0);
    return Math.round(sum / myCourses.length);
  }, [myCourses]);

  const bestOlympiadScore = useMemo(() => {
    const active = olympiadResults.filter((r) => !r.isVoided);
    if (!active.length) return 0;
    return Math.max(
      ...active.map((item) => (item.ratingScore != null ? item.ratingScore : item.scorePercent) || 0),
    );
  }, [olympiadResults]);

  const displayedOlympiadRows = useMemo(
    () => buildOlympiadDisplayList(olympiadResults, olympiadView),
    [olympiadResults, olympiadView],
  );

  const sortedCourses = useMemo(() => {
    const list = [...myCourses];
    switch (courseSort) {
      case 'progress_desc':
        return list.sort((a, b) => (b.progress || 0) - (a.progress || 0));
      case 'progress_asc':
        return list.sort((a, b) => (a.progress || 0) - (b.progress || 0));
      case 'title_asc':
        return list.sort((a, b) =>
          String(a.title || '').localeCompare(String(b.title || ''), 'ru', { sensitivity: 'base' }),
        );
      case 'last_accessed_desc':
      default:
        return list.sort((a, b) =>
          String(b.lastAccessed || '').localeCompare(String(a.lastAccessed || ''), 'ru'),
        );
    }
  }, [myCourses, courseSort]);

  if (loading) {
    return (
      <div style={styles.stateContainer}>
        <p style={styles.stateText}>Загрузка профиля...</p>
      </div>
    );
  }

  return (
    <div className="profile-page" style={styles.page}>
      <div className="profile-inner" style={styles.container}>
        <h1 className="profile-title" style={styles.title}>
          Профиль
        </h1>
        <p style={styles.subtitle}>Личные данные, результаты и ваш доступ к обучению.</p>

        {error ? <div style={styles.error}>{error}</div> : null}

        <section style={styles.card}>
          <div style={styles.profileTop}>
            <h2 style={styles.name}>{profile?.name || 'Пользователь'}</h2>
            <div style={styles.meta}>Email: {profile?.email || '—'}</div>
            <div style={styles.meta}>Роль: {profile?.role || '—'}</div>
          </div>
        </section>

        <section className="profile-stats-grid" style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{myCourses.length}</div>
            <div style={styles.statLabel}>Доступных курсов</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{completedCourses}</div>
            <div style={styles.statLabel}>Завершенных курсов</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{avgProgress}%</div>
            <div style={styles.statLabel}>Средний прогресс</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{bestOlympiadScore}%</div>
            <div style={styles.statLabel}>Лучший результат олимпиады</div>
          </div>
        </section>

        <section style={styles.card}>
          <div className="profile-section-head" style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Результаты олимпиад</h3>
            <Link to="/olympiads" className="profile-link-btn" style={styles.linkBtn}>
              К олимпиадам
            </Link>
          </div>
          {olympiadResults.length === 0 ? (
            <p style={styles.empty}>Вы еще не проходили олимпиады.</p>
          ) : (
            <>
              <div style={styles.filterRow}>
                <span style={styles.filterLabel}>Показать:</span>
                <div style={styles.segmentGroup} role="group" aria-label="Режим списка олимпиад">
                  {[
                    { id: 'all', label: 'Все попытки' },
                    { id: 'best', label: 'Лучший по каждой' },
                    { id: 'last', label: 'Последняя по каждой' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      style={{
                        ...styles.segmentBtn,
                        ...(olympiadView === opt.id ? styles.segmentBtnActive : {}),
                      }}
                      onClick={() => setOlympiadView(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={styles.list}>
                {displayedOlympiadRows.map((item) => (
                  <div key={item.id} className="profile-list-row" style={styles.listItem}>
                    <div>
                      <div style={styles.itemTitle}>
                        {item.olympiadTitle}
                        {item.isVoided ? (
                          <span style={styles.voidBadge}> аннулировано</span>
                        ) : null}
                      </div>
                      <div style={styles.itemMeta}>
                        {item.correctCount}/{item.totalQuestions} правильных · база {item.scorePercent}%
                        {item.bonusPoints !== 0 && item.bonusPoints != null
                          ? ` · бонус ${item.bonusPoints > 0 ? '+' : ''}${item.bonusPoints}`
                          : ''}
                      </div>
                      <div style={styles.itemMeta}>
                        Рейтинг: {(item.ratingScore ?? item.scorePercent) ?? '—'}% · сдано:{' '}
                        {formatDate(item.submittedAtUtc)}
                      </div>
                      {item.attemptCount > 1 && olympiadView !== 'all' ? (
                        <div style={styles.itemHint}>
                          Зачётных попыток по олимпиаде (без аннулированных): {item.attemptCount}
                        </div>
                      ) : null}
                    </div>
                    <div className="profile-badge" style={styles.badge}>
                      {item.ratingScore ?? item.scorePercent}%
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section style={styles.card}>
          <div className="profile-section-head" style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Доступные (купленные) курсы</h3>
            <Link to="/my-learning" className="profile-link-btn" style={styles.linkBtn}>
              Мое обучение
            </Link>
          </div>
          {myCourses.length === 0 ? (
            <p style={styles.empty}>У вас пока нет доступных курсов.</p>
          ) : (
            <>
              <div style={styles.filterRow}>
                <label style={styles.sortLabel} htmlFor="profile-course-sort">
                  Сортировка:
                </label>
                <select
                  id="profile-course-sort"
                  className="profile-select"
                  style={styles.select}
                  value={courseSort}
                  onChange={(e) => setCourseSort(e.target.value)}
                >
                  <option value="progress_desc">По прогрессу (сначала выше)</option>
                  <option value="progress_asc">По прогрессу (сначала ниже)</option>
                  <option value="last_accessed_desc">По последнему доступу</option>
                  <option value="title_asc">По названию (А–Я)</option>
                </select>
              </div>
              <div style={styles.list}>
              {sortedCourses.map((course) => (
                <div key={course.id} className="profile-list-row" style={styles.listItem}>
                  <div>
                    <div style={styles.itemTitle}>{course.title}</div>
                    <div style={styles.itemMeta}>Преподаватель: {course.instructor || '—'}</div>
                    <div style={styles.itemMeta}>Последний доступ: {course.lastAccessed || '—'}</div>
                  </div>
                  <div className="profile-progress" style={styles.progress}>
                    {course.progress || 0}%
                  </div>
                </div>
              ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: 'linear-gradient(160deg, #e8eef9 0%, #f0f4ff 45%, #e9ecf5 100%)',
  },
  container: {
    maxWidth: 980,
    width: '100%',
    margin: '0 auto',
    display: 'grid',
    gap: 16,
    minWidth: 0,
  },
  title: {
    margin: 0,
    color: '#1f2937',
  },
  subtitle: {
    margin: 0,
    color: '#6b7280',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: 18,
    boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
  },
  profileTop: {
    display: 'grid',
    gap: 8,
  },
  name: {
    margin: 0,
    fontSize: 24,
    color: '#0f2744',
  },
  meta: {
    color: '#4b5563',
    marginTop: 4,
  },
  statsGrid: {
    display: 'grid',
    gap: 12,
  },
  statCard: {
    background: '#fff',
    borderRadius: 14,
    padding: '16px 14px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 700,
    color: '#2b52b5',
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  filterLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: 600,
  },
  sortLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: 600,
    marginRight: 4,
  },
  segmentGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentBtn: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  segmentBtnActive: {
    borderColor: '#2b52b5',
    background: '#eef2ff',
    color: '#2b52b5',
  },
  select: {
    minWidth: 0,
    maxWidth: '100%',
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    fontSize: 13,
    color: '#1f2937',
    background: '#fff',
    cursor: 'pointer',
  },
  sectionTitle: {
    margin: 0,
    color: '#0f2744',
  },
  linkBtn: {
    textDecoration: 'none',
    color: '#2b52b5',
    fontWeight: 600,
  },
  empty: {
    margin: 0,
    color: '#6b7280',
  },
  list: {
    display: 'grid',
    gap: 10,
  },
  listItem: {
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  itemTitle: {
    color: '#1f2937',
    fontWeight: 600,
  },
  itemMeta: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 2,
  },
  itemHint: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  voidBadge: {
    color: '#b45309',
    fontWeight: 600,
    fontSize: 13,
  },
  badge: {
    minWidth: 64,
    textAlign: 'center',
    borderRadius: 999,
    padding: '6px 10px',
    background: '#eef2ff',
    color: '#2b52b5',
    fontWeight: 700,
  },
  progress: {
    minWidth: 64,
    textAlign: 'center',
    borderRadius: 999,
    padding: '6px 10px',
    background: '#ecfdf5',
    color: '#065f46',
    fontWeight: 700,
  },
  stateContainer: {
    minHeight: '60vh',
    display: 'grid',
    placeItems: 'center',
  },
  stateText: {
    color: '#6b7280',
  },
  error: {
    border: '1px solid #fecaca',
    background: '#fef2f2',
    color: '#b91c1c',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
  },
};

export default Profile;