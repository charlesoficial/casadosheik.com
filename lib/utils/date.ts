export function formatDate(value: string | Date) {
  return new Date(value).toLocaleString("pt-BR");
}

export function timeAgo(value: string | Date) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) {
    return `há ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  return `há ${diffHours} h`;
}
