import React, { Component, type ReactNode } from "react";

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="app-shell" role="alert"><h1>Չհաջողվեց ցուցադրել էջը։</h1><p>Թարմացրու էջը և փորձիր կրկին։</p><button onClick={() => window.location.reload()}>Թարմացնել էջը</button><p><a href="../index.html">Վերադառնալ պորտֆոլիո</a></p></main>;
    return this.props.children;
  }
}
