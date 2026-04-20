/** Роли, которым доступен каталог курсов и страницы курсов (контент урока — после оплаты/записи по правилам курса). */
export const COURSE_ACCESS_ROLES = ['admin', 'teacher', 'student'];

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
    if (role === 'admin' && fromPath === '/courses') return '/admin/courses';
    return fromPath;
  }
  return '/home';
}
