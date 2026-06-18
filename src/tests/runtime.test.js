import { describe, expect, it, afterEach } from 'vitest';
import { isWidget, isPipSupported } from '../utils/runtime.js';

describe('runtime', () => {
  afterEach(() => {
    delete window.documentPictureInPicture;
  });

  it('isWidget() is false in the main web context', () => {
    expect(isWidget()).toBe(false);
  });

  it('isPipSupported() reflects documentPictureInPicture availability', () => {
    delete window.documentPictureInPicture;
    expect(isPipSupported()).toBe(false);

    window.documentPictureInPicture = {};
    expect(isPipSupported()).toBe(true);
  });
});
