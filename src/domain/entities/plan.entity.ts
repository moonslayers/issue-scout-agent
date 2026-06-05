export interface PlanStep {
  order: number;
  description: string;
  files: string[];
}

export class Plan {
  constructor(
    public readonly issueNumber: number,
    public readonly analysis: string,
    public readonly affectedFiles: string[],
    public readonly implementationSteps: PlanStep[],
    public readonly considerations: string[],
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  update(analysis: string, affectedFiles: string[], steps: PlanStep[], considerations: string[]): Plan {
    return new Plan(
      this.issueNumber,
      analysis,
      affectedFiles,
      steps,
      considerations,
      this.createdAt,
      new Date()
    );
  }
}
