import { ReadFileTool } from '../../../src/infrastructure/ai/tools/read-file.tool';
import { writeFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ReadFileTool', () => {
  const tool = new ReadFileTool();
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `read-file-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should read a small file completely', async () => {
    const filePath = join(testDir, 'small.txt');
    writeFileSync(filePath, 'line1\nline2\nline3\n');
    const result = await tool.execute({ path: filePath });
    expect(result).toContain('line1');
    expect(result).toContain('line2');
    expect(result).toContain('line3');
  });

  it('should truncate large files with head and tail', async () => {
    const filePath = join(testDir, 'large.txt');
    const lines: string[] = [];
    for (let i = 1; i <= 200; i++) {
      lines.push(`Line ${i} content`);
    }
    writeFileSync(filePath, lines.join('\n'));

    const result = await tool.execute({ path: filePath, headLines: 10, tailLines: 5 });

    expect(result).toContain('Line 1');
    expect(result).toContain('Line 10');
    expect(result).toContain('...');
    expect(result).toContain('Line 196');
    expect(result).toContain('Line 200');
    // Should NOT contain middle lines
    expect(result).not.toContain('Line 50');
  });

  it('should handle non-existent file', async () => {
    const result = await tool.execute({ path: join(testDir, 'nonexistent.txt') });
    expect(result).toContain('Error');
    expect(result).toContain('no existe');
  });

  it('should have correct metadata', () => {
    expect(tool.name).toBe('readFile');
    expect(tool.description).toBeDefined();
    expect(tool.parameters).toBeDefined();
  });
});
