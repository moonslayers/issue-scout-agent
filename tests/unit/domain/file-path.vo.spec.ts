import { FilePath } from '../../../src/domain/value-objects/file-path.vo';

describe('FilePath Value Object', () => {
  it('should create with valid path', () => {
    const fp = new FilePath('src/app/main.ts');
    expect(fp.getValue()).toBe('src/app/main.ts');
  });

  it('should reject empty path', () => {
    expect(() => new FilePath('')).toThrow('empty');
  });

  it('should reject whitespace-only path', () => {
    expect(() => new FilePath('   ')).toThrow('empty');
  });

  it('should reject parent directory references', () => {
    expect(() => new FilePath('../secret.txt')).toThrow('parent directory');
    expect(() => new FilePath('src/../../secret.txt')).toThrow('parent directory');
  });

  it('should extract file extension', () => {
    expect(new FilePath('file.ts').getExtension()).toBe('ts');
    expect(new FilePath('file.test.ts').getExtension()).toBe('ts');
    expect(new FilePath('file').getExtension()).toBe('');
  });

  it('should extract file name from path', () => {
    expect(new FilePath('src/app/main.ts').getFileName()).toBe('main.ts');
    expect(new FilePath('config.json').getFileName()).toBe('config.json');
    expect(new FilePath('a/b/c/d/e.txt').getFileName()).toBe('e.txt');
  });
});
