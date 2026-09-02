import { describe, it, expect } from 'vitest';
import { DEFAULT_UNIT_NAMES_ZH } from '../i18n';

describe('i18n - Unit Name Translations', () => {
  it('should have translations for all three factions', () => {
    const names = Object.keys(DEFAULT_UNIT_NAMES_ZH);
    // Terran
    expect(names).toContain('Marine');
    expect(names).toContain('Marauder');
    expect(names).toContain('Medic');
    // Zerg
    expect(names).toContain('Zergling');
    expect(names).toContain('Hydralisk');
    expect(names).toContain('Queen');
    // Protoss
    expect(names).toContain('Zealot');
    expect(names).toContain('Stalker');
    expect(names).toContain('High Templar');
  });

  it('should have non-empty Chinese translations', () => {
    Object.entries(DEFAULT_UNIT_NAMES_ZH).forEach(([en, zh]) => {
      expect(zh.length).toBeGreaterThan(0);
      // Chinese name should be different from English name
      expect(zh).not.toBe(en);
    });
  });

  it('should have at least 20 unit translations', () => {
    expect(Object.keys(DEFAULT_UNIT_NAMES_ZH).length).toBeGreaterThanOrEqual(20);
  });
});
