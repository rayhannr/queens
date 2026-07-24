"use client";

import dynamic from "next/dynamic";

const AmbientBackground = dynamic(
  () => import("./AmbientBackground").then((m) => m.AmbientBackground),
  { ssr: false }
);

export function AmbientBackgroundClient() {
  return <AmbientBackground />;
}
