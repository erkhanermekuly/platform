/**
 * Клиентская логика последовательного доступа к урокам (зеркало правил сервера LessonProgressRules).
 */

export function sortLessons(lessons) {
  if (!Array.isArray(lessons)) return [];
  return [...lessons].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** Урок доступен, если это первый в порядке SortOrder или предыдущий отмечен завершённым. */
export function isLessonUnlocked(sortedLessons, lessonId, completedLessonIds) {
  const done = new Set(completedLessonIds ?? []);
  const idx = sortedLessons.findIndex((l) => l.id === lessonId);
  if (idx < 0) return false;
  if (idx === 0) return true;
  return done.has(sortedLessons[idx - 1].id);
}
