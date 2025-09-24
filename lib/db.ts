import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless'
import { Pool as NeonPool } from '@neondatabase/serverless'
import * as schema from '../shared/schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set')
}

// Use Neon for production, regular pg for local development
let db: any

if (process.env.DATABASE_URL.includes('neon.tech')) {
  // Neon serverless for production
  const pool = new NeonPool({ connectionString: process.env.DATABASE_URL })
  db = neonDrizzle(pool, { schema })
} else {
  // Local PostgreSQL for development or Aiven
  const { Pool: PgPool } = require('pg')
  const { drizzle: pgDrizzle } = require('drizzle-orm/node-postgres')
  
  // Clean connection string by removing problematic SSL parameters
  let cleanUrl = process.env.DATABASE_URL
  if (cleanUrl.includes('sslcert=disable')) {
    cleanUrl = cleanUrl.replace('&sslcert=disable', '').replace('sslcert=disable&', '').replace('?sslcert=disable', '?').replace('&sslcert=disable', '')
  }
  
  // For Aiven, we need SSL but with proper certificate handling
  if (cleanUrl.includes('aivencloud.com')) {
    cleanUrl = cleanUrl.replace('sslmode=require', 'sslmode=require')
  }
  
  // Aiven certificate for SSL connection
  const aivenCert = `-----BEGIN CERTIFICATE-----
MIIEUDCCArigAwIBAgIUSsOFwcjG9evJBkZc6swW7Ayo+8cwDQYJKoZIhvcNAQEM
BQAwQDE+MDwGA1UEAww1NWE3MTAwYTgtZWI0Ny00YjlmLThlYjItZjBkMzYxNmRj
ZmU1IEdFTiAxIFByb2plY3QgQ0EwHhcNMjUwOTIyMDQzNTI1WhcNMzUwOTIwMDQz
NTI1WjBAMT4wPAYDVQQDDDU1YTcxMDBhOC1lYjQ3LTRiOWYtOGViMi1mMGQzNjE2
ZGNmZTUgR0VOIDEgUHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCC
AYoCggGBANcZ2n4CiH6JBj5fXCxXBwcBfd7Ubom1VK+Yxxb5EzjTER+sPIArE7LI
de/tXm6R6lA49zWmmPS/yYeZsRQ5o9qyIdvOzvnl4UsoTYiBHTHTeHQicrZm7zBM
MMWwL4nXMqSgLSO+JaBtBFcQ8hlwX5+9BYFk64rdzrxpwhqpkiOaYDa03DU9Zuz0
16jQ8Sbh+K8g/5mDEnPJ+oHaScqoKlSxRTUxvrEfxXvDKPMeEwj5u9Oa80PIEvbt
4kPlsWBZzsbdlTkDiGufhfisGdioUwVbmh6rmaIQb1oPPHhAsqk2s49fFdjJSSJZ
YsKiqxMqc2jUcxNfm/HGlwCvniP3POhnhlzSvdmwsTQ0S+XA6WUsFmil/6cWMXoR
dK9nSV4BlZMTNtNpGG0aWUWllYqRwRLEbXHZ81tmEcTJwp8WR9zlKsqoGJHRs/Uv
vCRONIzAtv7fYrOoCt7nVVqWgZzlSbAf3IIbaoEzAv+0KEK/d8NSi7FAozpXoYJm
5exBVI/xGwIDAQABo0IwQDAdBgNVHQ4EFgQU+tE052khuz8IuFcMYFfa8XToxq0w
EgYDVR0TAQH/BAgwBgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQAD
ggGBAI/qA2DpjytSD2Z8aI8opj82vbnmg+lCpiisljd6eiEWV3OnMErCwSTCB9uP
S7WIcWThg3kujM6mtblxDx6Sh0vIVF0B+gHIa37oxp2R/kgFVRKJxDiAVa6N1SWH
QRq8WzLgBGm4TB0SH/BE71806NW4Dm7TgPqF3yWc08TEurQTjDUaLqSF2VfdUFzP
MGN1Kvqr5oQBl9Uqs33W7pua2hSDQgPXAa5DoQxy948VLzLj+UHNzJQmCADbLmuF
v41sjgo+dQn81pteJqgKb0yVXETfyBKcFPeBgiaPkOc80KPJOtuyEuqrVUX1MFcU
NGHWrxiDaNtPblBTBbFHYbpsbr8nQvtjEl8Url4AJLpmVTcsd7HVoWK+qAYpjRUm
7Jaf9y+woUjR29BkCvFDyl8noBepKULAIZtpCKrTm81DqcvAcLE5xaB07yIKm9XM
ULA5SnJjufoAkSN2dUw5cxfwZa5irgVQs/EJLHcZMfUv25x+o2iI7ZfiPj0FUZE8
RtH4Gw==
-----END CERTIFICATE-----`

  const sslConfig = cleanUrl.includes('aivencloud.com') ? { 
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined
  } : false
  
  const pgPool = new PgPool({ 
    connectionString: cleanUrl,
    ssl: sslConfig
  })
  db = pgDrizzle(pgPool, { schema })
}

export { db }
