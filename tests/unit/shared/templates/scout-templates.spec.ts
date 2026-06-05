import { Templates, Labels } from '../../../../src/shared/templates/scout-templates';

describe('ScoutTemplates', () => {
  describe('Templates', () => {
    it('should have all 6 templates defined', () => {
      expect(Object.keys(Templates)).toHaveLength(6);
    });

    it('each template should have id, title and build', () => {
      for (const [key, template] of Object.entries(Templates)) {
        expect(template.id).toBeDefined();
        expect(typeof template.id).toBe('string');
        expect(template.title).toBeDefined();
        expect(typeof template.title).toBe('string');
        expect(template.build).toBeDefined();
        expect(typeof template.build).toBe('function');
      }
    });

    it('each template title should be a unique HTML comment', () => {
      const titles = Object.values(Templates).map(t => t.title);
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(titles.length); // No duplicados
      titles.forEach(title => {
        expect(title).toMatch(/^<!-- scout:.+ -->$/);
      });
    });

    it('each template build() output should include its own title', () => {
      for (const template of Object.values(Templates)) {
        const result = template.build('test content');
        expect(result).toContain(template.title);
      }
    });

    describe('PLAN', () => {
      it('should build the plan comment with title and body', () => {
        const result = Templates.PLAN.build('My plan body');
        expect(result).toContain(Templates.PLAN.title);
        expect(result).toContain('🤖 Plan Técnico Generado por Issue Scout');
        expect(result).toContain('My plan body');
        expect(result).toContain('Este plan es orientativo');
      });
    });

    describe('REPLY', () => {
      it('should build the reply comment with title and body', () => {
        const result = Templates.REPLY.build('My reply');
        expect(result).toContain(Templates.REPLY.title);
        expect(result).toContain('🤖 Respuesta de Issue Scout');
        expect(result).toContain('My reply');
      });
    });

    describe('ERROR_INVESTIGATION', () => {
      it('should build error template with message', () => {
        const result = Templates.ERROR_INVESTIGATION.build('Something went wrong');
        expect(result).toContain(Templates.ERROR_INVESTIGATION.title);
        expect(result).toContain('❌ **Error durante la investigación:**');
        expect(result).toContain('Something went wrong');
        expect(result).toContain('Revisa los logs');
      });
    });

    describe('ERROR_COMMAND', () => {
      it('should build command error template with type and message', () => {
        const result = Templates.ERROR_COMMAND.build('/update', 'Timeout');
        expect(result).toContain(Templates.ERROR_COMMAND.title);
        expect(result).toContain('❌ **Error al procesar el comando');
        expect(result).toContain('/update');
        expect(result).toContain('Timeout');
      });
    });

    describe('UPDATE_CONFIRM', () => {
      it('should build update confirmation with timestamp', () => {
        const result = Templates.UPDATE_CONFIRM.build('2026-06-05 12:00');
        expect(result).toContain(Templates.UPDATE_CONFIRM.title);
        expect(result).toContain('✅ **Plan actualizado**');
        expect(result).toContain('2026-06-05 12:00');
        expect(result).toContain('re-generado');
      });
    });

    describe('INVESTIGATE_CONFIRM', () => {
      it('should build investigate confirmation with component name', () => {
        const result = Templates.INVESTIGATE_CONFIRM.build('user module');
        expect(result).toContain(Templates.INVESTIGATE_CONFIRM.title);
        expect(result).toContain('✅ **Investigación actualizada**');
        expect(result).toContain('user module');
      });
    });
  });

  describe('Labels', () => {
    it('should have scout-investigated label', () => {
      expect(Labels.SCOUT_INVESTIGATED).toBe('scout-investigated');
    });

    it('should have plan-updated label', () => {
      expect(Labels.PLAN_UPDATED).toBe('plan-updated');
    });
  });
});
