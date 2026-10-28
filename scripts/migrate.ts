import 'dotenv/config';
import { Client } from 'pg';
import { createHash,randomUUID } from 'node:crypto';
import { readFile,readdir } from 'node:fs/promises';
const client=new Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try {
 await client.query('SELECT pg_advisory_lock(73261028)');
 // Prisma-compatible migration ledger. Transactional PostgreSQL SQL migrations
 // can run without downloading a native Prisma schema engine in restricted CI.
 await client.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
 id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMPTZ,
 migration_name VARCHAR(255) NOT NULL, logs TEXT, rolled_back_at TIMESTAMPTZ,
 started_at TIMESTAMPTZ NOT NULL DEFAULT now(), applied_steps_count INTEGER NOT NULL DEFAULT 0)`);
 for(const name of (await readdir('prisma/migrations',{withFileTypes:true})).filter(v=>v.isDirectory()).map(v=>v.name).sort()){
 const sql=await readFile(`prisma/migrations/${name}/migration.sql`,'utf8');const checksum=createHash('sha256').update(sql).digest('hex');
 const {rows}=await client.query('SELECT checksum,finished_at FROM "_prisma_migrations" WHERE migration_name=$1 AND rolled_back_at IS NULL',[name]);
 if(rows.length){if(!rows[0].finished_at||rows[0].checksum!==checksum)throw new Error(`Migration mismatch or incomplete migration: ${name}`);console.log(`Already applied: ${name}`);continue;}
 await client.query('BEGIN');try{await client.query(sql);await client.query('INSERT INTO "_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count) VALUES ($1,$2,$3,now(),1)',[randomUUID(),checksum,name]);await client.query('COMMIT');console.log(`Applied: ${name}`);}catch(e){await client.query('ROLLBACK');throw e;}
 }
}finally{await client.query('SELECT pg_advisory_unlock(73261028)');await client.end();}
