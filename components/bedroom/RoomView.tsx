"use client";
import dynamic from "next/dynamic";
import { Component, useCallback, useState, type ReactNode } from "react";
import type { RoomState } from "@/lib/room/state";
import { label } from "@/lib/assets/catalog";
const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => (
    <div className="room-loading" role="status">
      Opening your studio…
    </div>
  ),
});
class RoomBoundary extends Component<
  { room: RoomState; children: ReactNode },
  { failed: boolean; attempt: number }
> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  retry() {
    this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }));
  }
  render() {
    if (this.state.failed)
      return (
        <div className="room-fallback" role="alert">
          <span className="eyebrow">YOUR DESIGN IS SAFE</span>
          <h2>The 3D view couldn't load.</h2>
          <p>
            Check your connection and enable WebGL / hardware acceleration. You
            can still read and refine your design.
          </p>
          <dl>
            <dt>Walls</dt>
            <dd>{this.props.room.wallColor}</dd>
            <dt>Bedding</dt>
            <dd>{label(this.props.room.bedding)}</dd>
            <dt>Lighting</dt>
            <dd>{this.props.room.lightingTemperature} K</dd>
          </dl>
          <button onClick={() => this.retry()}>Retry 3D view ↗</button>
        </div>
      );
    return (
      <div className="room-canvas-boundary" key={this.state.attempt}>
        {this.props.children}
      </div>
    );
  }
}
export default function RoomView({
  room,
  resetKey = 0,
}: {
  room: RoomState;
  resetKey?: number;
}) {
  const [loading, setLoading] = useState(true);
  const ready = useCallback(() => setLoading(false), []);
  const waiting = useCallback(() => setLoading(true), []);
  return (
    <RoomBoundary room={room}>
      <div className="room-viewer">
        <Scene
          room={room}
          resetKey={resetKey}
          onReady={ready}
          onLoading={waiting}
        />
        {loading && (
          <div className="room-loading-overlay" role="status">
            Loading selected room assets…
          </div>
        )}
      </div>
    </RoomBoundary>
  );
}
