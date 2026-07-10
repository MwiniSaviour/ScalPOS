import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const createClient = async (cookieStore?: Awaited<ReturnType<typeof cookies>>) => {
  const cs = cookieStore || (await cookies())

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cs.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cs.set(name, value, options)
          )
        } catch {
          // Called from a Server Component — ignore if middleware refreshes sessions
        }
      },
    },
  })
}
