import { describe, expect, it } from 'vitest';
import { estimateDevice, summarizeScenario, toDisplayPercents, validateDevice } from '../domain';
import type { EnergyScenario } from '../types';

function makeScenario(devices: Array<Pick<EnergyScenario['devices'][number], 'watts' | 'dailyHours'>>): EnergyScenario {
  return {
    id: 's', name: 'test', pricePerKwh: 1, daysPerMonth: 30, createdAt: '',
    devices: devices.map((device, index) => ({ id: `d${index}`, name: `设备${index}`, ...device })),
  };
}

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

  it('allocates display percents so they always add up to 100', () => {
    expect(toDisplayPercents([1 / 3, 1 / 3, 1 / 3])).toEqual([34, 33, 33]);
    expect(toDisplayPercents([0.335, 0.335, 0.33])).toEqual([34, 33, 33]);
    const summary = summarizeScenario(makeScenario([
      { watts: 10, dailyHours: 1 }, { watts: 10, dailyHours: 1 }, { watts: 10, dailyHours: 1 },
    ]));
    expect(summary.devices.reduce((sum, device) => sum + device.sharePercent, 0)).toBe(100);
  });

  it('gives a single device the full 100%', () => {
    const summary = summarizeScenario(makeScenario([{ watts: 800, dailyHours: 3 }]));
    expect(summary.devices).toHaveLength(1);
    expect(summary.devices[0].sharePercent).toBe(100);
  });

  it('reports zero shares instead of naming a top source when nothing consumes power', () => {
    const summary = summarizeScenario(makeScenario([
      { watts: 0, dailyHours: 0 }, { watts: 0, dailyHours: 5 }, { watts: 200, dailyHours: 0 },
    ]));
    expect(summary.total.monthlyKwh).toBe(0);
    expect(summary.devices.map((device) => device.share)).toEqual([0, 0, 0]);
    expect(summary.devices.map((device) => device.sharePercent)).toEqual([0, 0, 0]);
  });

  it('rejects negative power and more than 24 hours', () => {
    expect(validateDevice({ name: 'x', watts: -1, dailyHours: 1 })).toBe('功率不能为负数');
    expect(validateDevice({ name: 'x', watts: 1, dailyHours: 24.1 })).toBe('每日使用时间不能超过 24 小时');
  });
});
