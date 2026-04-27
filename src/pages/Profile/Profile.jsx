import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, learningAPI, olympiadsAPI, resourcesAPI } from '../../api/courseService';
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

const ADMIN_RESOURCE_TYPE_META = {
  documents: {
    title: 'Нормативные документы',
    subtitle: 'Публикуется на странице нормативных документов',
    createApi: resourcesAPI.documents.create,
    uploadAttachmentApi: resourcesAPI.documents.uploadAttachment,
  },
  materials: {
    title: 'Методические материалы',
    subtitle: 'Публикуется на странице методических материалов',
    createApi: resourcesAPI.materials.create,
    uploadAttachmentApi: resourcesAPI.materials.uploadAttachment,
  },
  consultations: {
    title: 'Консультации',
    subtitle: 'Публикуется в разделе консультаций',
    createApi: resourcesAPI.consultations.create,
    uploadAttachmentApi: null,
  },
};

function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(user || null);
  const [myCourses, setMyCourses] = useState([]);
  const [olympiadResults, setOlympiadResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState(null);
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [isResourceSubmitting, setIsResourceSubmitting] = useState(false);
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    url: '',
    file: null,
  });
  const [settingsDraft, setSettingsDraft] = useState({
    fullName: '',
    email: '',
    phone: '',
    emailNotifications: true,
    privacyMode: false,
    soundEffects: true,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [diplomas, setDiplomas] = useState([]);
  const [uploadingDiploma, setUploadingDiploma] = useState(false);
  const [deletingDiplomaId, setDeletingDiplomaId] = useState(null);
  const [diplomaPreview, setDiplomaPreview] = useState(null);

  const resolveDiplomaFileUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5240/api').replace(/\/$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    if (p.startsWith('/api/')) {
      const origin = apiBase.endsWith('/api')
        ? apiBase.slice(0, -4)
        : new URL(apiBase.includes('://') ? apiBase : `http://${apiBase}`).origin;
      return `${origin}${p}`;
    }
    return `${apiBase}${p}`;
  };

  const closeDiplomaPreview = useCallback(() => {
    setDiplomaPreview((prev) => {
      if (prev?.blobUrl) URL.revokeObjectURL(prev.blobUrl);
      return null;
    });
  }, []);

  const openDiplomaPreview = async (item) => {
    const url = resolveDiplomaFileUrl(item.fileUrl);
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Не удалось загрузить диплом');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setDiplomaPreview((prev) => {
        if (prev?.blobUrl) URL.revokeObjectURL(prev.blobUrl);
        return { blobUrl, title: item.fileName || 'Диплом' };
      });
    } catch (e) {
      alert(e?.message || 'Не удалось открыть диплом');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [meRes, coursesRes, olympRes, diplomaRes] = await Promise.all([
          authAPI.getCurrentUser(),
          learningAPI.getMyLearning(),
          olympiadsAPI.getMyResults(),
          authAPI.listMyDiplomas(),
        ]);

        if (meRes?.success && meRes?.data) {
          setProfile(meRes.data);
        }

        setMyCourses(Array.isArray(coursesRes?.data) ? coursesRes.data : []);
        setOlympiadResults(Array.isArray(olympRes?.data) ? olympRes.data : []);
        setDiplomas(Array.isArray(diplomaRes?.data) ? diplomaRes.data : []);
      } catch (e) {
        setError(e?.message || 'Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!diplomaPreview) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeDiplomaPreview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [diplomaPreview, closeDiplomaPreview]);

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
    () => buildOlympiadDisplayList(olympiadResults, 'best'),
    [olympiadResults],
  );

  const sortedCourses = useMemo(() => {
    const courseSort = 'progress_desc';
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
  }, [myCourses]);
  const isAdmin = (profile?.role || user?.role) === 'admin';
  const displayName = profile?.name || 'Пользователь';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
  const _joinedText = profile?.createdAt ? formatDate(profile.createdAt) : '—';
  const activeModules = sortedCourses.slice(0, 2);
  const dynamicModules = activeTab === 'courses' ? sortedCourses : activeModules;
  const adminRows = useMemo(() => {
    const statusByProgress = (progress) => {
      if ((progress || 0) >= 85) return 'Проверено';
      if ((progress || 0) >= 40) return 'На проверке';
      return 'Требует проверки';
    };
    return sortedCourses.slice(0, 5).map((course, index) => ({
      id: course.id || `row-${index}`,
      name: course.title || `Ресурс ${index + 1}`,
      author: course.instructor || profile?.name || 'Администратор',
      category: course.category || 'Материалы',
      status: statusByProgress(course.progress),
      uploaded: formatDate(course.lastAccessed),
      progress: course.progress || 0,
    }));
  }, [sortedCourses, profile?.name]);

  useEffect(() => {
    setSettingsDraft((prev) => ({
      ...prev,
      fullName: profile?.name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
    }));
  }, [profile?.email, profile?.name, profile?.phone]);

  if (loading) {
    return (
      <div style={styles.stateContainer}>
        <p style={styles.stateText}>Загрузка профиля...</p>
      </div>
    );
  }

  if (isAdmin) {
    const selectedMeta = selectedResourceType ? ADMIN_RESOURCE_TYPE_META[selectedResourceType] : null;
    const resetResourceForm = () => {
      setResourceForm({
        title: '',
        description: '',
        url: '',
        file: null,
      });
    };

    const openAddTypeModal = () => {
      setIsAddTypeModalOpen(true);
    };

    const closeAddTypeModal = () => {
      if (isResourceSubmitting) return;
      setIsAddTypeModalOpen(false);
    };

    const openAddResourceModal = (type) => {
      setSelectedResourceType(type);
      setIsAddTypeModalOpen(false);
      setIsAddResourceModalOpen(true);
      resetResourceForm();
    };

    const closeAddResourceModal = () => {
      if (isResourceSubmitting) return;
      setIsAddResourceModalOpen(false);
      setSelectedResourceType(null);
      resetResourceForm();
    };

    const submitResource = async (event) => {
      event.preventDefault();
      if (!selectedResourceType || !selectedMeta) return;
      if (!resourceForm.title.trim() || !resourceForm.description.trim()) {
        alert('Заполните название и описание');
        return;
      }

      setIsResourceSubmitting(true);
      try {
        const createResponse = await selectedMeta.createApi({
          title: resourceForm.title.trim(),
          description: resourceForm.description.trim(),
          url: resourceForm.url.trim() || null,
        });

        if (resourceForm.file && selectedMeta.uploadAttachmentApi) {
          const createdId = createResponse?.data?.id || createResponse?.id;
          if (createdId) {
            await selectedMeta.uploadAttachmentApi(createdId, resourceForm.file);
          }
        }

        alert(`Добавлено: ${selectedMeta.title}`);
        closeAddResourceModal();
      } catch (e) {
        alert(e?.message || 'Не удалось добавить материал');
      } finally {
        setIsResourceSubmitting(false);
      }
    };

    return (
      <div className="profile-page profile-admin-page" style={styles.page}>
        <div className="profile-admin-shell">
          <aside className="profile-admin-sidebar">
            <div className="profile-admin-logo">
              <div className="profile-admin-logo-icon">🛡️</div>
              <div>
                <strong>Админ панель</strong>
                <span>UrkerPro</span>
              </div>
            </div>
            <nav className="profile-admin-nav">
              <button type="button" className="is-active">Дашборд</button>
              <button type="button">Мои ресурсы</button>
              <button type="button" onClick={openAddTypeModal}>Добавить</button>
              <button type="button">Аналитика</button>
              <button type="button">Категории</button>
            </nav>
            <div className="profile-admin-side-bottom">
              <button type="button">Поддержка</button>
              <button type="button">Выход</button>
            </div>
          </aside>

          <section className="profile-admin-main">
            <header className="profile-admin-header">
              <div>
                <h1>Управление ресурсами</h1>
                <p>С возвращением, {profile?.name || 'Админ'}! Управляйте и проверяйте учебный контент.</p>
              </div>
              <div className="profile-admin-user">
                <span>{profile?.email || 'admin@urkerpro.kz'}</span>
              </div>
            </header>

            {error ? <div style={styles.error}>{error}</div> : null}

            <section className="profile-admin-stats">
              <article>
                <p>Всего ресурсов</p>
                <h3>{myCourses.length || 0}</h3>
                <span>в рабочем каталоге</span>
              </article>
              <article>
                <p>На проверке</p>
                <h3>{adminRows.filter((r) => r.status === 'На проверке').length}</h3>
                <span>требуют решения</span>
              </article>
              <article>
                <p>Средний прогресс</p>
                <h3>{avgProgress}%</h3>
                <span>по всем материалам</span>
              </article>
              <article>
                <p>Лучший рейтинг</p>
                <h3>{bestOlympiadScore}%</h3>
                <span>по олимпиадам</span>
              </article>
            </section>

            <section className="profile-admin-table-wrap">
              <div className="profile-admin-toolbar">
                <input type="text" value="" readOnly aria-label="Поиск" placeholder="Поиск по названию или автору..." />
                <div className="profile-admin-actions">
                  <button type="button">Фильтры</button>
                  <button type="button">Действия</button>
                  <button type="button">Экспорт CSV</button>
                </div>
              </div>
              <table className="profile-admin-table">
                <thead>
                  <tr>
                    <th>Название ресурса</th>
                    <th>Автор</th>
                    <th>Категория</th>
                    <th>Статус</th>
                    <th>Дата обновления</th>
                    <th>Прогресс</th>
                  </tr>
                </thead>
                <tbody>
                  {adminRows.length === 0 ? (
                    <tr>
                      <td colSpan={6}>Пока нет данных для отображения.</td>
                    </tr>
                  ) : (
                    adminRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.author}</td>
                        <td>{row.category}</td>
                        <td>
                          <span className={`profile-admin-status ${row.status === 'Проверено' ? 'ok' : row.status === 'На проверке' ? 'pending' : 'warn'}`}>
                            {row.status}
                          </span>
                        </td>
                        <td>{row.uploaded}</td>
                        <td>{row.progress}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </section>
        </div>

        {isAddTypeModalOpen ? (
          <div className="profile-admin-modal-backdrop" onClick={closeAddTypeModal} role="presentation">
            <div
              className="profile-admin-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-add-type-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="admin-add-type-title">Что хотите добавить?</h3>
              <p>Выберите категорию материала для публикации.</p>
              <div className="profile-admin-type-list">
                <button type="button" onClick={() => openAddResourceModal('documents')}>
                  <strong>Нормативные документы</strong>
                  <span>Регламенты, официальные положения, приказы</span>
                </button>
                <button type="button" onClick={() => openAddResourceModal('materials')}>
                  <strong>Методические материалы</strong>
                  <span>Шаблоны и методические пособия</span>
                </button>
                <button type="button" onClick={() => openAddResourceModal('consultations')}>
                  <strong>Консультации</strong>
                  <span>Экспертные разборы и рекомендации</span>
                </button>
              </div>
              <div className="profile-admin-modal-actions">
                <button type="button" className="is-secondary" onClick={closeAddTypeModal}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isAddResourceModalOpen && selectedMeta ? (
          <div className="profile-admin-modal-backdrop" onClick={closeAddResourceModal} role="presentation">
            <div
              className="profile-admin-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-add-resource-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="admin-add-resource-title">Добавить: {selectedMeta.title}</h3>
              <p>{selectedMeta.subtitle}</p>
              <form className="profile-admin-modal-form" onSubmit={submitResource}>
                <label htmlFor="admin-resource-title">Название</label>
                <input
                  id="admin-resource-title"
                  type="text"
                  value={resourceForm.title}
                  onChange={(e) => setResourceForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Введите название"
                  required
                />

                <label htmlFor="admin-resource-description">Описание</label>
                <textarea
                  id="admin-resource-description"
                  rows={4}
                  value={resourceForm.description}
                  onChange={(e) => setResourceForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Краткое описание материала"
                  required
                />

                <label htmlFor="admin-resource-url">Ссылка (опционально)</label>
                <input
                  id="admin-resource-url"
                  type="url"
                  value={resourceForm.url}
                  onChange={(e) => setResourceForm((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://..."
                />

                {selectedMeta.uploadAttachmentApi ? (
                  <>
                    <label htmlFor="admin-resource-file">Файл (опционально)</label>
                    <input
                      id="admin-resource-file"
                      type="file"
                      onChange={(e) =>
                        setResourceForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))
                      }
                    />
                  </>
                ) : null}

                <div className="profile-admin-modal-actions">
                  <button type="button" className="is-secondary" onClick={closeAddResourceModal} disabled={isResourceSubmitting}>
                    Отмена
                  </button>
                  <button type="submit" disabled={isResourceSubmitting}>
                    {isResourceSubmitting ? 'Сохранение...' : 'Добавить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const openSettings = () => {
    setSettingsError('');
    setSettingsSuccess('');
    setActiveTab('settings');
  };

  const saveSettings = async () => {
    const nextName = String(settingsDraft.fullName || '').trim();
    if (!nextName) {
      setSettingsError('Введите имя');
      setSettingsSuccess('');
      return;
    }
    if (settingsDraft.newPassword && settingsDraft.newPassword.length < 8) {
      setSettingsError('Новый пароль должен быть не менее 8 символов.');
      setSettingsSuccess('');
      return;
    }
    if (settingsDraft.newPassword !== settingsDraft.confirmPassword) {
      setSettingsError('Новый пароль и подтверждение не совпадают.');
      setSettingsSuccess('');
      return;
    }

    setSavingSettings(true);
    setSettingsError('');
    setSettingsSuccess('');

    try {
      const payload = {
        name: nextName,
        email: String(settingsDraft.email || '').trim(),
        currentPassword: settingsDraft.currentPassword || undefined,
        newPassword: settingsDraft.newPassword || undefined,
      };

      const response = await authAPI.updateCurrentUser(payload);
      const updated = response?.data || {};

      setProfile((prev) => ({
        ...(prev || {}),
        ...updated,
        phone: settingsDraft.phone || prev?.phone || '',
      }));

      try {
        const stored = localStorage.getItem('user');
        const parsed = stored ? JSON.parse(stored) : {};
        localStorage.setItem(
          'user',
          JSON.stringify({
            ...parsed,
            ...updated,
            phone: settingsDraft.phone || parsed?.phone || '',
          }),
        );
      } catch {
        // localStorage может быть недоступен.
      }

      setSettingsSuccess('Изменения успешно сохранены.');
      setSettingsDraft((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (e) {
      setSettingsError(e?.message || 'Не удалось сохранить настройки');
    } finally {
      setSavingSettings(false);
    }
  };

  const discardSettings = () => {
    setSettingsError('');
    setSettingsSuccess('');
    setSettingsDraft((prev) => ({
      ...prev,
      fullName: profile?.name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }));
  };

  const handleUploadDiploma = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const ext = String(file.name).toLowerCase();
    if (!(ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png'))) {
      alert('Разрешены только файлы .jpg, .jpeg, .png');
      return;
    }
    setUploadingDiploma(true);
    try {
      const res = await authAPI.uploadMyDiploma(file);
      const created = res?.data;
      if (created) {
        setDiplomas((prev) => [created, ...prev]);
      } else {
        const refreshed = await authAPI.listMyDiplomas();
        setDiplomas(Array.isArray(refreshed?.data) ? refreshed.data : []);
      }
    } catch (e) {
      alert(e?.message || 'Не удалось загрузить диплом');
    } finally {
      setUploadingDiploma(false);
    }
  };

  const handleDeleteDiploma = async (id) => {
    if (!window.confirm('Удалить диплом из портфолио?')) return;
    setDeletingDiplomaId(id);
    try {
      await authAPI.deleteMyDiploma(id);
      setDiplomas((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      alert(e?.message || 'Не удалось удалить диплом');
    } finally {
      setDeletingDiplomaId(null);
    }
  };

  return (
    <div className="profile-page profile-user-page" style={styles.page}>
      <div className="profile-user-shell">
        <aside className="profile-user-sidebar">
          <div className="profile-user-brand">
            <div className="profile-user-brand-icon">📚</div>
            <div>
              <strong className="profile-user-brand-name">{displayName}</strong>
              <span>Личный кабинет</span>
            </div>
          </div>
          <nav className="profile-user-nav">
            <button type="button" onClick={() => navigate('/home')}>Главная</button>
            <button type="button" onClick={() => navigate('/my-learning')}>Курсы</button>
            <button type="button" onClick={() => navigate('/olympiads')}>Результаты</button>
            <button type="button" className="is-active" onClick={() => navigate('/profile')}>Профиль</button>
          </nav>
          <div className="profile-user-pro">
            <p>PRO ПЛАН</p>
            <h4>Откройте расширенные возможности</h4>
            <button type="button" onClick={() => navigate('/courses')}>Узнать больше</button>
          </div>
        </aside>

        <main className="profile-user-main">
          {error ? <div style={styles.error}>{error}</div> : null}

          <section className="profile-user-hero">
            <div className="profile-user-avatar">{initials || 'У'}</div>
            <div>
              <p className="profile-user-tag">АКТИВНЫЙ УЧАЩИЙСЯ</p>
              <h1>{displayName}</h1>
              <p>{profile?.email || '—'} </p>
              <div className="profile-user-hero-actions">
                <button type="button" onClick={openSettings}>Редактировать профиль</button>
                <Link to="/my-learning">Мои курсы</Link>
              </div>
            </div>
          </section>

          <section className="profile-user-kpis">
            <article>
              <p>{bestOlympiadScore || 0}</p>
              <span>ЛУЧШИЙ БАЛЛ</span>
            </article>
            <article>
              <p>{completedCourses}</p>
              <span>КУРСОВ ЗАВЕРШЕНО</span>
            </article>
            <article>
              <p>{myCourses.length}</p>
              <span>АКТИВНЫХ КУРСОВ</span>
            </article>
          </section>

          <section className="profile-user-tabs">
            <button type="button" className={activeTab === 'overview' ? 'is-active' : ''} onClick={() => setActiveTab('overview')}>Обзор</button>
            <button type="button" className={activeTab === 'courses' ? 'is-active' : ''} onClick={() => setActiveTab('courses')}>Мои курсы</button>
            <button type="button" className={activeTab === 'olympiads' ? 'is-active' : ''} onClick={() => setActiveTab('olympiads')}>Олимпиады</button>
            <button type="button" className={activeTab === 'settings' ? 'is-active' : ''} onClick={() => setActiveTab('settings')}>Настройки</button>
          </section>

          {activeTab !== 'settings' ? (
            <section className="profile-user-content">
            <div className="profile-user-modules">
              <div className="profile-user-content-head">
                <h2>{activeTab === 'courses' ? 'Все курсы' : 'Активные модули обучения'}</h2>
                <Link to="/my-learning">{activeTab === 'courses' ? 'Перейти в обучение' : 'Смотреть все'}</Link>
              </div>
              <div className="profile-user-module-grid">
                {dynamicModules.length === 0 ? (
                  <p className="profile-user-empty">У вас пока нет активных курсов.</p>
                ) : (
                  dynamicModules.map((course) => (
                    <article key={course.id} className="profile-user-module-card">
                      <div className="profile-user-module-cover" />
                      <div className="profile-user-module-body">
                        <h3>{course.title || 'Курс без названия'}</h3>
                        <p>{course.instructor || 'Преподаватель не указан'}</p>
                        <div className="profile-user-progress-line">
                          <span style={{ width: `${Math.max(0, Math.min(100, course.progress || 0))}%` }} />
                        </div>
                        <strong>{course.progress || 0}%</strong>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            <aside className="profile-user-olymps">
              <div className="profile-user-content-head">
                <h2>{activeTab === 'olympiads' ? 'Подробные результаты олимпиад' : 'Результаты олимпиад'}</h2>
                <Link to="/olympiads">К списку</Link>
              </div>
              {displayedOlympiadRows.length === 0 ? (
                <p className="profile-user-empty">Результатов пока нет.</p>
              ) : (
                <div className="profile-user-olymp-list">
                  {displayedOlympiadRows.slice(0, activeTab === 'olympiads' ? 6 : 3).map((item, idx) => (
                    <article key={item.id} className="profile-user-olymp-item">
                      <div>
                        <h3>{item.olympiadTitle}</h3>
                        <p>
                          Балл: {item.ratingScore ?? item.scorePercent}% · {item.correctCount}/{item.totalQuestions}
                        </p>
                      </div>
                      <strong>#{idx + 1}</strong>
                    </article>
                  ))}
                </div>
              )}
              <Link to="/olympiads" className="profile-user-download-btn">
                Скачать сертификаты
              </Link>

              <div className="profile-user-diplomas">
                <div className="profile-user-content-head">
                  <h2>Портфолио дипломов</h2>
                </div>
                <label className="profile-user-diploma-upload">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    onChange={handleUploadDiploma}
                    disabled={uploadingDiploma}
                  />
                  {uploadingDiploma ? 'Загрузка...' : 'Загрузить диплом'}
                </label>
                {diplomas.length === 0 ? (
                  <p className="profile-user-empty">Пока нет загруженных дипломов.</p>
                ) : (
                  <div className="profile-user-diploma-list">
                    {diplomas.map((item) => (
                      <article key={item.id} className="profile-user-diploma-item">
                        <button
                          type="button"
                          className="profile-user-diploma-link"
                          title="Просмотр диплома"
                          onClick={() => openDiplomaPreview(item)}
                        >
                          {item.fileName || 'Диплом'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDiploma(item.id)}
                          disabled={deletingDiplomaId === item.id}
                          className="profile-user-diploma-del"
                        >
                          {deletingDiplomaId === item.id ? '...' : 'Удалить'}
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </aside>
            </section>
          ) : (
            <section className="profile-user-settings-layout">
              <div className="profile-user-settings-top">
                <div>
                  <h2>Настройки аккаунта</h2>
                  <p>Управляйте личными данными и параметрами безопасности.</p>
                </div>
                <div className="profile-user-settings-actions">
                  <button type="button" onClick={discardSettings} disabled={savingSettings}>Отмена</button>
                  <button type="button" onClick={saveSettings} disabled={savingSettings}>
                    {savingSettings ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                </div>
              </div>

              {settingsError ? <div className="profile-user-settings-error">{settingsError}</div> : null}
              {settingsSuccess ? <div className="profile-user-settings-success">{settingsSuccess}</div> : null}

              <div className="profile-user-settings-grid">
                <article className="profile-user-settings-card">
                  <h3>Профиль</h3>
                  <label htmlFor="settings-name">ФИО</label>
                  <input
                    id="settings-name"
                    type="text"
                    value={settingsDraft.fullName}
                    onChange={(e) => setSettingsDraft((prev) => ({ ...prev, fullName: e.target.value }))}
                  />
                  <div className="profile-user-settings-two">
                    <div>
                      <label htmlFor="settings-email">Email</label>
                      <input
                        id="settings-email"
                        type="email"
                        value={settingsDraft.email}
                        onChange={(e) => setSettingsDraft((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="settings-phone">Телефон</label>
                      <input
                        id="settings-phone"
                        type="text"
                        value={settingsDraft.phone}
                        onChange={(e) => setSettingsDraft((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                </article>

                <article className="profile-user-settings-card">
                  <h3>Предпочтения</h3>
                  <div className="profile-user-setting-row">
                    <div>
                      <strong>Email-уведомления</strong>
                      <span>Получать обновления и новости.</span>
                    </div>
                    <button
                      type="button"
                      className={`profile-toggle ${settingsDraft.emailNotifications ? 'on' : ''}`}
                      onClick={() => setSettingsDraft((prev) => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
                      aria-label="Переключить email-уведомления"
                    />
                  </div>
                  <div className="profile-user-setting-row">
                    <div>
                      <strong>Приватный режим</strong>
                      <span>Скрывать профиль из публичных рейтингов.</span>
                    </div>
                    <button
                      type="button"
                      className={`profile-toggle ${settingsDraft.privacyMode ? 'on' : ''}`}
                      onClick={() => setSettingsDraft((prev) => ({ ...prev, privacyMode: !prev.privacyMode }))}
                      aria-label="Переключить приватный режим"
                    />
                  </div>
                  <div className="profile-user-setting-row">
                    <div>
                      <strong>Звуковые эффекты</strong>
                      <span>Использовать звуки во время обучения.</span>
                    </div>
                    <button
                      type="button"
                      className={`profile-toggle ${settingsDraft.soundEffects ? 'on' : ''}`}
                      onClick={() => setSettingsDraft((prev) => ({ ...prev, soundEffects: !prev.soundEffects }))}
                      aria-label="Переключить звуковые эффекты"
                    />
                  </div>
                </article>

                <article className="profile-user-settings-card">
                  <h3>Безопасность и пароль</h3>
                  <label htmlFor="settings-current-password">Текущий пароль</label>
                  <input
                    id="settings-current-password"
                    type="password"
                    value={settingsDraft.currentPassword}
                    onChange={(e) => setSettingsDraft((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  />
                  <div className="profile-user-settings-two">
                    <div>
                      <label htmlFor="settings-new-password">Новый пароль</label>
                      <input
                        id="settings-new-password"
                        type="password"
                        value={settingsDraft.newPassword}
                        onChange={(e) => setSettingsDraft((prev) => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Минимум 8 символов"
                      />
                    </div>
                    <div>
                      <label htmlFor="settings-confirm-password">Подтвердите пароль</label>
                      <input
                        id="settings-confirm-password"
                        type="password"
                        value={settingsDraft.confirmPassword}
                        onChange={(e) => setSettingsDraft((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Повторите новый пароль"
                      />
                    </div>
                  </div>
                </article>

                <article className="profile-user-settings-card profile-user-settings-danger">
                  <h3>Опасная зона</h3>
                  <p>После удаления аккаунта восстановление будет недоступно.</p>
                  <button type="button" disabled>Удалить аккаунт</button>
                </article>
              </div>
            </section>
          )}
        </main>
      </div>

      {diplomaPreview ? (
        <div
          className="profile-diploma-modal-backdrop"
          role="presentation"
          onClick={closeDiplomaPreview}
        >
          <div
            className="profile-diploma-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-diploma-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile-diploma-modal-head">
              <p id="profile-diploma-modal-title" className="profile-diploma-modal-title">
                {diplomaPreview.title}
              </p>
              <button
                type="button"
                className="profile-diploma-modal-close"
                onClick={closeDiplomaPreview}
                aria-label="Закрыть просмотр"
              >
                ×
              </button>
            </div>
            <div className="profile-diploma-modal-body">
              <img src={diplomaPreview.blobUrl} alt={diplomaPreview.title} />
            </div>
          </div>
        </div>
      ) : null}
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