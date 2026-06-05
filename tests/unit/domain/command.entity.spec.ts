import { Command } from '../../../src/domain/entities/command.entity';
import { CommandType } from '../../../src/domain/enums/command-type.enum';

describe('Command Entity', () => {
  it('should parse /ask command with args', () => {
    const cmd = Command.parse('/ask What files are affected?');
    expect(cmd).not.toBeNull();
    expect(cmd!.type).toBe(CommandType.ASK);
    expect(cmd!.args).toBe('What files are affected?');
    expect(cmd!.isAskCommand()).toBe(true);
  });

  it('should parse /update command without args', () => {
    const cmd = Command.parse('/update');
    expect(cmd).not.toBeNull();
    expect(cmd!.type).toBe(CommandType.UPDATE);
    expect(cmd!.args).toBe('');
    expect(cmd!.isUpdateCommand()).toBe(true);
  });

  it('should parse /investigate with component name', () => {
    const cmd = Command.parse('/investigate formulario');
    expect(cmd).not.toBeNull();
    expect(cmd!.type).toBe(CommandType.INVESTIGATE);
    expect(cmd!.args).toBe('formulario');
    expect(cmd!.isInvestigateCommand()).toBe(true);
  });

  it('should return null for regular comment', () => {
    const cmd = Command.parse('This is a regular comment without command');
    expect(cmd).toBeNull();
  });

  it('should return null for empty string', () => {
    const cmd = Command.parse('');
    expect(cmd).toBeNull();
  });

  it('should return null for unknown command', () => {
    const cmd = Command.parse('/unknown-command some args');
    expect(cmd).toBeNull();
  });
});
