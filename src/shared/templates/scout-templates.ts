/**
 * 🎯 Central de templates y labels de Issue Scout
 *
 * Cada template tiene:
 * - `id`: identificador único del template
 * - `title`: marker invisible (HTML comment) usado para buscar el comentario con includes()
 * - `build()`: función que construye el string completo del template
 *
 * Los `title` se incluyen como comentarios HTML <!-- scout:* --> dentro del body
 * para que sean invisibles al usuario pero localizables por el código.
 */

export interface ScoutTemplate {
  id: string;
  title: string;
  build: (...args: string[]) => string;
}

/** Footer de marca para todos los comentarios publicados por Issue Scout */
export const SCOUT_BRANDING = `\n\n---\n*🕵️ Generado por [Issue Scout Agent](https://github.com/moonslayers/issue-scout-agent)*`;

export const Templates = {
  /** Template del plan técnico principal (investigación inicial, /update, /investigate) */
  PLAN: {
    id: 'plan',
    title: '<!-- scout:plan -->',
    build: (body: string): string =>
      `<!-- scout:plan -->\n## 🤖 Plan Técnico Generado por Issue Scout\n\n${body}${SCOUT_BRANDING}`,
  } as ScoutTemplate,

  /** Template de respuesta a /ask */
  REPLY: {
    id: 'reply',
    title: '<!-- scout:reply -->',
    build: (body: string): string =>
      `<!-- scout:reply -->\n## 🤖 Respuesta de Issue Scout\n\n${body}${SCOUT_BRANDING}`,
  } as ScoutTemplate,

  /** Template de error cuando falla la investigación inicial */
  ERROR_INVESTIGATION: {
    id: 'error-investigation',
    title: '<!-- scout:error:investigation -->',
    build: (errorMessage: string): string =>
      `<!-- scout:error:investigation -->\n❌ **Error durante la investigación:**\n\n${errorMessage}\n\n*Revisa los logs del Action para más detalles.*${SCOUT_BRANDING}`,
  } as ScoutTemplate,

  /** Template de error cuando falla un comando (/ask, /update, /investigate) */
  ERROR_COMMAND: {
    id: 'error-command',
    title: '<!-- scout:error:command -->',
    build: (commandType: string, errorMessage: string): string =>
      `<!-- scout:error:command -->\n❌ **Error al procesar el comando \\\`${commandType}\\\`:**\n\n${errorMessage}${SCOUT_BRANDING}`,
  } as ScoutTemplate,

  /** Template de confirmación de /update exitoso */
  UPDATE_CONFIRM: {
    id: 'update-confirm',
    title: '<!-- scout:update:confirm -->',
    build: (now: string): string =>
      `<!-- scout:update:confirm -->\n✅ **Plan actualizado** — ${now} UTC\n\nEl plan ha sido re-generado con el código más reciente del repositorio.${SCOUT_BRANDING}`,
  } as ScoutTemplate,

  /** Template de confirmación de /investigate exitoso */
  INVESTIGATE_CONFIRM: {
    id: 'investigate-confirm',
    title: '<!-- scout:investigate:confirm -->',
    build: (component: string): string =>
      `<!-- scout:investigate:confirm -->\n✅ **Investigación actualizada** con el análisis de "${component}".${SCOUT_BRANDING}`,
  } as ScoutTemplate,
} as const;

/** Labels de GitHub usados por Issue Scout */
export const Labels = {
  SCOUT_INVESTIGATED: 'scout-investigated',
  PLAN_UPDATED: 'plan-updated',
} as const;
