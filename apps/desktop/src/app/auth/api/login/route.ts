import { NextResponse } from "next/server"
import { findUserByEmail, verifyPassword } from "@/lib/local-auth"

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || ""

  let email: string, password: string
  if (contentType.includes("application/json")) {
    const body = await request.json()
    email = body.email
    password = body.password
  } else {
    const formData = await request.formData()
    email = formData.get("email") as string
    password = formData.get("password") as string
  }

  const user = findUserByEmail(email)
  if (!user || !verifyPassword(user, password)) {
    const url = new URL("/auth/login", request.url)
    url.searchParams.set("error", "Invalid email or password")
    return NextResponse.redirect(url)
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url))
  response.cookies.set("session", user.id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  })
  return response
}