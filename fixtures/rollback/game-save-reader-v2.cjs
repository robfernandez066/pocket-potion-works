"use strict";

// Frozen compatibility boundary from the Task 8 gameplay save reader.
const SAVE_VERSION = 2;

function parseSave(raw) {
  try {
    const input = JSON.parse(raw);
    const sourceVersion = input && typeof input === "object" && Number.isFinite(Number(input.version)) ? Number(input.version) : null;
    if (sourceVersion !== null && sourceVersion > SAVE_VERSION) {
      return { state: null, recovered: false, blocked: true, reason: "unsupported-future-version", sourceVersion };
    }
    return { state: input, recovered: false, blocked: false, sourceVersion };
  } catch (_) {
    return { state: null, recovered: true, blocked: false };
  }
}

function shouldBlockSaveWrite(loadResult) {
  return loadResult?.blocked === true && loadResult.reason === "unsupported-future-version";
}

module.exports = Object.freeze({ SAVE_VERSION, parseSave, shouldBlockSaveWrite });
