import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authHeader = request.headers.get("authorization");
  const queryToken = request.nextUrl.searchParams.get("token");
  const token = authHeader?.replace("Bearer ", "") ?? queryToken ?? null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

  const upstream = await fetch(`${apiUrl}/appointments/${id}/fiche`, {
    headers: {
      Accept: "application/pdf",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!upstream.ok) {
    const body = await upstream.text();
    return NextResponse.json(
      { message: "Erreur lors de la génération de la fiche.", detail: body },
      { status: upstream.status }
    );
  }

  const disposition =
    upstream.headers.get("content-disposition") ??
    'attachment; filename="fiche-demande.pdf"';

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
    },
  });
}
