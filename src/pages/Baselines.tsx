import { useState } from "react";
import { useMilkGuard } from "@/contexts/MilkGuardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Trash2, SlidersHorizontal, Check, Pencil, Wand2 } from "lucide-react";
import type { Baseline } from "@/utils/milkAnalysis";
import { toast } from "sonner";

export default function Baselines() {
  const {
    baselines,
    activeBaseline,
    addBaseline,
    updateBaseline,
    deleteBaseline,
    setActiveBaseline,
    currentReadings,
    connectionType,
  } = useMilkGuard();
  const [name, setName] = useState("");
  const [phMin, setPhMin] = useState("6.5");
  const [phMax, setPhMax] = useState("6.8");
  const [tdsMin, setTdsMin] = useState("700");
  const [tdsMax, setTdsMax] = useState("1200");
  const [gasMax, setGasMax] = useState("50");
  const [editing, setEditing] = useState<Baseline | null>(null);

  const handleAdd = () => {
    if (!name.trim()) return;
    addBaseline({
      name: name.trim(),
      phMin: parseFloat(phMin),
      phMax: parseFloat(phMax),
      tdsMin: parseInt(tdsMin),
      tdsMax: parseInt(tdsMax),
      gasMax: parseInt(gasMax),
    });
    setName("");
    setPhMin("6.5"); setPhMax("6.8");
    setTdsMin("700"); setTdsMax("1200");
    setGasMax("50");
    toast.success("Baseline created");
  };

  const handleCalibrate = () => {
    if (!currentReadings || connectionType !== "wifi") {
      toast.error("Connect ESP32 and take a live reading first.");
      return;
    }
    const { ph, tds, gas } = currentReadings;
    setName(`Calibrated ${new Date().toLocaleDateString()}`);
    setPhMin((ph - 0.15).toFixed(2));
    setPhMax((ph + 0.15).toFixed(2));
    setTdsMin(String(Math.max(0, Math.round(tds * 0.85))));
    setTdsMax(String(Math.round(tds * 1.15)));
    setGasMax(String(Math.max(20, Math.round(gas * 1.5))));
    toast.success("Pre-filled from current reading — review and save.");
  };

  const openEdit = (b: Baseline) => {
    setEditing(b);
    setName(b.name);
    setPhMin(String(b.phMin)); setPhMax(String(b.phMax));
    setTdsMin(String(b.tdsMin)); setTdsMax(String(b.tdsMax));
    setGasMax(String(b.gasMax));
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    updateBaseline(editing.id, {
      name: name.trim() || editing.name,
      phMin: parseFloat(phMin),
      phMax: parseFloat(phMax),
      tdsMin: parseInt(tdsMin),
      tdsMax: parseInt(tdsMax),
      gasMax: parseInt(gasMax),
    });
    setEditing(null);
    toast.success("Baseline updated");
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Baselines</h1>
          <p className="text-sm text-muted-foreground">
            Define normal ranges for milk quality parameters
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add Baseline
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Baseline</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Baseline Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Buffalo Milk, Goat Milk"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>pH Min</Label>
                  <Input type="number" step="0.1" value={phMin} onChange={(e) => setPhMin(e.target.value)} />
                </div>
                <div>
                  <Label>pH Max</Label>
                  <Input type="number" step="0.1" value={phMax} onChange={(e) => setPhMax(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>TDS Min (ppm)</Label>
                  <Input type="number" value={tdsMin} onChange={(e) => setTdsMin(e.target.value)} />
                </div>
                <div>
                  <Label>TDS Max (ppm)</Label>
                  <Input type="number" value={tdsMax} onChange={(e) => setTdsMax(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Gas Threshold (max)</Label>
                <Input type="number" value={gasMax} onChange={(e) => setGasMax(e.target.value)} />
              </div>
              <DialogClose asChild>
                <Button className="w-full" onClick={handleAdd} disabled={!name.trim()}>
                  Create Baseline
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {baselines.length === 0 ? (
        <Card className="border-dashed animate-fade-in">
          <CardContent className="p-8 text-center">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-accent mb-4">
              <SlidersHorizontal className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No Baselines</h3>
            <p className="text-sm text-muted-foreground">
              Create your first baseline to define normal milk parameters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {baselines.map((b) => (
            <Card
              key={b.id}
              className={`animate-slide-up transition-all ${
                b.id === activeBaseline.id ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {b.name}
                      {b.id === activeBaseline.id && (
                        <Badge className="text-[10px] bg-primary/10 text-primary border-0">
                          Active
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {new Date(b.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {b.id !== activeBaseline.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setActiveBaseline(b.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {b.id !== "default" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-milkguard-danger"
                        onClick={() => deleteBaseline(b.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">pH</p>
                    <p className="text-sm font-bold text-foreground mt-1">
                      {b.phMin}–{b.phMax}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">TDS</p>
                    <p className="text-sm font-bold text-foreground mt-1">
                      {b.tdsMin}–{b.tdsMax}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Gas</p>
                    <p className="text-sm font-bold text-foreground mt-1">
                      ≤{b.gasMax}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
