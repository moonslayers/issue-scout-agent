export class ToolExecutionError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly params: Record<string, unknown>,
    message: string
  ) {
    super(`Tool '${toolName}' execution failed: ${message}`);
    this.name = 'ToolExecutionError';
  }
}
