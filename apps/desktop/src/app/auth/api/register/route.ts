import { NextResponse } from "next/server"
import { createUser } from "@/lib/local-auth"

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || ""

  let name: string, email: string, password: string
  if (contentType.includes("application/json")) {
    const body = await request.json()
    name = body.name
    email = body.email
    password = body.password
  } else {
    const formData = await request.formData()
    name = formData.get("name") as string
    email = formData.get("email") as string
    password = formData.get("password") as string
  }

  if (!name || !email || !password) {
    const url = new URL("/auth/register", request.url)
    url.searchParams.set("error", "All fields are required")
    return NextResponse.redirect(url)
  }

  if (password.length < 6) {
    const url = new URL("/auth/register", request.url)
    url.searchParams.set("error", "Password must be at least 6 characters")
    return NextResponse.redirect(url)
  }

  try {
    const user = createUser(name, email, password)
    const response = NextResponse.redirect(new URL("/dashboard", request.url))
    response.cookies.set("session", user.id, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    })
    return response
  } catch (err) {
    const url = new URL("/auth/register", request.url)
    url.searchParams.set("error", err instanceof Error ? err.message : "Registration failed")
    return NextResponse.redirect(url)
  }
}