import { GitDiffTool } from '../../../src/infrastructure/ai/tools/git-diff.tool';
import { writeFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

describe('GitDiffTool', () => {
  const tool = new GitDiffTool();
  let testDir: string;
  const originalCwd = process.cwd();

  beforeAll(() => {
    testDir = join(tmpdir(), `git-diff-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Initialize a git repo
    execSync('git init --quiet', { cwd: testDir });
    execSync('git config init.defaultBranch main', { cwd: testDir });
    execSync('git config user.email test@test.com', { cwd: testDir });
    execSync('git config user.name Test', { cwd: testDir });
    // Deshabilitar hooks del sistema para evitar ruido en tests
    const hooksDir = join(testDir, 'empty-hooks');
    mkdirSync(hooksDir, { recursive: true });
    execSync(`git config core.hooksPath "${hooksDir}"`, { cwd: testDir });

    // Create initial commit
    writeFileSync(join(testDir, 'file.txt'), 'initial content\n');
    execSync('git add .', { cwd: testDir });
    execSync('git commit -m "Initial commit" --quiet', { cwd: testDir });

    // Create second commit with changes
    writeFileSync(join(testDir, 'file.txt'), 'initial content\nnew line added\n');
    writeFileSync(join(testDir, 'newfile.ts'), 'const x = 1;\n');
    execSync('git add .', { cwd: testDir });
    execSync('git commit -m "Second commit" --quiet', { cwd: testDir });

    // Cambiar el CWD real para que git diff opere en el directorio de prueba
    process.chdir(testDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should show diff between last two commits', async () => {
    const result = await tool.execute({ base: 'HEAD~1', head: 'HEAD' });
    expect(result).toContain('new line added');
    expect(result).toContain('newfile.ts');
  });

  it('should filter diff by path', async () => {
    const result = await tool.execute({ base: 'HEAD~1', head: 'HEAD', path: 'newfile.ts' });
    expect(result).toContain('newfile.ts');
    expect(result).toContain('const x = 1');
    expect(result).not.toContain('file.txt');
  });

  it('should return no differences for same ref', async () => {
    const result = await tool.execute({ base: 'HEAD', head: 'HEAD' });
    expect(result).toBe('No hay diferencias');
  });

  it('should have correct metadata', () => {
    expect(tool.name).toBe('gitDiff');
    expect(tool.description).toBeDefined();
  });
});
