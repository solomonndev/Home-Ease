import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Fix sandbox DATABASE_URL override: if system env has a non-postgres URL,
// read the correct one from .env file and set it before PrismaClient reads it
const currentUrl = process.env.DATABASE_URL || ''
if (!currentUrl.startsWith('postgresql://') && !currentUrl.startsWith('postgres://')) {
  try {
    const envPath = resolve(process.cwd(), '.env')
    const envContent = readFileSync(envPath, 'utf-8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('#') || !trimmed) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex).trim()
      let val = trimmed.slice(eqIndex + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (key === 'DATABASE_URL') {
        process.env.DATABASE_URL = val
        break
      }
    }
  } catch (e) {
    console.error('[db] Failed to read .env file:', e)
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
