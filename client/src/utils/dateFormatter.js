/**
 * Format Date string in specified timezone
 * @param {string|Date} dateVal 
 * @param {string} timeZone 
 * @returns {string}
 */
export const formatDate = (dateVal, timeZone = 'UTC') => {
  if (!dateVal) return 'N/A';
  const dateObj = new Date(dateVal);
  if (isNaN(dateObj.getTime())) return 'N/A';

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  } catch (e) {
    return dateObj.toLocaleString();
  }
};
