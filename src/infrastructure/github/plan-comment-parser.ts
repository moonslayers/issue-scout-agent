export interface VersionEntry {
  commit: string;
  version: number;
}

export class PlanCommentParser {
  private static readonly VERSIONS_REGEX = /<!--\s*scout:versions:\s*(.+?)\s*--\s*>/;
  private static readonly SCOUT_REPORT_REGEX = /🕵️\s+\*\*Scout Report\*\*/;

  /**
   * Extrae el historial de versiones desde el HTML comment machine-readable.
   * Retorna array vacío si no hay tracker (plan legacy).
   */
  extractVersionHistory(body: string): VersionEntry[] {
    const match = body.match(PlanCommentParser.VERSIONS_REGEX);
    if (!match) return [];

    return match[1]
      .split(';')
      .map((entry) => {
        const [vPart, cPart] = entry.trim().split(',');
        const version = parseInt(vPart.split('=')[1], 10);
        const commit = cPart.split('=')[1];
        return { commit, version };
      })
      .sort((a, b) => b.version - a.version); // newest first
  }

  /**
   * Extrae SOLO el cuerpo del plan (sin marker, sin version tracker).
   */
  extractPlanBody(fullBody: string): string {
    // Quitar marker <!-- scout:plan -->
    let body = fullBody.replace(/<!--\s*scout:plan\s*-->\n?/, '');

    // Quitar version tracker desde 🕵️ **Scout Report** hasta el final
    body = body.replace(/\n?🕵️\s+\*\*Scout Report\*\*[\s\S]*$/, '');

    return body.trim();
  }

  /**
   * Construye el string completo del plan con version tracker.
   * @param body - El cuerpo del plan (solo contenido, sin markers)
   * @param currentCommit - Hash del commit actual
   * @param history - Historial de versiones previas (vacío para plan nuevo)
   * @returns El string completo listo para publicar como comment
   */
  buildPlanWithTracker(body: string, currentCommit: string, history: VersionEntry[]): string {
    const nextVersion = history.length > 0
      ? Math.max(...history.map((h) => h.version)) + 1
      : 1;

    // Visible tracker
    let tracker = `\n\n🕵️ **Scout Report** — Commit \`${currentCommit}\` (v${nextVersion})`;

    if (history.length > 0) {
      const prevChain = history
        .map((h) => `\`${h.commit}\` (v${h.version})`)
        .join(' → ');
      tracker += `\n↳ Previous: ${prevChain}`;
    }

    // Machine data (para parseo futuro)
    const allEntries = [{ commit: currentCommit, version: nextVersion }, ...history];
    const machineData = allEntries
      .map((e) => `v=${e.version},c=${e.commit}`)
      .join('; ');
    tracker += `\n<!-- scout:versions: ${machineData} -->`;

    return `<!-- scout:plan -->\n${body}${tracker}`;
  }

  /**
   * Verifica si un body de comment contiene un plan con tracker de versiones.
   */
  hasVersionTracker(body: string): boolean {
    return PlanCommentParser.SCOUT_REPORT_REGEX.test(body);
  }
}
