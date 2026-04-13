import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { paymentsAPI } from '../../api/courseService';
import styles from './PaymentModal.module.css';

const PaymentModal = ({ isOpen, course, onClose, onConfirm }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');
  const [paymentId, setPaymentId] = useState(null);
  const [statusText, setStatusText] = useState('');
  const [errorText, setErrorText] = useState('');
  const pollingRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
      setPaymentLink('');
      setPaymentId(null);
      setStatusText('');
      setErrorText('');

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
  }, []);

  if (!isOpen || !course) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    setStatusText('Создаем ссылку на оплату...');
    setErrorText('');

    try {
      const response = await paymentsAPI.processPayment(course.id, course.price, window.location.href);
      const data = response?.data;

      if (data?.alreadyPaid) {
        onConfirm(course.id);
        setIsProcessing(false);
        onClose();
        return;
      }

      if (!data?.paymentId || !data?.redirectUrl) {
        throw new Error('Сервис оплаты не вернул ссылку на Kaspi');
      }

      setPaymentId(data.paymentId);
      setPaymentLink(data.redirectUrl);
      setStatusText('Ссылка готова. Завершите оплату в Kaspi, мы проверим статус автоматически.');

      window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');

      pollingRef.current = window.setInterval(async () => {
        try {
          const statusResponse = await paymentsAPI.checkPaymentStatus(data.paymentId);

          if (statusResponse?.data?.status === 'completed') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }

            setStatusText('Оплата подтверждена. Курс разблокирован.');
            setIsProcessing(false);
            onConfirm(course.id);
            window.setTimeout(() => onClose(), 1200);
          }
        } catch (pollError) {
          console.error('Failed to check payment status', pollError);
        }
      }, 4000);
    } catch (error) {
      setErrorText(error.message || 'Не удалось запустить оплату');
      setStatusText('');
      setIsProcessing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!paymentLink) {
      return;
    }

    await navigator.clipboard.writeText(paymentLink);
    setStatusText('Ссылка скопирована. Ее можно открыть на устройстве с приложением Kaspi.');
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h2 className={styles.title}>Оплата через Kaspi QR</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            disabled={isProcessing}
          >
            <X size={24} />
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.courseTitle}>{course.title}</p>
          <p className={styles.priceLabel}>Сумма к оплате:</p>
          <p className={styles.price}>{course.price.toLocaleString('ru-RU')} ₸</p>

          <div className={styles.qrContainer}>
            <div className={styles.qrPlaceholder}>
              <svg viewBox="0 0 200 200" className={styles.qrCode}>
                <rect width="200" height="200" fill="white" />
                <rect x="10" y="10" width="40" height="40" fill="black" />
                <rect x="60" y="10" width="40" height="40" fill="black" />
                <rect x="110" y="10" width="40" height="40" fill="black" />
                <rect x="150" y="10" width="40" height="40" fill="black" />
                
                <rect x="10" y="60" width="40" height="40" fill="black" />
                <rect x="60" y="60" width="40" height="40" fill="black" />
                <rect x="110" y="60" width="40" height="40" fill="black" />
                <rect x="150" y="60" width="40" height="40" fill="black" />
                
                <circle cx="100" cy="100" r="30" fill="#8b5cf6" opacity="0.2" />
                <text x="100" y="105" textAnchor="middle" fontSize="14" fill="#8b5cf6" fontWeight="bold">QR</text>
              </svg>
              <p className={styles.qrLabel}>Kaspi Redirect</p>
            </div>
          </div>

          <p className={styles.instruction}>
            Оплата запускается через сервис Urker. После успешного платежа доступ к курсу откроется автоматически.
          </p>

          {statusText && <p className={styles.status}>{statusText}</p>}
          {paymentId && <p className={styles.paymentMeta}>Платеж #{paymentId}</p>}
          {errorText && <p className={styles.error}>{errorText}</p>}

          {paymentLink && (
            <button type="button" className={styles.copyButton} onClick={handleCopyLink}>
              Скопировать ссылку на оплату
            </button>
          )}
        </div>

        <div className={styles.footer}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isProcessing && !paymentLink}
          >
            Отменить
          </button>
          <button
            className={`${styles.confirmButton} ${isProcessing ? styles.processing : ''}`}
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className={styles.spinner}></span>
                Ожидание оплаты...
              </>
            ) : (
              'Оплатить через Kaspi'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
