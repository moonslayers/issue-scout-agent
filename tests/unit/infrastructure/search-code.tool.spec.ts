import { SearchCodeTool } from '../../../src/infrastructure/ai/tools/search-code.tool';
import { writeFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SearchCodeTool', () => {
  const tool = new SearchCodeTool();
  let testDir: string;
  const originalCwd = process.cwd();

  beforeAll(() => {
    testDir = join(tmpdir(), `search-code-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'test.ts'), 'function calculateTotal(): number { return 42; }');
    writeFileSync(join(testDir, 'other.js'), 'const x = 1;');
    writeFileSync(join(testDir, 'data.json'), '{"calculateTotal": 42}');
    // Cambiar el CWD real para que grep opere en el directorio de prueba
    process.chdir(testDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should find files containing search text', async () => {
    const result = await tool.execute({ query: 'calculateTotal' });
    expect(result).toContain('test.ts');
  });

  it('should filter by file pattern', async () => {
    const result = await tool.execute({ query: 'calculateTotal', filePattern: '*.json' });
    expect(result).toContain('data.json');
  });

  it('should return empty when no matches found', async () => {
    const result = await tool.execute({ query: 'nonexistentFunctionX123' });
    expect(result).toBe('No se encontraron resultados');
  });

  it('should have correct metadata', () => {
    expect(tool.name).toBe('searchCode');
    expect(tool.description).toBeDefined();
  });
});
