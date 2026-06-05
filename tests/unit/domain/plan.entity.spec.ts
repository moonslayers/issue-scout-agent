import { Plan } from '../../../src/domain/entities/plan.entity';

describe('Plan Entity', () => {
  it('should create a plan with initial values', () => {
    const plan = new Plan(
      1,
      'Analysis result',
      ['src/file1.ts', 'src/file2.ts'],
      [{ order: 1, description: 'Update file1', files: ['src/file1.ts'] }],
      ['Need to add tests']
    );

    expect(plan.issueNumber).toBe(1);
    expect(plan.analysis).toBe('Analysis result');
    expect(plan.affectedFiles).toHaveLength(2);
    expect(plan.implementationSteps).toHaveLength(1);
    expect(plan.considerations).toContain('Need to add tests');
  });

  it('should create with empty steps and considerations', () => {
    const plan = new Plan(1, 'Analysis', ['file.ts'], [], []);
    expect(plan.implementationSteps).toHaveLength(0);
    expect(plan.considerations).toHaveLength(0);
  });

  it('should update plan preserving createdAt', () => {
    const original = new Plan(
      1,
      'Old analysis',
      ['old.ts'],
      [{ order: 1, description: 'Old step', files: ['old.ts'] }],
      ['Old consideration']
    );

    const updated = original.update(
      'New analysis',
      ['new.ts'],
      [{ order: 1, description: 'New step', files: ['new.ts'] }],
      ['New consideration']
    );

    expect(updated.analysis).toBe('New analysis');
    expect(updated.affectedFiles).toEqual(['new.ts']);
    expect(updated.createdAt).toEqual(original.createdAt);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
  });
});
