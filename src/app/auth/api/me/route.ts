import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserById } from "@/lib/local-auth"

export async function GET() {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")?.value
  if (!session) return NextResponse.json({ user: null }, { status: 401 })
  const user = getUserById(session)
  if (!user) return NextResponse.json({ user: null }, { status: 401 })
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })
}