import { execSync } from 'child_process';

export class GitInfoService {
  /**
   * Obtiene el hash completo del commit actual (HEAD).
   * Ejecuta: git rev-parse HEAD
   * Lanza error si no puede obtenerlo.
   */
  getCurrentHeadHash(): string {
    try {
      return execSync('git rev-parse HEAD', { 
        encoding: 'utf-8', 
        timeout: 15000 
      }).trim();
    } catch (error) {
      throw new Error(
        `No se pudo obtener el hash del HEAD: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Intenta traer un commit específico desde origin.
   * Útil para shallow clones donde el commit histórico no está disponible localmente.
   * Retorna true si el fetch fue exitoso, false si falló.
   */
  fetchCommit(sha: string): boolean {
    try {
      execSync(`git fetch origin ${sha} --depth=1 --no-tags 2>/dev/null`, {
        encoding: 'utf-8',
        timeout: 30000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
