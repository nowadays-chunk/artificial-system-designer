import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artificial System Designer | Network Diagram Modeler",
  description:
    "Drag-and-drop system design lab with spec-backed components, live connections, guided scenarios, and network simulation telemetry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
