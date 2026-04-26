import { useMilkGuard } from "@/contexts/MilkGuardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Beaker,
  Droplets,
  Wind,
  FlaskConical,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Play,
  RotateCcw,
  Zap,
} from "lucide-react";
import {
  getSensorStatus,
  getVerdictLabel,
  getVerdictColor,
  getVerdictBg,
  analyzeMilk,
} from "@/utils/milkAnalysis";
import { BluetoothConnect } from "@/components/BluetoothConnect";

export default function Dashboard() {
  const {
    isDeviceConnected,
    currentReadings,
    tests,
    activeBaseline,
    simulateReadings,
    runTest,
    clearReadings,
  } = useMilkGuard();

  const totalTests = tests.length;
  const pureCount = tests.filter((t) => t.result.verdict === "pure").length;
  const adulteratedCount = tests.filter((t) => t.result.verdict === "adulterated").length;
  const riskRate = totalTests > 0 ? Math.round(((adulteratedCount) / totalTests) * 100) : 0;

  const analysis = currentReadings ? analyzeMilk(currentReadings, activeBaseline) : null;

  const handleRunTest = () => {
    if (!currentReadings) {
      simulateReadings();
      return;
    }
    runTest();
  };

  const phStatus = currentReadings
    ? getSensorStatus(currentReadings.ph, activeBaseline.phMin, activeBaseline.phMax)
    : "normal";
  const tdsStatus = currentReadings
    ? getSensorStatus(currentReadings.tds, activeBaseline.tdsMin, activeBaseline.tdsMax)
    : "normal";
  const gasStatus = currentReadings
    ? getSensorStatus(currentReadings.gas, 0, activeBaseline.gasMax)
    : "normal";

  const statusColor = (s: string) =>
    s === "normal" ? "text-milkguard-success" : s === "warning" ? "text-milkguard-warning" : "text-milkguard-danger";
  const statusBg = (s: string) =>
    s === "normal" ? "bg-milkguard-success" : s === "warning" ? "bg-milkguard-warning" : "bg-milkguard-danger";

  const phPercent = currentReadings
    ? Math.min(100, Math.max(0, ((currentReadings.ph - 4) / (10 - 4)) * 100))
    : 0;
  const tdsPercent = currentReadings
    ? Math.min(100, Math.max(0, (currentReadings.tds / 2000) * 100))
    : 0;
  const gasPercent = currentReadings
    ? Math.min(100, Math.max(0, (currentReadings.gas / 150) * 100))
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Monitor milk quality in real-time
          </p>
        </div>
        <div className="flex gap-2">
          {currentReadings && (
            <Button variant="outline" size="sm" onClick={clearReadings}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
          <Button size="sm" onClick={simulateReadings} variant="outline">
            <Zap className="h-4 w-4" />
            Simulate
          </Button>
          <Button size="sm" onClick={handleRunTest} disabled={!currentReadings}>
            <Play className="h-4 w-4" />
            Run Test
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Tests", value: totalTests, icon: FlaskConical, color: "text-primary" },
          { label: "Pure Samples", value: pureCount, icon: ShieldCheck, color: "text-milkguard-success" },
          { label: "Adulterated", value: adulteratedCount, icon: ShieldAlert, color: "text-milkguard-danger" },
          { label: "Risk Rate", value: `${riskRate}%`, icon: Activity, color: riskRate > 30 ? "text-milkguard-danger" : "text-milkguard-success" },
        ].map((stat) => (
          <Card key={stat.label} className="animate-slide-up">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Verdict Banner */}
      {analysis && currentReadings && (
        <Card className={`animate-scale-in border-2 ${
          analysis.verdict === "pure" ? "border-milkguard-success/30" :
          analysis.verdict === "warning" ? "border-milkguard-warning/30" :
          "border-milkguard-danger/30"
        }`}>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${getVerdictBg(analysis.verdict)}`}>
                {analysis.verdict === "pure" ? (
                  <ShieldCheck className={`h-7 w-7 ${getVerdictColor(analysis.verdict)}`} />
                ) : analysis.verdict === "warning" ? (
                  <AlertTriangle className={`h-7 w-7 ${getVerdictColor(analysis.verdict)}`} />
                ) : (
                  <ShieldAlert className={`h-7 w-7 ${getVerdictColor(analysis.verdict)}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-lg font-bold ${getVerdictColor(analysis.verdict)}`}>
                    {getVerdictLabel(analysis.verdict)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Score: {analysis.score}/100
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{analysis.summary}</p>
              </div>
            </div>
            {analysis.contaminants.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {analysis.contaminants.map((c, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className={
                      c.severity === "danger"
                        ? "border-milkguard-danger/40 text-milkguard-danger"
                        : "border-milkguard-warning/40 text-milkguard-warning"
                    }
                  >
                    {c.type}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sensor Readings */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* pH */}
        <Card className="animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <Beaker className="h-4 w-4 text-primary" />
              </div>
              pH Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentReadings ? (
              <>
                <p className={`text-3xl font-bold ${statusColor(phStatus)}`}>
                  {currentReadings.ph.toFixed(2)}
                </p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>4.0</span>
                    <span className="font-medium">Normal: {activeBaseline.phMin}–{activeBaseline.phMax}</span>
                    <span>10.0</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${statusBg(phStatus)}`} style={{ width: `${phPercent}%` }} />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No data</p>
            )}
          </CardContent>
        </Card>

        {/* TDS */}
        <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <Droplets className="h-4 w-4 text-primary" />
              </div>
              TDS / Conductivity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentReadings ? (
              <>
                <p className={`text-3xl font-bold ${statusColor(tdsStatus)}`}>
                  {currentReadings.tds} <span className="text-sm font-normal text-muted-foreground">ppm</span>
                </p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span className="font-medium">Normal: {activeBaseline.tdsMin}–{activeBaseline.tdsMax}</span>
                    <span>2000</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${statusBg(tdsStatus)}`} style={{ width: `${tdsPercent}%` }} />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Gas */}
        <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <Wind className="h-4 w-4 text-primary" />
              </div>
              Gas Sensor (MQ-135)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentReadings ? (
              <>
                <p className={`text-3xl font-bold ${statusColor(gasStatus)}`}>
                  {currentReadings.gas} <span className="text-sm font-normal text-muted-foreground">units</span>
                </p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span className="font-medium">Threshold: {activeBaseline.gasMax}</span>
                    <span>150</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${statusBg(gasStatus)}`} style={{ width: `${gasPercent}%` }} />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* No Data Banner */}
      {!currentReadings && (
        <Card className="border-dashed animate-fade-in">
          <CardContent className="p-8 text-center">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-accent mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No Sensor Data Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your ESP32 device or use the simulate button to preview the dashboard.
            </p>
            <Button onClick={simulateReadings} size="sm">
              <Zap className="h-4 w-4" />
              Simulate Readings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Tests */}
      {tests.length > 0 && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base">Recent Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tests.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-2 w-2 rounded-full ${
                    t.result.verdict === "pure" ? "bg-milkguard-success" :
                    t.result.verdict === "warning" ? "bg-milkguard-warning" :
                    "bg-milkguard-danger"
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.sampleId}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs shrink-0 ${
                    t.result.verdict === "pure"
                      ? "border-milkguard-success/40 text-milkguard-success"
                      : t.result.verdict === "warning"
                      ? "border-milkguard-warning/40 text-milkguard-warning"
                      : "border-milkguard-danger/40 text-milkguard-danger"
                  }`}
                >
                  {getVerdictLabel(t.result.verdict)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
