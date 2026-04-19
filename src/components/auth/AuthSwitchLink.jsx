import { Link, useNavigate } from 'react-router-dom';

function isModifiedEvent(event) {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

export default function AuthSwitchLink({ to, onClick, ...props }) {
  const navigate = useNavigate();

  const handleClick = (event) => {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      isModifiedEvent(event)
    ) {
      return;
    }

    event.preventDefault();

    if (typeof document.startViewTransition !== 'function') {
      navigate(to);
      return;
    }

    const root = document.documentElement;
    const direction = to === '/register' ? 'to-register' : 'to-login';
    root.dataset.authTransition = direction;

    const transition = document.startViewTransition(() => {
      navigate(to);
    });

    transition.finished.finally(() => {
      if (root.dataset.authTransition === direction) {
        delete root.dataset.authTransition;
      }
    });
  };

  return <Link to={to} onClick={handleClick} {...props} />;
}
