import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dict } from '../i18n.js';

const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
const mainJs = readFileSync(join(process.cwd(), 'src/main.js'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/style.css'), 'utf8');

describe('public UI surface', () => {
  it('does not expose restore JSON controls in the archive view', () => {
    expect(html).not.toContain('arch-vault');
    expect(html).not.toContain('btn-export');
    expect(html).not.toContain('btn-import');
    expect(html).not.toContain('SAVE RESTORE FILE');
  });

  it('uses plain wording for destructive and task-splitting controls', () => {
    expect(dict.en.btnDelete).toBe('DELETE');
    expect(dict.en.confirmDelete).toBe('Delete this task?');
    expect(dict.en.btnAISubdivide).toBe('SPLIT TASK');
    expect(dict.en.aiSubdivision).toBe('TASK BREAKDOWN');

    expect(dict.ko.btnDelete).toBe('삭제');
    expect(dict.ko.confirmDelete).toBe('이 작업을 삭제할까요?');
    expect(dict.ko.btnAISubdivide).toBe('작업 나누기');
    expect(dict.ko.aiSubdivision).toBe('작업 나누기');
    expect(dict.ko.btnAISubdivide).not.toContain('AI');
    expect(JSON.stringify(dict.ko)).not.toContain('영구 폐기');
  });

  it('uses only the unified pixel font stack (no JetBrains/Inter/Courier)', () => {
    // The insight block used to set an inline JetBrains Mono font, which broke
    // the pixel tone-and-manner. All font-family must go through --font-* vars.
    for (const src of [html, mainJs]) {
      expect(src).not.toContain('JetBrains');
      expect(src).not.toContain('Courier');
    }
    // Any inline font-family in main.js must reference a pixel font variable.
    const inlineFonts = mainJs.match(/font-family:\s*[^;"']+/g) || [];
    inlineFonts.forEach((decl) => expect(decl).toContain('var(--font'));
    // The CSS only declares JetBrains inside an explanatory comment, never as a value.
    expect(css).not.toMatch(/font-family:[^;]*JetBrains/);
  });

  it('no longer wraps UI labels in [ ] brackets', () => {
    expect(dict.en.navHOME).toBe('HOME');
    expect(dict.en.btnPause).toBe('PAUSE');
    // No dictionary value should be wrapped in the old "[ … ]" terminal style.
    const allValues = [...Object.values(dict.en), ...Object.values(dict.ko)];
    const stillBracketed = allValues.filter((v) => typeof v === 'string' && /^\[ .* \]$/.test(v));
    expect(stillBracketed).toEqual([]);
  });
});
