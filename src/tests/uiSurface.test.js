import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dict } from '../i18n.js';

const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');

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

  it('no longer wraps UI labels in [ ] brackets', () => {
    expect(dict.en.navHOME).toBe('HOME');
    expect(dict.en.btnPause).toBe('PAUSE');
    // No dictionary value should be wrapped in the old "[ … ]" terminal style.
    const allValues = [...Object.values(dict.en), ...Object.values(dict.ko)];
    const stillBracketed = allValues.filter((v) => typeof v === 'string' && /^\[ .* \]$/.test(v));
    expect(stillBracketed).toEqual([]);
  });
});
