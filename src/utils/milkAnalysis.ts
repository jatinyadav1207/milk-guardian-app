export interface SensorReadings {
  ph: number;
  tds: number;
  gas: number;
}

export interface Baseline {
  id: string;
  name: string;
  phMin: number;
  phMax: number;
  tdsMin: number;
  tdsMax: number;
  gasMax: number;
  createdAt: string;
}

export interface Contaminant {
  type: string;
  severity: "warning" | "danger";
  description: string;
}

export type Verdict = "pure" | "warning" | "adulterated";

export interface AnalysisResult {
  verdict: Verdict;
  score: number; // 0-100, 100 = pure
  contaminants: Contaminant[];
  summary: string;
}

export interface TestRecord {
  id: string;
  sampleId: string;
  readings: SensorReadings;
  result: AnalysisResult;
  timestamp: string;
  notes?: string;
}

export const DEFAULT_BASELINE: Baseline = {
  id: "default",
  name: "Standard Milk",
  phMin: 6.5,
  phMax: 6.8,
  tdsMin: 700,
  tdsMax: 1200,
  gasMax: 50,
  createdAt: new Date().toISOString(),
};

export function analyzeMilk(
  readings: SensorReadings,
  baseline: Baseline = DEFAULT_BASELINE
): AnalysisResult {
  const contaminants: Contaminant[] = [];
  const { ph, tds, gas } = readings;
  const phNormal = ph >= baseline.phMin && ph <= baseline.phMax;
  const tdsNormal = tds >= baseline.tdsMin && tds <= baseline.tdsMax;
  const gasNormal = gas <= baseline.gasMax;

  // Water dilution
  if (tds < baseline.tdsMin && phNormal) {
    contaminants.push({
      type: "Water Dilution",
      severity: "danger",
      description: `TDS ${tds} ppm is below normal (${baseline.tdsMin}–${baseline.tdsMax}). Milk may be diluted with water.`,
    });
  }

  // Soda / Detergent / Neutralizer
  if (ph > baseline.phMax) {
    contaminants.push({
      type: "Soda / Detergent",
      severity: "danger",
      description: `pH ${ph.toFixed(2)} is above normal (${baseline.phMax}). Possible neutralizer or detergent contamination.`,
    });
  }

  // Acid / Sour milk
  if (ph < baseline.phMin) {
    contaminants.push({
      type: "Acid / Sour Milk",
      severity: ph < 6.0 ? "danger" : "warning",
      description: `pH ${ph.toFixed(2)} is below normal (${baseline.phMin}). Milk may be sour or acidified.`,
    });
  }

  // Urea / Salt / Sugar
  if (tds > baseline.tdsMax && phNormal) {
    contaminants.push({
      type: "Urea / Salt / Sugar",
      severity: "danger",
      description: `TDS ${tds} ppm is above normal (${baseline.tdsMax}). Possible urea, salt, or sugar added.`,
    });
  }

  // Ammonia / Alcohol
  if (gas > baseline.gasMax) {
    contaminants.push({
      type: "Ammonia / Alcohol",
      severity: gas > 100 ? "danger" : "warning",
      description: `Gas sensor reading ${gas} exceeds threshold (${baseline.gasMax}). Ammonia or alcohol detected.`,
    });
  }

  // Score calculation
  let score = 100;
  const phDeviation = phNormal ? 0 : ph < baseline.phMin ? baseline.phMin - ph : ph - baseline.phMax;
  const tdsDeviation = tdsNormal ? 0 : tds < baseline.tdsMin ? (baseline.tdsMin - tds) / baseline.tdsMin : (tds - baseline.tdsMax) / baseline.tdsMax;
  const gasDeviation = gasNormal ? 0 : (gas - baseline.gasMax) / baseline.gasMax;

  score -= Math.min(phDeviation * 30, 40);
  score -= Math.min(tdsDeviation * 40, 40);
  score -= Math.min(gasDeviation * 20, 30);
  score = Math.max(0, Math.round(score));

  let verdict: Verdict = "pure";
  let summary = "Milk quality is excellent. All parameters within normal range.";

  if (contaminants.length > 0) {
    const hasDanger = contaminants.some((c) => c.severity === "danger");
    if (hasDanger || contaminants.length >= 2) {
      verdict = "adulterated";
      summary = `Adulteration detected: ${contaminants.map((c) => c.type).join(", ")}.`;
    } else {
      verdict = "warning";
      summary = `Warning: ${contaminants[0].type} — ${contaminants[0].description}`;
    }
  }

  return { verdict, score, contaminants, summary };
}

export function getVerdictColor(verdict: Verdict): string {
  switch (verdict) {
    case "pure": return "text-milkguard-success";
    case "warning": return "text-milkguard-warning";
    case "adulterated": return "text-milkguard-danger";
  }
}

export function getVerdictBg(verdict: Verdict): string {
  switch (verdict) {
    case "pure": return "bg-milkguard-success/10";
    case "warning": return "bg-milkguard-warning/10";
    case "adulterated": return "bg-milkguard-danger/10";
  }
}

export function getVerdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case "pure": return "Pure ✓";
    case "warning": return "Warning ⚠";
    case "adulterated": return "Adulterated ✗";
  }
}

export function getSensorStatus(value: number, min: number, max: number): "normal" | "warning" | "danger" {
  if (value >= min && value <= max) return "normal";
  const deviation = value < min ? (min - value) / min : (value - max) / max;
  return deviation > 0.15 ? "danger" : "warning";
}

export function generateSampleId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "MG-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
