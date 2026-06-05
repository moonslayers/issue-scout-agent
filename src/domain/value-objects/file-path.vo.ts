import { DomainError } from '../errors/domain.error';

export class FilePath {
  private readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new DomainError('File path cannot be empty');
    }
    if (value.includes('..')) {
      throw new DomainError('File path cannot contain parent directory references');
    }
    this.value = value.trim();
  }

  getValue(): string {
    return this.value;
  }

  getExtension(): string {
    const parts = this.value.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  getFileName(): string {
    const parts = this.value.split('/');
    return parts[parts.length - 1];
  }

  toString(): string {
    return this.value;
  }
}
