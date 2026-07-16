const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const childProcess = require("node:child_process");

const ROOT = __dirname;
const BUDGET_FILE = "release-budgets.json";
const PROVENANCE_FILE = "ASSET_PROVENANCE.md";
const TEXT_EXTENSIONS = new Set([".html", ".css", ".js", ".json", ".webmanifest", ".svg"]);
const MUSIC_PATHS = ["assets/audio/music1.mp3", "assets/audio/music2.mp3", "assets/audio/music3.mp3"];
const TARGET_BITRATES_KBPS = [192, 160, 128];
const CATEGORY_NAMES = [
  "root runtime code/markup",
  "sound effects",
  "background music",
  "ingredient images",
  "potion images",
  "villager images",
  "miscellaneous images",
  "other files",
];

const MPEG_VERSIONS = { 3: "MPEG-1", 2: "MPEG-2", 0: "MPEG-2.5" };
const MPEG_LAYERS = { 3: "Layer I", 2: "Layer II", 1: "Layer III" };
const CHANNEL_MODES = ["Stereo", "Joint stereo", "Dual channel", "Mono"];
const BITRATES = {
  "MPEG-1/Layer I": [null, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, null],
  "MPEG-1/Layer II": [null, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, null],
  "MPEG-1/Layer III": [null, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, null],
  "MPEG-2/Layer I": [null, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, null],
  "MPEG-2/Layer II": [null, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, null],
  "MPEG-2/Layer III": [null, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, null],
  "MPEG-2.5/Layer I": [null, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, null],
  "MPEG-2.5/Layer II": [null, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, null],
  "MPEG-2.5/Layer III": [null, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, null],
};
const SAMPLE_RATES = {
  "MPEG-1": [44100, 48000, 32000],
  "MPEG-2": [22050, 24000, 16000],
  "MPEG-2.5": [11025, 12000, 8000],
};

function absolutePath(relativePath) {
  assert.equal(typeof relativePath, "string");
  assert.ok(!path.isAbsolute(relativePath), `inventory path must be relative: ${relativePath}`);
  assert.ok(!relativePath.split("/").includes(".."), `inventory path escapes the project: ${relativePath}`);
  return path.join(ROOT, ...relativePath.split("/"));
}

function normalizedReleaseBytes(relativePath) {
  const extension = path.extname(relativePath).toLowerCase();
  const filePath = absolutePath(relativePath);
  if (!TEXT_EXTENSIONS.has(extension)) return fs.statSync(filePath).size;
  return Buffer.byteLength(fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n"));
}

function round(value, digits = 6) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => typeof left === "number" ? left - right : left.localeCompare(right));
}

function categoryMatches(relativePath) {
  const matches = [];
  if (!relativePath.includes("/")) matches.push("root runtime code/markup");
  if (relativePath.startsWith("assets/audio/") && !MUSIC_PATHS.includes(relativePath)) matches.push("sound effects");
  if (MUSIC_PATHS.includes(relativePath)) matches.push("background music");
  if (relativePath.startsWith("assets/images/ingredients/")) matches.push("ingredient images");
  if (relativePath.startsWith("assets/images/potions/")) matches.push("potion images");
  if (relativePath.startsWith("assets/images/villagers/")) matches.push("villager images");
  if (relativePath.startsWith("assets/images/misc/")) matches.push("miscellaneous images");
  if (!matches.length) matches.push("other files");
  return matches;
}

function parseProvenance() {
  const source = fs.readFileSync(absolutePath(PROVENANCE_FILE), "utf8");
  const entries = MUSIC_PATHS.map(relativePath => {
    const basename = path.basename(relativePath);
    const line = source.split(/\r?\n/).find(candidate => /^\|/.test(candidate) && candidate.includes(`\`${basename}\``));
    assert.ok(line, `provenance is missing ${relativePath}`);
    const cells = line.split("|").map(cell => cell.trim());
    assert.ok(cells.length >= 7 && cells[1].replace(/`/g, "") === basename, `provenance row is malformed for ${relativePath}`);
    const certificateSha256 = cells[6].replace(/`/g, "");
    assert.match(certificateSha256, /^[A-F0-9]{64}$/i, `certificate hash is malformed for ${relativePath}`);
    return {
      runtimeFile: relativePath,
      source: cells[2],
      pixabayId: cells[3].replace(/`/g, ""),
      statedDuration: cells[4],
      certificateDownloadUtc: cells[5],
      certificateSha256: certificateSha256.toUpperCase(),
    };
  });
  assert.equal(entries.length, 3);
  return { document: PROVENANCE_FILE, entries };
}

function parseSynchsafe(buffer, offset) {
  return ((buffer[offset] & 0x7f) << 21) | ((buffer[offset + 1] & 0x7f) << 14) | ((buffer[offset + 2] & 0x7f) << 7) | (buffer[offset + 3] & 0x7f);
}

function parseMp3(relativePath) {
  const filePath = absolutePath(relativePath);
  const buffer = fs.readFileSync(filePath);
  const fileBytes = buffer.length;
  let cursor = 0;
  let metadataBytes = 0;
  const metadataSegments = [];

  while (buffer.subarray(cursor, cursor + 3).toString("ascii") === "ID3") {
    assert.ok(cursor + 10 <= buffer.length, `${relativePath} has a truncated ID3v2 header`);
    const flags = buffer[cursor + 5];
    const tagBytes = 10 + parseSynchsafe(buffer, cursor + 6) + (flags & 0x10 ? 10 : 0);
    assert.ok(cursor + tagBytes <= buffer.length, `${relativePath} has a truncated ID3v2 tag`);
    metadataSegments.push({ type: "ID3v2", start: cursor, end: cursor + tagBytes, bytes: tagBytes });
    metadataBytes += tagBytes;
    cursor += tagBytes;
  }
  const audioStartOffset = cursor;
  const frames = [];

  while (cursor + 4 <= buffer.length) {
    const first = buffer[cursor];
    const second = buffer[cursor + 1];
    if (first !== 0xff || (second & 0xe0) !== 0xe0) break;
    const versionBits = (second >> 3) & 0x03;
    const layerBits = (second >> 1) & 0x03;
    const version = MPEG_VERSIONS[versionBits];
    const layer = MPEG_LAYERS[layerBits];
    const bitrateIndex = buffer[cursor + 2] >> 4;
    const sampleRateIndex = (buffer[cursor + 2] >> 2) & 0x03;
    const padding = (buffer[cursor + 2] >> 1) & 0x01;
    const channelModeIndex = buffer[cursor + 3] >> 6;
    assert.ok(version && layer, `${relativePath} has an unsupported MPEG version or layer at byte ${cursor}`);
    const bitrate = BITRATES[`${version}/${layer}`]?.[bitrateIndex];
    const sampleRate = SAMPLE_RATES[version]?.[sampleRateIndex];
    assert.ok(bitrate && sampleRate && channelModeIndex < CHANNEL_MODES.length, `${relativePath} has an unsupported MPEG frame at byte ${cursor}`);
    const coefficient = layer === "Layer I" ? 12 : (layer === "Layer III" && version !== "MPEG-1" ? 72 : 144);
    const frameLength = Math.floor(coefficient * bitrate * 1000 / sampleRate) + padding * (layer === "Layer I" ? 4 : 1);
    const samplesPerFrame = layer === "Layer I" ? 384 : (layer === "Layer III" && version !== "MPEG-1" ? 576 : 1152);
    assert.ok(frameLength >= 4 && cursor + frameLength <= buffer.length, `${relativePath} has an incomplete MPEG frame at byte ${cursor}`);
    frames.push({
      start: cursor,
      end: cursor + frameLength,
      bytes: frameLength,
      bitrateKbps: bitrate,
      sampleRateHz: sampleRate,
      samplesPerFrame,
      version,
      layer,
      channelMode: CHANNEL_MODES[channelModeIndex],
    });
    cursor += frameLength;
  }

  if (cursor < buffer.length) {
    const trailing = buffer.subarray(cursor);
    if (trailing.length >= 128 && trailing.subarray(0, 3).toString("ascii") === "TAG" && trailing.length === 128) {
      metadataSegments.push({ type: "ID3v1", start: cursor, end: buffer.length, bytes: trailing.length });
      metadataBytes += trailing.length;
      cursor = buffer.length;
    }
  }

  assert.ok(frames.length > 0, `${relativePath} has no supported MPEG audio frames`);
  assert.equal(cursor, buffer.length, `${relativePath} has unparsed bytes after its MPEG frames`);
  assert.equal(frames[0].start, audioStartOffset);
  assert.equal(frames.at(-1).end, buffer.length - metadataSegments.filter(segment => segment.type === "ID3v1").reduce((sum, segment) => sum + segment.bytes, 0));
  const audioPayloadBytes = frames.reduce((sum, frame) => sum + frame.bytes, 0);
  assert.equal(metadataBytes + audioPayloadBytes, fileBytes, `${relativePath} byte bounds do not reconcile`);
  const durations = frames.map(frame => frame.samplesPerFrame / frame.sampleRateHz);
  const durationSeconds = durations.reduce((sum, duration) => sum + duration, 0);
  const bitrates = frames.map(frame => frame.bitrateKbps);
  assert.ok(Number.isFinite(durationSeconds) && durationSeconds > 0, `${relativePath} duration must be finite and positive`);
  assert.ok(frames.every(frame => frame.start >= audioStartOffset && frame.end <= fileBytes && frame.end > frame.start), `${relativePath} frame bounds are incomplete`);

  return {
    file: relativePath,
    fileBytes,
    audioStartOffset,
    audioEndOffset: frames.at(-1).end,
    audioPayloadBytes,
    metadataNonAudioBytes: metadataBytes,
    metadataSegments,
    durationSeconds: round(durationSeconds),
    detected: {
      mpegVersion: uniqueSorted(frames.map(frame => frame.version)),
      layer: uniqueSorted(frames.map(frame => frame.layer)),
      sampleRateHz: uniqueSorted(frames.map(frame => frame.sampleRateHz)),
      channelMode: uniqueSorted(frames.map(frame => frame.channelMode)),
    },
    frameCount: frames.length,
    minimumEffectiveBitrateKbps: Math.min(...bitrates),
    maximumEffectiveBitrateKbps: Math.max(...bitrates),
    averageEffectiveBitrateKbps: round(bitrates.reduce((sum, bitrate) => sum + bitrate, 0) / bitrates.length),
    frameBitrateMode: new Set(bitrates).size === 1 ? "constant bitrate" : "variable bitrate",
    completeFrameBounds: true,
  };
}

function readAutomatedReleaseTotal() {
  const result = childProcess.spawnSync(process.execPath, ["release-check.cjs", "--automated-only"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, `release-check.cjs --automated-only failed: ${result.stderr || result.stdout}`);
  const match = `${result.stdout}\n${result.stderr}`.match(/Automated release checks passed: \d+ runtime files, \d+ release documents, (\d+)\/(\d+) runtime bytes\./);
  assert.ok(match, "automated release result did not report its runtime total");
  return { actualTotalBytes: Number(match[1]), budgetBytes: Number(match[2]) };
}

function buildInventory(budget) {
  const files = Object.entries(budget.files).map(([file, cap]) => {
    const matches = categoryMatches(file);
    assert.equal(matches.length, 1, `${file} must be assigned to exactly one category`);
    assert.ok(!file.startsWith("assets/source/"), `${file} source artwork must be excluded from the runtime inventory`);
    const filePath = absolutePath(file);
    assert.ok(fs.existsSync(filePath) && fs.statSync(filePath).isFile(), `inventory path is missing: ${file}`);
    const actualBytes = normalizedReleaseBytes(file);
    assert.ok(actualBytes <= cap, `${file} is ${actualBytes} bytes, above its ${cap}-byte cap`);
    return {
      file,
      category: matches[0],
      actualBytes,
      capBytes: cap,
      capUtilizationPercent: round(actualBytes / cap * 100),
    };
  });
  assert.equal(files.length, Object.keys(budget.files).length);
  const actualTotalBytes = files.reduce((sum, file) => sum + file.actualBytes, 0);
  const capTotalBytes = files.reduce((sum, file) => sum + file.capBytes, 0);
  const categories = CATEGORY_NAMES.map(category => {
    const members = files.filter(file => file.category === category);
    const actualBytes = members.reduce((sum, file) => sum + file.actualBytes, 0);
    const capBytes = members.reduce((sum, file) => sum + file.capBytes, 0);
    return {
      category,
      fileCount: members.length,
      actualBytes,
      capBytes,
      percentOfActualRuntime: round(actualBytes / actualTotalBytes * 100),
      capUtilizationPercent: capBytes === 0 && actualBytes === 0 ? 0 : round(actualBytes / capBytes * 100),
    };
  });
  assert.equal(files.reduce((sum, file) => sum + file.actualBytes, 0), categories.reduce((sum, category) => sum + category.actualBytes, 0));
  assert.equal(files.reduce((sum, file) => sum + file.capBytes, 0), categories.reduce((sum, category) => sum + category.capBytes, 0));
  assert.equal(categories.reduce((sum, category) => sum + category.fileCount, 0), files.length);
  assert.ok(categories.every(category => Number.isFinite(category.percentOfActualRuntime) && Number.isFinite(category.capUtilizationPercent)), "category percentage and utilization fields must be finite numbers");
  assert.ok(actualTotalBytes <= budget.totalRuntimeBytes, `runtime total is ${actualTotalBytes} bytes, above its ${budget.totalRuntimeBytes}-byte budget`);
  return { files, categories, actualTotalBytes, capTotalBytes };
}

function projectTrack(track, targetKbps, currentRuntimeBytes) {
  const estimatedEncodedAudioPayloadBytes = Math.round(track.durationSeconds * targetKbps * 1000 / 8);
  const projectedFinalFileBytes = track.metadataNonAudioBytes + estimatedEncodedAudioPayloadBytes;
  const recoveredBytes = track.fileBytes - projectedFinalFileBytes;
  const resultingTotalRuntimeBytes = currentRuntimeBytes - track.fileBytes + projectedFinalFileBytes;
  return {
    targetKbps,
    estimatedEncodedAudioPayloadBytes,
    preservedMetadataNonAudioBytes: track.metadataNonAudioBytes,
    projectedFinalFileBytes,
    recoveredBytes,
    recoveredPercentOfCurrentFile: round(recoveredBytes / track.fileBytes * 100),
    resultingTotalRuntimeBytes,
  };
}

function buildProjections(tracks, inventory, budget) {
  const currentRuntimeBytes = inventory.actualTotalBytes;
  const currentMusicBytes = tracks.reduce((sum, track) => sum + track.fileBytes, 0);
  const trackProjections = tracks.map(track => ({
    file: track.file,
    projections: TARGET_BITRATES_KBPS.map(target => {
      const projection = projectTrack(track, target, currentRuntimeBytes);
      projection.file = track.file;
      projection.resultingHeadroomBytes = budget.totalRuntimeBytes - projection.resultingTotalRuntimeBytes;
      projection.budgetPasses = projection.resultingTotalRuntimeBytes <= budget.totalRuntimeBytes;
      return projection;
    }),
  }));
  const combined = TARGET_BITRATES_KBPS.map(targetKbps => {
    const perTrack = tracks.map(track => projectTrack(track, targetKbps, currentRuntimeBytes));
    const projectedMusicBytes = perTrack.reduce((sum, projection) => sum + projection.projectedFinalFileBytes, 0);
    const recoveredBytes = currentMusicBytes - projectedMusicBytes;
    const resultingTotalRuntimeBytes = currentRuntimeBytes - currentMusicBytes + projectedMusicBytes;
    const resultingHeadroomBytes = budget.totalRuntimeBytes - resultingTotalRuntimeBytes;
    return {
      targetKbps,
      tracks: perTrack.map((projection, index) => ({ file: tracks[index].file, projectedFinalFileBytes: projection.projectedFinalFileBytes })),
      projectedMusicBytes,
      recoveredBytes,
      recoveredPercentOfCurrentMusic: round(recoveredBytes / currentMusicBytes * 100),
      resultingTotalRuntimeBytes,
      resultingHeadroomBytes,
      budgetPasses: resultingTotalRuntimeBytes <= budget.totalRuntimeBytes,
      meaningfulHeadroomInThisAudit: recoveredBytes >= 3000000 && resultingHeadroomBytes >= 2000000,
    };
  });
  const ranking = combined.filter(candidate => candidate.meaningfulHeadroomInThisAudit).sort((left, right) => right.targetKbps - left.targetKbps || right.resultingHeadroomBytes - left.resultingHeadroomBytes).map((candidate, index) => ({
    rank: index + 1,
    targetKbps: candidate.targetKbps,
    recoveredBytes: candidate.recoveredBytes,
    resultingHeadroomBytes: candidate.resultingHeadroomBytes,
    budgetPasses: candidate.budgetPasses,
  }));
  return {
    formula: "estimatedEncodedAudioPayloadBytes = round(durationSeconds * targetKbps * 1000 / 8); projectedFinalFileBytes = preservedMetadataNonAudioBytes + estimatedEncodedAudioPayloadBytes",
    currentMusicBytes,
    tracks: trackProjections,
    combined,
    thresholds: {
      requiredRecoveredBytes: 3000000,
      requiredRemainingHeadroomBytes: 2000000,
      rankingOrder: ["highest target bitrate", "most remaining headroom"],
    },
    ranking,
    leastAggressivePassingTargetKbps: ranking[0]?.targetKbps ?? null,
    ownerListeningComparisonRequired: true,
  };
}

function buildReport() {
  const budget = JSON.parse(fs.readFileSync(absolutePath(BUDGET_FILE), "utf8"));
  assert.ok(Number.isInteger(budget.totalRuntimeBytes) && budget.totalRuntimeBytes > 0);
  const inventory = buildInventory(budget);
  const releaseResult = readAutomatedReleaseTotal();
  assert.equal(releaseResult.budgetBytes, budget.totalRuntimeBytes);
  assert.equal(releaseResult.actualTotalBytes, inventory.actualTotalBytes, "audit total must match automated release result");
  const tracks = MUSIC_PATHS.map(parseMp3);
  assert.equal(tracks.length, 3);
  assert.deepEqual(tracks.map(track => track.file), MUSIC_PATHS);
  const trackBytes = tracks.reduce((sum, track) => sum + track.fileBytes, 0);
  assert.equal(trackBytes, inventory.categories.find(category => category.category === "background music").actualBytes);
  const report = {
    schemaVersion: 1,
    purpose: "development-only runtime and background-music budget evidence; no candidate encodes were produced",
    budget: {
      totalRuntimeBytes: budget.totalRuntimeBytes,
      actualRuntimeBytes: inventory.actualTotalBytes,
      remainingHeadroomBytes: budget.totalRuntimeBytes - inventory.actualTotalBytes,
      capTotalBytes: inventory.capTotalBytes,
      automatedReleaseResult: releaseResult,
    },
    inventory: {
      convention: "text files normalize CRLF to LF before byte counting; binary assets use raw file bytes",
      files: inventory.files,
      categories: inventory.categories,
      assertions: {
        everyInventoryPathExists: true,
        exactlyOneCategoryPerFile: true,
        categoryTotalsReconcile: true,
        allCapsPass: true,
        sourceArtworkExcluded: Object.keys(budget.files).every(file => !file.startsWith("assets/source/")),
        actualTotalMatchesAutomatedRelease: true,
      },
    },
    musicProvenance: parseProvenance(),
    mp3Measurements: tracks,
    projections: buildProjections(tracks, inventory, budget),
  };
  return report;
}

const report = buildReport();
const fullReportText = `${JSON.stringify(report, null, 2)}\n`;
const fullReportSha256 = crypto.createHash("sha256").update(fullReportText, "utf8").digest("hex");
if (process.argv.includes("--check")) {
  process.stdout.write(`${JSON.stringify({ mode: "check", fullReportSha256 })}\n`);
} else {
  process.stdout.write(fullReportText);
}
