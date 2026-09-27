import { describe, expect, it } from 'vitest';
import { allocateIntegerPercents, estimateDevice, summarizeScenario, validateDevice } from '../domain';
import type { EnergyScenario } from '../types';

describe('energy domain', () => {
  it('calculates kWh and cost from watts, hours, days and price', () => {
    const result = estimateDevice({ id: 'a', name: '空调', watts: 1000, dailyHours: 2 }, 30, 0.5);
    expect(result).toEqual({ dailyKwh: 2, monthlyKwh: 60, monthlyCost: 30 });
  });

  it('keeps device shares explainable and sums to 100%', () => {
    const scenario: EnergyScenario = { id: 's', name: 'test', pricePerKwh: 1, daysPerMonth: 30, createdAt: '', devices: [
      { id: 'a', name: 'a', watts: 100, dailyHours: 1 }, { id: 'b', name: 'b', watts: 300, dailyHours: 1 },
    ] };
    const summary = summarizeScenario(scenario);
    expect(summary.total.monthlyKwh).toBe(12);
    expect(summary.devices.map((device) => device.share)).toEqual([0.25, 0.75]);
    expect(summary.devices.map((device) => device.sharePercent)).toEqual([25, 75]);
  });

  it('allocates integer percents that sum to exactly 100 instead of 99 or 101', () => {
    // 各自四舍五入会得到 33+33+33=99、26+26+49=101
    expect(allocateIntegerPercents([1, 1, 1]).reduce((sum, p) => sum + p, 0)).toBe(100);
    expect(allocateIntegerPercents([25.5, 25.5, 49])).toEqual([26, 25, 49]);
    expect(allocateIntegerPercents([25.5, 25.5, 49]).reduce((sum, p) => sum + p, 0)).toBe(100);
  });

  it('gives a single device the full 100%', () => {
    expect(allocateIntegerPercents([42])).toEqual([100]);
  });

  it('returns all zeros when no device consumes energy yet', () => {
    expect(allocateIntegerPercents([0, 0, 0])).toEqual([0, 0, 0]);
    const scenario: EnergyScenario = { id: 's', name: 'test', pricePerKwh: 1, daysPerMonth: 30, createdAt: '', devices: [
      { id: 'a', name: 'a', watts: 0, dailyHours: 0 }, { id: 'b', name: 'b', watts: 0, dailyHours: 5 },
    ] };
    const summary = summarizeScenario(scenario);
    expect(summary.total.monthlyKwh).toBe(0);
    expect(summary.devices.map((device) => device.sharePercent)).toEqual([0, 0]);
  });

  it('rejects negative power and more than 24 hours', () => {
    expect(validateDevice({ name: 'x', watts: -1, dailyHours: 1 })).toBe('功率不能为负数');
    expect(validateDevice({ name: 'x', watts: 1, dailyHours: 24.1 })).toBe('每日使用时间不能超过 24 小时');
  });
});
