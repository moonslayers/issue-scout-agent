import { ListDirTool } from '../../../src/infrastructure/ai/tools/list-dir.tool';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ListDirTool', () => {
  const tool = new ListDirTool();
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `list-dir-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    // Crear algunos archivos de prueba
    writeFileSync(join(testDir, 'file1.ts'), 'content1');
    writeFileSync(join(testDir, 'file2.ts'), 'content2');
    mkdirSync(join(testDir, 'subdir'), { recursive: true });
    writeFileSync(join(testDir, 'subdir', 'file3.ts'), 'content3');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should list files in directory', async () => {
    const result = await tool.execute({ path: testDir, maxDepth: 1 });
    expect(result).toContain('file1.ts');
    expect(result).toContain('file2.ts');
    expect(result).not.toContain('file3.ts'); // maxDepth 1 no llega a subdir
  });

  it('should list files with depth 2', async () => {
    const result = await tool.execute({ path: testDir, maxDepth: 2 });
    expect(result).toContain('file1.ts');
    expect(result).toContain('file2.ts');
    expect(result).toContain('file3.ts');
  });

  it('should handle non-existent directory', async () => {
    const result = await tool.execute({ path: '/nonexistent/path', maxDepth: 2 });
    expect(result).toContain('no encontrado');
  });

  it('should have correct metadata', () => {
    expect(tool.name).toBe('listDir');
    expect(tool.description).toBeDefined();
    expect(tool.parameters).toBeDefined();
  });
});
