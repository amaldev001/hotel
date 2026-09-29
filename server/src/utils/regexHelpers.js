/**
 * Escapes special regex characters in a search string to prevent ReDoS / regex injection.
 * @param {string} str 
 * @returns {string}
 */
export const escapeRegex = (str = '') => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default escapeRegex;
