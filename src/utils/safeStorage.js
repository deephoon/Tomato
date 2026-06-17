export function safeParse(jsonString, fallback) {
  if (!jsonString || jsonString === 'undefined' || jsonString === 'null') {
    return fallback;
  }
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback;
    } else if (typeof fallback === 'object' && fallback !== null) {
      return (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : fallback;
    }
    return parsed !== undefined ? parsed : fallback;
  } catch (err) {
    console.error('Storage parse error:', err);
    return fallback;
  }
}

export function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (err) {
    console.error('Storage stringify error:', err);
    return null;
  }
}

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return safeParse(raw, fallback);
  } catch (err) {
    console.error(`Error reading key ${key} from localStorage:`, err);
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    const stringified = safeStringify(value);
    if (stringified === null) return false;
    localStorage.setItem(key, stringified);
    return true;
  } catch (err) {
    console.error(`Error writing key ${key} to localStorage:`, err);
    return false;
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(`Error removing key ${key} from localStorage:`, err);
    return false;
  }
}

export function hasKey(key) {
  try {
    return localStorage.getItem(key) !== null;
  } catch (err) {
    console.error(`Error checking key ${key} in localStorage:`, err);
    return false;
  }
}
