import { useState } from "react";
import { useMilkGuard } from "@/contexts/MilkGuardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Trash2, FlaskConical, Download } from "lucide-react";
import { getVerdictLabel, getVerdictColor } from "@/utils/milkAnalysis";
import { toast } from "sonner";

export default function TestHistory() {
  const { tests, deleteTest, clearAllTests } = useMilkGuard();
  const [search, setSearch] = useState("");

  const filtered = tests.filter(
    (t) =>
      t.sampleId.toLowerCase().includes(search.toLowerCase()) ||
      t.result.verdict.includes(search.toLowerCase()) ||
      t.result.contaminants.some((c) =>
        c.type.toLowerCase().includes(search.toLowerCase())
      )
  );

  const exportCsv = () => {
    if (tests.length === 0) return;
    const rows = [
      ["Sample ID", "Timestamp", "pH", "TDS (ppm)", "Gas", "Verdict", "Score", "Contaminants", "Summary"],
      ...tests.map((t) => [
        t.sampleId,
        t.timestamp,
        t.readings.ph.toFixed(2),
        String(t.readings.tds),
        String(t.readings.gas),
        t.result.verdict,
        String(t.result.score),
        t.result.contaminants.map((c) => c.type).join("; "),
        t.result.summary.replace(/\s+/g, " "),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `milkguard-tests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported CSV");
  };

  const handleClear = () => {
    if (!confirm(`Delete all ${tests.length} tests?`)) return;
    clearAllTests();
    toast.success("History cleared");
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Test History</h1>
          <p className="text-sm text-muted-foreground">View and search all past milk quality tests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={tests.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={tests.length === 0}
            className="text-milkguard-danger hover:text-milkguard-danger"
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by sample ID, verdict, or contaminant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed animate-fade-in">
          <CardContent className="p-8 text-center">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-accent mb-4">
              <FlaskConical className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              {tests.length === 0 ? "No Tests Yet" : "No Results Found"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {tests.length === 0
                ? "Run your first test from the Dashboard to see results here."
                : "Try a different search term."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((t) => (
              <Card key={t.id} className="animate-slide-up">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{t.sampleId}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
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
                  <div className="flex gap-3 text-xs text-muted-foreground mb-2">
                    <span>pH: {t.readings.ph.toFixed(2)}</span>
                    <span>TDS: {t.readings.tds}</span>
                    <span>Gas: {t.readings.gas}</span>
                  </div>
                  {t.result.contaminants.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {t.result.contaminants.map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">
                          {c.type}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTest(t.id)}
                    className="text-muted-foreground hover:text-milkguard-danger h-7 px-2"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block animate-fade-in">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>pH</TableHead>
                  <TableHead>TDS</TableHead>
                  <TableHead>Gas</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead>Contaminants</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.sampleId}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(t.timestamp).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{t.readings.ph.toFixed(2)}</TableCell>
                    <TableCell>{t.readings.tds}</TableCell>
                    <TableCell>{t.readings.gas}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${getVerdictColor(t.result.verdict)}`}>
                        {getVerdictLabel(t.result.verdict)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {t.result.contaminants.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {t.result.contaminants.map((c, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {c.type}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTest(t.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-milkguard-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
