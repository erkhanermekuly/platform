import { Link } from 'react-router-dom';
import AdminResourceManager from '../components/AdminPanel/AdminResourceManager';
import { downloadResourceAttachedFile, resourcesAPI } from '../api/courseService';
import '../styles/pages.css';

export default function AdminNormativeDocumentsPage() {
  return (
    <div className="resource-page" style={{ maxWidth: 960, margin: '0 auto' }}>
      <header className="resource-page-header">
        <p style={{ marginBottom: 8 }}>
          <Link to="/normative-documents" className="btn btn-secondary">
            ← К списку для участников
          </Link>
        </p>
        <h1>Нормативные документы — администрирование</h1>
        <p>
          Записи хранятся в таблице NormativeDocuments. Можно указать внешнюю ссылку и/или прикрепить файл (PDF, DOC,
          DOCX).
        </p>
      </header>

      <AdminResourceManager
        title="Документы"
        subtitle="Добавление, редактирование и вложения для раздела «Нормативные документы»."
        listApi={resourcesAPI.documents.list}
        createApi={resourcesAPI.documents.create}
        updateApi={resourcesAPI.documents.update}
        deleteApi={resourcesAPI.documents.remove}
        emptyLabel="Пока нет документов"
        attachmentUploadApi={resourcesAPI.documents.uploadAttachment}
        attachmentRemoveApi={resourcesAPI.documents.removeAttachment}
        attachmentDownload={(id, name) => downloadResourceAttachedFile('documents', id, name)}
      />
    </div>
  );
}
