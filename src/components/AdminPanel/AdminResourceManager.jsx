import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import styles from './AdminPanel.module.css';

export default function AdminResourceManager({
  title,
  subtitle,
  listApi,
  createApi,
  updateApi,
  deleteApi,
  emptyLabel,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', url: '' });
  const [editingId, setEditingId] = useState(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await listApi();
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      alert(e?.message || 'Не удалось загрузить записи');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const addItem = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      alert('Заполните название и описание');
      return;
    }
    setSaving(true);
    try {
      await createApi({
        title: form.title.trim(),
        description: form.description.trim(),
        url: form.url.trim() || null,
      });
      setForm({ title: '', description: '', url: '' });
      await loadItems();
    } catch (err) {
      alert(err?.message || 'Не удалось добавить запись');
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      description: item.description || '',
      url: item.url || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ title: '', description: '', url: '' });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    if (!form.title.trim() || !form.description.trim()) {
      alert('Заполните название и описание');
      return;
    }
    setSaving(true);
    try {
      await updateApi(editingId, {
        title: form.title.trim(),
        description: form.description.trim(),
        url: form.url.trim() || null,
      });
      cancelEdit();
      await loadItems();
    } catch (err) {
      alert(err?.message || 'Не удалось обновить запись');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (id) => {
    if (!window.confirm('Удалить запись?')) return;
    try {
      await deleteApi(id);
      await loadItems();
    } catch (e) {
      alert(e?.message || 'Не удалось удалить запись');
    }
  };

  return (
    <section className={styles.resourceAdminSection}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <p className={styles.formSectionHint}>{subtitle}</p>

      <form onSubmit={editingId ? saveEdit : addItem} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Название</label>
          <input
            className={styles.input}
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Введите заголовок"
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Описание</label>
          <textarea
            className={styles.textarea}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
            placeholder="Краткое описание"
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Ссылка (опционально)</label>
          <input
            type="url"
            className={styles.input}
            value={form.url}
            onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
            placeholder="https://..."
          />
        </div>
        <div className={styles.courseRowActions}>
          <button type="submit" className={styles.submitButton} disabled={saving}>
            {saving ? 'Сохранение…' : editingId ? 'Сохранить изменения' : 'Добавить запись'}
          </button>
          {editingId && (
            <button type="button" className={styles.textAction} onClick={cancelEdit}>
              Отменить редактирование
            </button>
          )}
        </div>
      </form>

      <div className={styles.resourceItems}>
        {loading && <p className={styles.listSectionHint}>Загрузка…</p>}
        {!loading && items.length === 0 && <p className={styles.emptyMessage}>{emptyLabel}</p>}
        {!loading &&
          items.map((item) => (
            <article key={item.id} className={styles.resourceItemCard}>
              <div>
                <h4 className={styles.courseTitle}>{item.title}</h4>
                <p className={styles.courseDesc}>{item.description}</p>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer" className={styles.lessonsLink}>
                    Открыть ссылку
                  </a>
                )}
                <div className={styles.courseRowActions}>
                  <button type="button" onClick={() => beginEdit(item)} className={styles.textAction}>
                    Редактировать
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className={styles.deleteButton}
                title="Удалить"
              >
                <Trash2 size={18} />
              </button>
            </article>
          ))}
      </div>
    </section>
  );
}
