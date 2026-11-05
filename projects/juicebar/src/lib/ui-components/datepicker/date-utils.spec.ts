import {isoWeek, parseTypedDate, toDate, toDateValue, toIsoWithOffset, toRangeValue} from './date-utils';

describe('date-utils', () => {
  it('reads every shape the old forms held', () => {
    const day = new Date(2026, 10, 5);
    expect(toDate({year: 2026, month: 11, day: 5})).toEqual(day);
    expect(toDate('05.11.2026')).toEqual(day);
    expect(toDate('05-11-2026')).toEqual(day);
    expect(toDate('2026-11-05')).toEqual(day);
    expect(toDate(day.getTime())).toEqual(day);
    expect(toDate(toIsoWithOffset(new Date(2026, 10, 5, 14, 30)))).toEqual(new Date(2026, 10, 5, 14, 30));
    expect(toDate({year: 2026, month: 2, day: 31})).toBeNull();
    expect(toDate('5')).toBeNull();
  });

  it('parses typed dates with and without a time, rejecting days and times that don\'t exist', () => {
    expect(parseTypedDate('5.1.2026')).toEqual(new Date(2026, 0, 5));
    expect(parseTypedDate('05.01.2026 08:45')).toEqual(new Date(2026, 0, 5, 8, 45));
    expect(parseTypedDate('29.02.2026')).toBeNull();
    expect(parseTypedDate('05.01.2026 24:00')).toBeNull();
  });

  it('gives the old shapes', () => {
    const day = new Date(2026, 10, 5);
    expect(toDateValue(day, 'struct')).toEqual({year: 2026, month: 11, day: 5});
    expect(toDateValue(day, 'string')).toBe('05.11.2026');
    expect(toDateValue(day, 'timestamp')).toBe(day.getTime());
    expect(toRangeValue(day, new Date(2026, 10, 9), 'struct')).toEqual({from: {year: 2026, month: 11, day: 5}, to: {year: 2026, month: 11, day: 9}});
  });

  it('formats ISO with the offset as the old DateTimeModel', () => {
    expect(toIsoWithOffset(new Date(2026, 10, 5, 14, 30, 5))).toMatch(/^2026-11-05T14:30:05[+-]\d{2}:\d{2}$/);
  });

  it('counts ISO weeks', () => {
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1);
    expect(isoWeek(new Date(2025, 11, 29))).toBe(1);
    expect(isoWeek(new Date(2027, 0, 1))).toBe(53);
    expect(isoWeek(new Date(2026, 9, 26))).toBe(44);
  });
});
