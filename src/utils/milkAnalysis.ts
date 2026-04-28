export interface SensorReadings {
  ph: number;
  tds: number;
  gas: number; // MQ-135 raw ESP32 analog value (0-4095)
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
  sensor: "pH" | "TDS" | "MQ-135";
}

export type Verdict = "Pure" | "Spoiled" | "Adulterated" | "Diluted";

export interface AnalysisResult {
  verdict: Verdict;
  score: number; // 0-100, 100 = pure
  contaminants: Contaminant[];
  summary: string;
  sensorStatuses: {
    phStatus: string;
    tdsStatus: string;
    gasStatus: string;
  };
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
  tdsMin: 2000,
  tdsMax: 5500,
  gasMax: 800,
  createdAt: new Date().toISOString(),
};

/**
 * Analyze milk quality based on three sensor inputs
 * pH: 6.5-6.8 (pure range)
 * TDS: 2000-5500 ppm (pure range)
 * MQ-135: 0-800 (fresh), 800-1200 (mild spoilage), >1200 (severely spoiled)
 */
export function analyzeMilk(
  readings: SensorReadings,
  baseline: Baseline = DEFAULT_BASELINE
): AnalysisResult {
  const contaminants: Contaminant[] = [];
  const { ph, tds, gas } = readings;

  // pH Analysis
  let phStatus = "Normal";
  if (ph < 6.5) {
    contaminants.push({
      type: "Spoiled (High Acidity)",
      severity: "danger",
      description: `pH ${ph.toFixed(2)} is below 6.5. Milk is spoiled due to high acidity.`,
      sensor: "pH",
    });
    phStatus = "Spoiled (High Acidity)";
  } else if (ph > 6.8) {
    contaminants.push({
      type: "Adulterated (Alkaline/Soap)",
      severity: "danger",
      description: `pH ${ph.toFixed(2)} is above 6.8. Milk is adulterated with alkaline substances or soap.`,
      sensor: "pH",
    });
    phStatus = "Adulterated (Alkaline/Soap)";
  } else {
    phStatus = "Pure";
  }

  // TDS Analysis
  let tdsStatus = "Normal";
  if (tds < 2000) {
    contaminants.push({
      type: "Diluted (Water Added)",
      severity: "danger",
      description: `TDS ${tds} ppm is below 2000. Milk has been diluted with water.`,
      sensor: "TDS",
    });
    tdsStatus = "Diluted (Water Added)";
  } else if (tds > 5500) {
    contaminants.push({
      type: "Adulterated (Added Solids/Salts)",
      severity: "danger",
      description: `TDS ${tds} ppm is above 5500. Milk contains added solids or salts.`,
      sensor: "TDS",
    });
    tdsStatus = "Adulterated (Added Solids/Salts)";
  } else {
    tdsStatus = "Pure";
  }

  // MQ-135 Gas Sensor Analysis
  let gasStatus = "Fresh";
  if (gas < 800) {
    gasStatus = "Fresh";
  } else if (gas >= 800 && gas <= 1200) {
    contaminants.push({
      type: "Mild Spoilage",
      severity: "warning",
      description: `MQ-135 reading ${gas} indicates mild spoilage. Milk should be used soon.`,
      sensor: "MQ-135",
    });
    gasStatus = "Mild Spoilage";
  } else if (gas > 1200) {
    contaminants.push({
      type: "Severely Spoiled / Urea Detected",
      severity: "danger",
      description: `MQ-135 reading ${gas} exceeds 1200. Milk is severely spoiled or contains urea.`,
      sensor: "MQ-135",
    });
    gasStatus = "Severely Spoiled / Urea Detected";
  }

  // Calculate score based on deviations
  let score = 100;

  // pH score impact
  if (ph < 6.5) {
    const deviation = 6.5 - ph;
    score -= Math.min(deviation * 20, 35);
  } else if (ph > 6.8) {
    const deviation = ph - 6.8;
    score -= Math.min(deviation * 20, 35);
  }

  // TDS score impact
  if (tds < 2000) {
    const deviation = (2000 - tds) / 2000;
    score -= Math.min(deviation * 40, 35);
  } else if (tds > 5500) {
    const deviation = (tds - 5500) / 5500;
    score -= Math.min(deviation * 40, 35);
  }

  // Gas sensor score impact
  if (gas >= 800 && gas <= 1200) {
    score -= 15;
  } else if (gas > 1200) {
    const deviation = (gas - 1200) / 1200;
    score -= Math.min(deviation * 30, 35);
  }

  score = Math.max(0, Math.round(score));

  // Determine final verdict based on worst-case scenario
  let verdict: Verdict = "Pure";
  let summary = "Milk quality is excellent. All parameters within normal range.";

  if (contaminants.length > 0) {
    // Prioritize Adulterated and Spoiled over other issues
    const hasAdulterated = contaminants.some(
      (c) =>
        c.type.includes("Adulterated") ||
        c.type.includes("Spoiled") ||
        c.type.includes("Diluted")
    );

    if (hasAdulterated) {
      // Check for different types of adulterations
      const hasSpoiled = contaminants.some((c) =>
        c.type.includes("Spoiled") || c.type.includes("High Acidity")
      );
      const hasDiluted = contaminants.some((c) =>
        c.type.includes("Diluted")
      );

      if (hasSpoiled) {
        verdict = "Spoiled";
      } else if (hasDiluted) {
        verdict = "Diluted";
      } else {
        verdict = "Adulterated";
      }

      const types = contaminants.map((c) => c.type).join(", ");
      summary = `${verdict}: ${types}`;
    } else if (contaminants.some((c) => c.severity === "warning")) {
      verdict = "Adulterated";
      summary = `Warning: ${contaminants[0].description}`;
    }
  }

  return {
    verdict,
    score,
    contaminants,
    summary,
    sensorStatuses: {
      phStatus,
      tdsStatus,
      gasStatus,
    },
  };
}

export function getVerdictColor(verdict: Verdict): string {
  switch (verdict) {
    case "Pure":
      return "text-green-600";
    case "Adulterated":
      return "text-red-600";
    case "Spoiled":
      return "text-red-700";
    case "Diluted":
      return "text-orange-600";
    default:
      return "text-gray-600";
  }
}

export function getVerdictBg(verdict: Verdict): string {
  switch (verdict) {
    case "Pure":
      return "bg-green-50";
    case "Adulterated":
      return "bg-red-50";
    case "Spoiled":
      return "bg-red-100";
    case "Diluted":
      return "bg-orange-50";
    default:
      return "bg-gray-50";
  }
}

export function getVerdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case "Pure":
      return "Pure ✓";
    case "Adulterated":
      return "Adulterated ✗";
    case "Spoiled":
      return "Spoiled ✗";
    case "Diluted":
      return "Diluted ✗";
    default:
      return "Unknown";
  }
}

export function getSensorStatus(
  value: number,
  min: number,
  max: number
): "normal" | "warning" | "danger" {
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
