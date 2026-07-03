import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const study = searchParams.get("study");
    const chapter = searchParams.get("chapter");

    if (!study || !chapter) {
      return NextResponse.json({ error: "Missing study or chapter param" }, { status: 400 });
    }

    // Sanitize parameters to prevent path traversal
    const safeStudy = study.replace(/[^a-z-]/gi, "");
    const safeChapter = parseInt(chapter, 10);

    if (isNaN(safeChapter) || safeChapter < 1 || safeChapter > 15) {
      return NextResponse.json({ error: "Invalid chapter range" }, { status: 400 });
    }

    // Resolve absolute path to chapter file
    const docPath = path.join(
      process.cwd(),
      "docs",
      "chapters",
      `${safeStudy}_ch${safeChapter}_infra_design.md`
    );

    try {
      const content = await fs.readFile(docPath, "utf-8");
      return NextResponse.json({ content });
    } catch {
      // Fallback message if chapter is not yet written
      return NextResponse.json({
        content: `# Chapter ${safeChapter}\n\nThis deep-dive architectural article is under construction. Please check back soon.`
      });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
