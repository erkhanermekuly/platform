/** Роли, которым разрешён доступ к платным курсам */
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
  const skip = ['/login', '/register'];
  if (fromPath && !skip.includes(fromPath)) {
    if (!hasCourseAccess(role) && (fromPath === '/courses' || fromPath === '/admin/courses')) {
      return '/pending';
    }
    if (role === 'admin' && fromPath === '/courses') return '/admin/courses';
    return fromPath;
  }
  return '/home';
}
