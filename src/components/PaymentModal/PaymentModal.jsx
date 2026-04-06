import { X } from 'lucide-react';
import { useState } from 'react';
import styles from './PaymentModal.module.css';

const PaymentModal = ({ isOpen, course, onClose, onConfirm }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !course) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    // Имитируем обработку платежа
    await new Promise(resolve => setTimeout(resolve, 1500));
    onConfirm(course.id);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        {/* Header */}
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

        {/* Body */}
        <div className={styles.body}>
          <p className={styles.courseTitle}>{course.title}</p>
          <p className={styles.priceLabel}>Сумма к оплате:</p>
          <p className={styles.price}>{course.price.toLocaleString('ru-RU')} ₸</p>

          {/* Kaspi QR Placeholder */}
          <div className={styles.qrContainer}>
            <div className={styles.qrPlaceholder}>
              <svg viewBox="0 0 200 200" className={styles.qrCode}>
                <rect width="200" height="200" fill="white" />
                {/* QR Pattern Simulation */}
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
              <p className={styles.qrLabel}>Kaspi QR</p>
            </div>
          </div>

          <p className={styles.instruction}>
            Отсканируйте QR-код в приложении Kaspi для подтверждения платежа
          </p>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isProcessing}
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
                Обработка...
              </>
            ) : (
              'Подтвердить оплату'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
