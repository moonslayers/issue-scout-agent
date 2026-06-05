import { IssueNumber } from '../value-objects/issue-number.vo';

export class Issue {
  constructor(
    public readonly number: IssueNumber,
    public readonly title: string,
    public readonly body: string,
    public readonly labels: string[] = []
  ) {}

  extractKeywords(): string[] {
    const text = `${this.title} ${this.body}`;
    return text
      .split(/\s+/)
      .map(w => w.toLowerCase())
      .filter(w => w.length > 3)
      .filter(w => !['para', 'como', 'este', 'necesitamos', 'agregar'].includes(w));
  }

  hasLabel(label: string): boolean {
    return this.labels.includes(label);
  }
}
