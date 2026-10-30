"use client";
import { useEffect, useRef, useState } from "react";
import { requestDesign, delay } from "@/lib/agent/client";
import { comparisonSchema, type Comparison } from "@/lib/agent/comparison";
import type { DesignResult } from "@/lib/agent/plan";
import { tasteSchema, type Taste } from "@/lib/validation/contracts";
import { defaultRoom, roomSchema, type RoomState } from "@/lib/room/state";
import { planForRoom } from "@/lib/agent/planning";
import { executeTools, describeTool } from "@/lib/room/tools";
import {
  commit,
  undo as historyUndo,
  redo as historyRedo,
  type History,
} from "@/lib/room/history";
import { profiles } from "@/lib/agent/profiles";
import { DesignError, diagnosticSchema, type DesignDiagnostic } from "@/lib/agent/errors";
type Snapshot = {
  room: RoomState;
  result: DesignResult | null;
  log: string[];
  taste: Taste;
  adjacency: number;
};
const emptyTaste: Taste = { music: [], film: [], brands: [], wildcard: "" };
const initial: Snapshot = {
  room: defaultRoom,
  result: null,
  log: [],
  taste: emptyTaste,
  adjacency: 55,
};
function errorText(error: unknown, fallback: string) {
  if (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  )
    return "The request was interrupted or timed out. Your room is unchanged; try again.";
  if (error instanceof TypeError)
    return "Connection interrupted. Check your network and try again; your room is unchanged.";
  return error instanceof Error ? error.message : fallback;
}
export function useStudio() {
  const [taste, setTaste] = useState<Taste>(emptyTaste);
  const [history, setHistory] = useState<History<Snapshot>>({
    past: [],
    present: initial,
    future: [],
  });
  const [preview, setPreview] = useState<Snapshot | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState("");
  const [diagnostic, setDiagnostic] = useState<DesignDiagnostic | null>(null);
  const [reset, setReset] = useState(0);
  const [adjacency, setAdjacency] = useState(55);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [side, setSide] = useState<"generic" | "cultural">("cultural");
  const abort = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const retry = useRef<(() => Promise<void>) | null>(null);
  const stageCursor = useRef(0);
  function reportStage(message: string) {
    setStatus(message);
    setStageIndex(Math.min(stageCursor.current++, 2));
  }
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demo") !== "true")
      return;
    const timer = setTimeout(() => {
      void generate(profiles[0].taste, true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const current = preview ?? history.present;
  const compared = comparison?.[side];
  const room = compared?.room ?? current.room;
  const result = compared ?? current.result;
  const log = compared ? compared.plan.tools.map(describeTool) : current.log;
  function begin() {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError("");
    setDiagnostic(null);
    setStageIndex(0);
    stageCursor.current = 0;
    abort.current = new AbortController();
    return true;
  }
  function end() {
    locked.current = false;
    setBusy(false);
    setPreview(null);
  }
  function signal() {
    return AbortSignal.any([abort.current!.signal, AbortSignal.timeout(185000)]);
  }
  async function animate(
    next: DesignResult,
    source: Taste,
    exploration: number,
  ) {
    let state = next.baseline;
    setStageIndex(2);
    let entries: string[] = [];
    setComparison(null);
    setEditing(false);
    setPreview({
      room: state,
      result: next,
      log: entries,
      taste: source,
      adjacency: exploration,
    });
    window.scrollTo({ top: 0, behavior: "instant" });
    let pending: typeof next.plan.tools = [];
    for (const call of next.plan.tools) {
      if (abort.current?.signal.aborted)
        throw new Error("Design canceled. Your previous room is unchanged.");
      pending.push(call);
      try {
        state = executeTools(state, pending);
      } catch {
        // Layout changes can depend on later removals/moves; never show invalid intermediate rooms.
        continue;
      }
      entries = [...entries, ...pending.map(describeTool)];
      pending = [];
      setPreview({
        room: state,
        result: next,
        log: entries,
        taste: source,
        adjacency: exploration,
      });
      setStatus(describeTool(call));
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
        await delay(130);
    }
    if (pending.length) throw new Error("The complete design could not be applied safely. Your previous room is unchanged.");
    setHistory((h) =>
      commit(h, {
        room: state,
        result: next,
        log: entries,
        taste: source,
        adjacency: exploration,
      }),
    );
    setStatus("Your room is ready. Make yourself at home.");
  }
  async function generate(selected = taste, example = false) {
    const parsed = tasteSchema.safeParse(selected);
    if (!parsed.success) {
      setError(
        "Add at least one artist, film, brand or wildcard to get started.",
      );
      setEditing(true);
      return;
    }
    if (!begin()) return;
    retry.current = () => generate(selected, example);
    setEditing(false);
    setTaste(parsed.data);
    setStatus("Opening the design brief");
    try {
      const next = await requestDesign(
        "/api/generate",
        { taste: parsed.data, adjacency, demo: example, generic: false, current: history.present.result ? history.present.room : undefined },
        reportStage,
        signal(),
      );
      await animate(next, parsed.data, adjacency);
    } catch (e) {
      if (e instanceof DesignError) setDiagnostic(e.diagnostic);
      setError(
        errorText(e, "The design could not finish. Your room is unchanged."),
      );
      setStatus("");
    } finally {
      end();
    }
  }
  async function refine(instruction: string) {
    if (!history.present.result || !instruction.trim() || !begin()) return;
    setComparison(null);
    retry.current = () => refine(instruction);
    setStatus("Reading your refinement");
    try {
      const snapshot = history.present;
      const next = await requestDesign(
        "/api/refine",
        {
          taste: snapshot.taste,
          adjacency: snapshot.adjacency,
          demo: snapshot.result!.planner === "mock",
          generic: false,
          current: snapshot.room,
          instruction,
        },
        reportStage,
        signal(),
      );
      await animate(next, snapshot.taste, snapshot.adjacency);
    } catch (e) {
      if (e instanceof DesignError) setDiagnostic(e.diagnostic);
      setError(errorText(e, "Refinement failed. Room unchanged."));
      setStatus("");
    } finally {
      end();
    }
  }
  async function compare() {
    if (!history.present.result || !begin()) return;
    retry.current = compare;
    setStatus("Generating two designs with identical settings");
    try {
      const snapshot = history.present;
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taste: snapshot.taste,
          adjacency: snapshot.adjacency,
          demo: snapshot.result!.planner === "mock",
          generic: false,
        }),
        signal: signal(),
      });
      if (!response.ok) {
        const payload = await response.json();
        const parsed = diagnosticSchema.safeParse(payload.error);
        if (parsed.success) {
          if (process.env.NODE_ENV === "development")
            console.error("[TasteSpace generation]", parsed.data);
          throw new DesignError(parsed.data);
        }
        throw new Error("Comparison could not finish. Your editable room is unchanged.");
      }
      setComparison(comparisonSchema.parse(await response.json()));
      setSide("cultural");
      setStatus("Paired comparison ready. Toggle the context to explore.");
    } catch (e) {
      if (e instanceof DesignError) setDiagnostic(e.diagnostic);
      setError(errorText(e, "Comparison failed."));
      setStatus("");
    } finally {
      end();
    }
  }
  function restore(direction: "undo" | "redo") {
    if (busy) return;
    const next =
      direction === "undo" ? historyUndo(history) : historyRedo(history);
    setHistory(next);
    setTaste(next.present.taste);
    setAdjacency(next.present.adjacency);
    setEditing(false);
    setComparison(null);
    setError("");
    setStatus(
      direction === "undo"
        ? "Last design change undone."
        : "Design change restored.",
    );
  }
  function toggleLock(fields: RoomState["constraints"]["locked"]) {
    if (busy || comparison || !history.present.result) return;
    const snapshot = history.present;
    const allLocked = fields.every((field) => snapshot.room.constraints.locked.includes(field));
    const lockedFields = allLocked
      ? snapshot.room.constraints.locked.filter((field) => !fields.includes(field))
      : [...new Set([...snapshot.room.constraints.locked, ...fields])];
    const nextRoom = roomSchema.parse({ ...snapshot.room, constraints: { ...snapshot.room.constraints, locked: lockedFields } });
    const previous = snapshot.result!;
    // Explicit user lock/unlock is authorized locally, never available to AI tool calls.
    const nextResult = { ...previous, baseline: nextRoom, room: nextRoom, plan: planForRoom(previous.plan, nextRoom, nextRoom) };
    setHistory((value) => commit(value, { ...snapshot, room: nextRoom, result: nextResult }));
    setStatus(allLocked ? "Selected room elements unlocked." : "Selected room elements locked for future edits.");
  }
  return {
    taste,
    setTaste,
    room,
    result,
    log,
    editing,
    setEditing,
    busy,
    status,
    stageIndex,
    error,
    diagnostic,
    retryLast: () => void retry.current?.(),
    startOver: () => {
      if (locked.current) return;
      setHistory({ past: [], present: initial, future: [] });
      setTaste(emptyTaste);
      setAdjacency(55);
      setComparison(null);
      setError("");
      setDiagnostic(null);
      setStatus("");
      setEditing(false);
    },
    reset,
    setReset,
    adjacency,
    setAdjacency,
    generate,
    refine,
    toggleLock,
    compare,
    comparison,
    side,
    setSide,
    closeComparison: () => {
      setComparison(null);
      setStatus("Back to your editable room.");
    },
    undo: () => restore("undo"),
    redo: () => restore("redo"),
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    designTaste: current.taste,
  };
}
