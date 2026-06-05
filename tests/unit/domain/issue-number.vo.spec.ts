import { IssueNumber } from '../../../src/domain/value-objects/issue-number.vo';

describe('IssueNumber Value Object', () => {
  it('should create with positive integer', () => {
    const num = new IssueNumber(42);
    expect(num.getValue()).toBe(42);
  });

  it('should reject zero', () => {
    expect(() => new IssueNumber(0)).toThrow('positive integer');
  });

  it('should reject negative numbers', () => {
    expect(() => new IssueNumber(-1)).toThrow('positive integer');
  });

  it('should reject decimal numbers', () => {
    expect(() => new IssueNumber(1.5)).toThrow('positive integer');
  });

  it('should format as string with hash prefix', () => {
    expect(new IssueNumber(42).toString()).toBe('#42');
  });

  it('should check equality', () => {
    const num1 = new IssueNumber(42);
    const num2 = new IssueNumber(42);
    const num3 = new IssueNumber(7);
    expect(num1.equals(num2)).toBe(true);
    expect(num1.equals(num3)).toBe(false);
  });
});
