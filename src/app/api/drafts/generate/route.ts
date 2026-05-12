import { NextResponse } from "next/server";
import { z } from "zod";
import { draftIssues } from "@/lib/ai/draft-issues";

const body = z.object({ projectPath: z.string() });

export async function POST(req: Request) {
  const { projectPath } = body.parse(await req.json());
  const ids = await draftIssues(projectPath);
  return NextResponse.json({ ids });
}
