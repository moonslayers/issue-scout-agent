import { Issue } from '../../../src/domain/entities/issue.entity';
import { IssueNumber } from '../../../src/domain/value-objects/issue-number.vo';

describe('Issue Entity', () => {
  it('should create an issue with valid parameters', () => {
    const issue = new Issue(new IssueNumber(1), 'Test title', 'Test body', ['bug']);
    expect(issue.title).toBe('Test title');
    expect(issue.body).toBe('Test body');
    expect(issue.number.getValue()).toBe(1);
    expect(issue.labels).toEqual(['bug']);
  });

  it('should extract keywords from title and body', () => {
    const issue = new Issue(
      new IssueNumber(1),
      'Agregar formulario jurídico',
      'Necesitamos un nuevo campo para régimen fiscal',
      ['feature']
    );

    const keywords = issue.extractKeywords();
    expect(keywords).toContain('formulario');
    expect(keywords).toContain('jurídico');
    expect(keywords).toContain('régimen');
    expect(keywords).toContain('fiscal');
    expect(keywords).not.toContain('para');
    expect(keywords).not.toContain('como');
  });

  it('should check if issue has a label', () => {
    const issue = new Issue(
      new IssueNumber(1),
      'Test',
      'Body',
      ['bug', 'urgent']
    );

    expect(issue.hasLabel('bug')).toBe(true);
    expect(issue.hasLabel('urgent')).toBe(true);
    expect(issue.hasLabel('feature')).toBe(false);
  });

  it('should handle empty body', () => {
    const issue = new Issue(new IssueNumber(1), 'Title', '');
    expect(issue.body).toBe('');
    expect(issue.labels).toEqual([]);
  });
});
