import styles from './styles.module.css';

/**
 * Базовый компонент Card
 * Используется как основа для других компонентов
 */
export const Card = ({ 
  children, 
  className = '', 
  hoverable = false,
  interactive = false,
  ...props 
}) => {
  return (
    <div
      className={`${styles.card} ${hoverable ? styles.hoverable : ''} ${interactive ? styles.interactive : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
