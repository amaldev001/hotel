/**
 * Format minor currency units integer (e.g. 1500 cents/paise) into major unit string ($15.00 / ₹15.00)
 * @param {number} minorUnits 
 * @param {string} currencyCode 
 * @returns {string}
 */
export const formatMoney = (minorUnits = 0, currencyCode = 'USD') => {
  const val = Number.isInteger(minorUnits) ? minorUnits : parseInt(minorUnits, 10) || 0;
  const major = val / 100;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch (e) {
    return `${currencyCode} ${(major).toFixed(2)}`;
  }
};
