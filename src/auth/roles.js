/** Роли, которым разрешён доступ к курсам и материалам */
export const COURSE_ACCESS_ROLES = ['admin', 'teacher'];

export function hasCourseAccess(role) {
  return COURSE_ACCESS_ROLES.includes(role);
}

/** Путь к разделу «Курсы» в зависимости от роли (каталог vs админка) */
export function coursesSectionPath(role) {
  return role === 'admin' ? '/admin/courses' : '/courses';
}

/** Куда вести после успешного входа или регистрации */
export function pathAfterAuth(role, fromPath) {
  if (!hasCourseAccess(role)) return '/pending';
  const skip = ['/login', '/register', '/pending'];
  if (fromPath && !skip.includes(fromPath)) {
    if (role === 'admin' && fromPath === '/courses') return '/admin/courses';
    return fromPath;
  }
  return coursesSectionPath(role);
}
