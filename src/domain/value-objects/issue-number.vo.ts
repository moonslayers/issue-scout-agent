import { DomainError } from '../errors/domain.error';

export class IssueNumber {
  private readonly value: number;

  constructor(value: number) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new DomainError('Issue number must be a positive integer');
    }
    this.value = value;
  }

  getValue(): number {
    return this.value;
  }

  toString(): string {
    return `#${this.value}`;
  }

  equals(other: IssueNumber): boolean {
    return this.value === other.getValue();
  }
}
