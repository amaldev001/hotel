import { DateTime } from 'luxon';
import env from '../config/env.js';

/**
 * Returns current DateTime object in APP_TIMEZONE.
 * @returns {DateTime}
 */
export const nowInAppTimezone = () => {
  return DateTime.now().setZone(env.APP_TIMEZONE);
};

/**
 * Returns lowercase day of week name (e.g. 'monday', 'tuesday') in APP_TIMEZONE.
 * @param {Date|DateTime} [date]
 * @returns {string}
 */
export const getDayOfWeekInAppTimezone = (date = new Date()) => {
  const dt = date instanceof DateTime ? date : DateTime.fromJSDate(date).setZone(env.APP_TIMEZONE);
  return dt.weekdayLong.toLowerCase();
};

/**
 * Parses time string "HH:mm" into minutes since midnight.
 * @param {string} timeStr - "HH:mm" e.g. "09:30"
 * @returns {number}
 */
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map((v) => parseInt(v, 10));
  return (hours || 0) * 60 + (minutes || 0);
};

/**
 * Formats a Date into ISO string in APP_TIMEZONE.
 * @param {Date} date 
 * @returns {string}
 */
export const formatInAppTimezone = (date) => {
  if (!date) return '';
  return DateTime.fromJSDate(date).setZone(env.APP_TIMEZONE).toISO();
};
