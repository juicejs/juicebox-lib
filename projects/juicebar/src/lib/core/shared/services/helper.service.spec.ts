import {TestBed} from '@angular/core/testing';
import {provideJuicebarTesting} from '../../../../testing/juicebar-testing';
import {CustomValidators} from '../CustomValidators';
import {HelperService} from './helper.service';

describe('HelperService', () => {
  let helper: HelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: provideJuicebarTesting()});
    helper = TestBed.inject(HelperService);
  });

  it('generates passwords of 12 to 16 letters and digits, with a lower-case letter, a capital and a digit', () => {
    const lengths = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const password = helper.generateRandomPassword();
      expect(password).toMatch(CustomValidators.passwordGeneratorRegex);
      expect(password).toMatch(CustomValidators.passwordValidatorRegex);
      lengths.add(password.length);
    }
    expect([...lengths].sort()).toEqual([12, 13, 14, 15, 16]);
  });

  it('sets a date to midnight of its day', () => {
    const day = helper.setDateToBeginningOfTheDay(new Date(2026, 10, 13, 15, 45, 10));
    expect(day.getTime()).toBe(new Date(2026, 10, 13).getTime());
    expect(helper.setDateToBeginningOfTheDay(null)).toBeNull();
  });

  // The results moment.duration(moment(to).diff(moment(from))) gave before moment was removed (2026-11-13)
  it.each([
    ['2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', {year: 0, month: 0, day: 0}],
    ['2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z', {year: 0, month: 0, day: 30}],
    ['2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z', {year: 0, month: 1, day: 0}],
    ['2026-01-15T10:00:00Z', '2026-03-14T09:00:00Z', {year: 0, month: 1, day: 26}],
    ['2024-02-29T00:00:00Z', '2025-03-01T00:00:00Z', {year: 1, month: 0, day: 0}],
    ['2020-06-10T12:30:00Z', '2026-11-13T08:00:00Z', {year: 6, month: 5, day: 2}],
    ['2026-11-13T08:00:00Z', '2020-06-10T12:30:00Z', {year: -6, month: -5, day: -2}],
    ['2026-03-01T00:00:00Z', '2026-03-01T23:59:59Z', {year: 0, month: 0, day: 0}],
    ['2000-01-01T00:00:00Z', '2026-12-31T23:59:59Z', {year: 26, month: 11, day: 29}],
  ])('counts %s to %s as moment did', (from, to, expected) => {
    expect(helper.calculateTotalTimeDate(new Date(from), new Date(to))).toEqual(expected);
  });

  // moment read these as local dates; new Date() reads a date-only text as UTC, which differs across a DST change
  it('reads date-only texts, arrays and objects as local dates, as moment did', () => {
    const local = helper.calculateTotalTimeDate(new Date(2026, 2, 1), new Date(2026, 3, 1));
    const calculate = (from: unknown, to: unknown) => helper.calculateTotalTimeDate(from as Date, to as Date);
    expect(calculate('2026-03-01', '2026-04-01')).toEqual(local);
    expect(calculate([2026, 2, 1], [2026, 3, 1])).toEqual(local);
    expect(calculate({year: 2026, month: 2, day: 1}, {y: 2026, M: 3, D: 1})).toEqual(local);
    expect(calculate('2026', '2026-03')).toEqual(helper.calculateTotalTimeDate(new Date(2026, 0, 1), new Date(2026, 2, 1)));
  });

  it('gives no duration for what moment took for no date', () => {
    const none = {year: NaN, month: NaN, day: NaN};
    const calculate = (from: unknown, to: unknown) => helper.calculateTotalTimeDate(from as Date, to as Date);
    expect(calculate(null, new Date(2026, 0, 1))).toEqual(none);
    expect(calculate([2026, 12, 1], [2027, 0, 1])).toEqual(none);
    expect(calculate([2026, 3, 31], [2026, 4, 1])).toEqual(none);
    expect(calculate({year: 2026, month: 0, day: 1, minute: 60}, new Date(2026, 1, 1))).toEqual(none);
  });
});
