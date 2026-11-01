import crypto from "crypto"
import fs from "fs"
import path from "path"

export interface LocalUser {
  id: string
  name: string
  email: string
  passwordHash: string
  salt: string
  role: "admin" | "employee"
  createdAt: string
}

const DB_PATH = path.join(process.cwd(), ".local-auth.json")

function readUsers(): LocalUser[] {
  try {
    if (!fs.existsSync(DB_PATH)) return []
    const raw = fs.readFileSync(DB_PATH, "utf8")
    return JSON.parse(raw) as LocalUser[]
  } catch {
    return []
  }
}

function writeUsers(users: LocalUser[]) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), "utf8")
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex")
}

export function findUserByEmail(email: string): LocalUser | undefined {
  return readUsers().find((u) => u.email.toLowerCase() === email.toLowerCase())
}

export function createUser(name: string, email: string, password: string): LocalUser {
  const users = readUsers()
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("An account with this email already exists")
  }
  const salt = crypto.randomBytes(16).toString("hex")
  const user: LocalUser = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash: hashPassword(password, salt),
    salt,
    role: "employee",
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  writeUsers(users)
  return user
}

export function verifyPassword(user: LocalUser, password: string): boolean {
  const hash = hashPassword(password, user.salt)
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.passwordHash, "hex"))
}

export function getUserById(id: string): LocalUser | undefined {
  return readUsers().find((u) => u.id === id)
}