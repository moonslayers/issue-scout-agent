import { GitDiffTool } from '../../../src/infrastructure/ai/tools/git-diff.tool';
import { writeFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

describe('GitDiffTool', () => {
  const tool = new GitDiffTool();
  let testDir: string;

  beforeAll(() => {
    testDir = join(tmpdir(), `git-diff-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Initialize a git repo in testDir
    execSync('git -C "' + testDir + '" init --quiet', {});
    execSync('git -C "' + testDir + '" config init.defaultBranch main');
    execSync('git -C "' + testDir + '" config user.email test@test.com');
    execSync('git -C "' + testDir + '" config user.name Test');

    // Empty hooks directory to avoid system hook noise
    const hooksDir = join(testDir, 'empty-hooks');
    mkdirSync(hooksDir, { recursive: true });
    execSync(`git -C "${testDir}" config core.hooksPath "${hooksDir}"`);

    // Create initial commit
    writeFileSync(join(testDir, 'file.txt'), 'initial content\n');
    execSync('git -C "' + testDir + '" add .');
    execSync('git -C "' + testDir + '" commit -m "Initial commit" --quiet');

    // Create second commit with changes
    writeFileSync(join(testDir, 'file.txt'), 'initial content\nnew line added\n');
    writeFileSync(join(testDir, 'newfile.ts'), 'const x = 1;\n');
    execSync('git -C "' + testDir + '" add .');
    execSync('git -C "' + testDir + '" commit -m "Second commit" --quiet');
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should show diff between last two commits', async () => {
    const result = await tool.execute({ base: 'HEAD~1', head: 'HEAD', gitDir: testDir });
    expect(result).toContain('new line added');
    expect(result).toContain('newfile.ts');
  });

  it('should filter diff by path', async () => {
    const result = await tool.execute({ base: 'HEAD~1', head: 'HEAD', path: 'newfile.ts', gitDir: testDir });
    expect(result).toContain('newfile.ts');
    expect(result).toContain('const x = 1');
    expect(result).not.toContain('file.txt');
  });

  it('should return no differences for same ref', async () => {
    const result = await tool.execute({ base: 'HEAD', head: 'HEAD', gitDir: testDir });
    expect(result).toBe('No hay diferencias');
  });

  it('should have correct metadata', () => {
    expect(tool.name).toBe('gitDiff');
    expect(tool.description).toBeDefined();
  });
});
