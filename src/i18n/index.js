import { state } from '../state.js';
import ua from './ua.js';
import en from './en.js';

const dict = { ua, en };

// Simple key lookup against the active language.
export function t(key) {
  const d = dict[state.lang] || dict.ua;
  return key in d ? d[key] : key;
}

// Per-stage strings ({title, short, explain}) for the given stage index.
export function tStage(index) {
  const d = dict[state.lang] || dict.ua;
  return d.stages[index] || { title: '', short: '', explain: '' };
}
