import { describe, expect, it } from 'vitest';
import setup from '../setup.js';

describe('cross-platform automatic setup launcher', () => {
  it('parses Node.js version strings', () => {
    expect(setup.parseNodeVersion('v24.4.1')).toEqual({ major: 24, minor: 4, patch: 1 });
    expect(setup.parseNodeVersion('22.12.0')).toEqual({ major: 22, minor: 12, patch: 0 });
    expect(setup.parseNodeVersion('not-a-version')).toBeNull();
  });

  it('accepts supported Node.js releases and rejects older releases', () => {
    expect(setup.isSupportedNodeVersion('v20.19.0')).toBe(true);
    expect(setup.isSupportedNodeVersion('v22.12.0')).toBe(true);
    expect(setup.isSupportedNodeVersion('v24.0.0')).toBe(true);
    expect(setup.isSupportedNodeVersion('v20.18.9')).toBe(false);
    expect(setup.isSupportedNodeVersion('v22.11.0')).toBe(false);
    expect(setup.isSupportedNodeVersion('v18.20.0')).toBe(false);
  });

  it('maps the supported operating systems to friendly names', () => {
    expect(setup.getPlatformName('win32')).toBe('Windows');
    expect(setup.getPlatformName('darwin')).toBe('macOS');
    expect(setup.getPlatformName('linux')).toBeNull();
  });

  it('creates a stable SHA-256 dependency state from package-lock.json', () => {
    const first = setup.dependencyStateHash();
    const second = setup.dependencyStateHash();
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toBe(first);
  });
});
