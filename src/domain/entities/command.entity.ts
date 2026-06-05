import { CommandType } from '../enums/command-type.enum';

export class Command {
  constructor(
    public readonly type: CommandType,
    public readonly args: string,
    public readonly rawBody: string
  ) {}

  static parse(body: string): Command | null {
    const trimmed = body.trim();
    if (!trimmed.startsWith('/')) return null;

    const parts = trimmed.split(/\s+/);
    const commandStr = parts[0].toLowerCase();

    switch (commandStr) {
      case '/ask':
        return new Command(CommandType.ASK, parts.slice(1).join(' '), trimmed);
      case '/update':
        return new Command(CommandType.UPDATE, '', trimmed);
      case '/investigate':
        return new Command(CommandType.INVESTIGATE, parts.slice(1).join(' '), trimmed);
      default:
        return null;
    }
  }

  isUpdateCommand(): boolean {
    return this.type === CommandType.UPDATE;
  }

  isAskCommand(): boolean {
    return this.type === CommandType.ASK;
  }

  isInvestigateCommand(): boolean {
    return this.type === CommandType.INVESTIGATE;
  }
}
