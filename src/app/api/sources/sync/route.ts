import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MVP_SOURCES } from "../../../../../ingestion/sources/definitions";

/**
 * ソース定義を DB に同期するエンドポイント
 * definitions.ts に定義されたソースが DB に存在しなければ自動登録
 * POST /api/sources/sync
 */
export async function POST() {
  try {
    let created = 0;
    let updated = 0;

    for (const def of MVP_SOURCES) {
      const existing = await prisma.source.findUnique({
        where: { slug: def.slug },
      });

      if (!existing) {
        await prisma.source.create({
          data: {
            name: def.name,
            slug: def.slug,
            type: def.type,
            url: def.url,
            feedUrl: def.feedUrl || null,
            frequency: def.frequency,
            trustScore: def.trustScore,
            legalNotes: def.legalNotes || null,
            isActive: true,
          },
        });
        created++;
      } else if (
        existing.url !== def.url ||
        existing.feedUrl !== (def.feedUrl || null) ||
        existing.name !== def.name
      ) {
        await prisma.source.update({
          where: { slug: def.slug },
          data: {
            url: def.url,
            feedUrl: def.feedUrl || null,
            name: def.name,
          },
        });
        updated++;
      }
    }

    await prisma.auditLog.create({
      data: {
        actor: "admin",
        action: "sources.sync",
        target: "Source",
        diff: { created, updated, total: MVP_SOURCES.length },
      },
    });

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: MVP_SOURCES.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
