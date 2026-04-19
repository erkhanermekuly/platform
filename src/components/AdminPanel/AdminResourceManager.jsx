import { useEffect, useMemo, useRef, useState } from 'react';
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
  attachmentUploadApi,
  attachmentRemoveApi,
  attachmentDownload,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', url: '' });
  const [editingId, setEditingId] = useState(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const fileInputRef = useRef(null);

  const editingItem = useMemo(
    () => (editingId != null ? items.find((i) => i.id === editingId) : null),
    [items, editingId],
  );

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

  const clearAttachmentInput = () => {
    setAttachmentFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseCreatedId = (res) => {
    const raw = res?.data ?? res?.Data;
    const n = Number(raw?.id ?? raw?.Id);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      alert('Заполните название и описание');
      return;
    }
    setSaving(true);
    try {
      const res = await createApi({
        title: form.title.trim(),
        description: form.description.trim(),
        url: form.url.trim() || null,
      });
      const newId = parseCreatedId(res);
      if (attachmentFile && attachmentUploadApi) {
        if (newId == null) {
          alert(
            'Запись создана, но сервер не вернул id для загрузки файла. Откройте «Редактировать» у записи и прикрепите файл ещё раз.',
          );
        } else {
          try {
            await attachmentUploadApi(newId, attachmentFile);
          } catch (upErr) {
            const msg = String(upErr?.message || '');
            if (msg.includes('404')) {
              alert(
                'Файл не загружен: API вернул 404. Остановите и снова запустите backend из папки server (dotnet run), чтобы подтянулись маршруты загрузки.',
              );
            } else {
              throw upErr;
            }
          }
        }
      }
      setForm({ title: '', description: '', url: '' });
      clearAttachmentInput();
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
    clearAttachmentInput();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ title: '', description: '', url: '' });
    clearAttachmentInput();
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
      if (attachmentFile && attachmentUploadApi) {
        const fid = Number(editingId);
        if (!Number.isFinite(fid) || fid < 1) {
          alert('Некорректный id записи. Обновите страницу.');
        } else {
          try {
            await attachmentUploadApi(fid, attachmentFile);
          } catch (upErr) {
            const msg = String(upErr?.message || '');
            if (msg.includes('404')) {
              alert(
                'Файл не загружен: API вернул 404. Перезапустите сервер из папки server (dotnet run) с обновлённым кодом.',
              );
            } else {
              throw upErr;
            }
          }
        }
      }
      cancelEdit();
      await loadItems();
    } catch (err) {
      alert(err?.message || 'Не удалось обновить запись');
    } finally {
      setSaving(false);
    }
  };

  const stripServerAttachment = async () => {
    if (!editingId || !attachmentRemoveApi) return;
    if (!window.confirm('Удалить прикреплённый файл с сервера?')) return;
    setSaving(true);
    try {
      await attachmentRemoveApi(editingId);
      await loadItems();
    } catch (err) {
      alert(err?.message || 'Не удалось удалить файл');
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

  const showAttachmentField = Boolean(attachmentUploadApi);

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
        {showAttachmentField ? (
          <div className={styles.formGroup}>
            <label className={styles.label}>Файл PDF или Word (необязательно)</label>
            <p className={styles.fieldHelp}>Форматы: .pdf, .doc, .docx. Можно оставить пустым.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className={styles.fileInputNative}
              onChange={(e) => {
                const f = e.target.files?.[0];
                setAttachmentFile(f || null);
              }}
            />
            {attachmentFile ? <p className={styles.fieldHelp}>Выбран: {attachmentFile.name}</p> : null}
            {editingId && editingItem?.attachedFileName ? (
              <p className={styles.fieldHelp}>
                Сейчас на сервере: {editingItem.attachedFileName}
                {attachmentRemoveApi ? (
                  <>
                    {' · '}
                    <button type="button" className={styles.textAction} onClick={stripServerAttachment}>
                      Удалить файл
                    </button>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : null}
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
                {item.attachedFileName && attachmentDownload ? (
                  <div>
                    <button
                      type="button"
                      className={styles.textAction}
                      onClick={() =>
                        attachmentDownload(item.id, item.attachedFileName).catch((err) =>
                          alert(err?.message || 'Не удалось скачать файл'),
                        )
                      }
                    >
                      Скачать файл ({item.attachedFileName})
                    </button>
                  </div>
                ) : null}
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
