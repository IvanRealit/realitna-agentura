import { z } from 'zod';
const text = z.string().trim();
const url = text.refine(v => !v || /^\/uploads\/[a-zA-Z0-9.-]+$/.test(v) || /^\/images\/[a-zA-Z0-9.-]+$/.test(v) || (()=>{try { const u=new URL(v); return u.protocol==='https:' && !u.username && !u.password; } catch { return false; }})(), 'Use a local upload or HTTPS URL');
const translation = z.object({ title: text.min(2).max(180), description: text.min(10).max(20000) });
export const translations = z.object({ sk: translation, uk: translation.optional(), en: translation.optional() });
export const propertySchema = z.object({
 slug: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(150), translations,
 city: text.min(2).max(100), region: text.min(2).max(100), address: text.min(2).max(200),
 type: z.enum(['APARTMENT','HOUSE','LAND','COMMERCIAL']), transaction: z.enum(['SALE','RENT']), condition: z.enum(['NEW','RENOVATED','ORIGINAL']),
 price: z.number().int().min(0).max(2000000000), area: z.number().positive().max(10000000), rooms: z.number().int().min(0).max(1000),
 status: z.enum(['DRAFT','PUBLISHED','RESERVED','SOLD','RENTED','ARCHIVED']), demo: z.boolean(), featured: z.boolean(),
 latitude: z.number().min(-90).max(90).nullable().optional(), longitude: z.number().min(-180).max(180).nullable().optional(),
 images: z.array(url).max(30), videoUrl: url.nullable().optional(), tourUrl: url.nullable().optional(), floorPlan: url.nullable().optional(), brochure: url.nullable().optional(),
 agentId: text.min(1), seo: z.record(z.string(), z.unknown()).optional()
}).refine(v => v.images.every(s => s.length > 0), 'Image URL cannot be empty');
export const leadSchema = z.object({ name: text.min(2).max(100), email: z.email().max(254), phone: text.max(40).optional(), message: text.min(10).max(5000), kind: z.enum(['VIEWING','CONSULTATION','SELL','VALUATION']), locale: z.enum(['sk','uk','en']), consent: z.literal(true), website: text.max(0).optional(), propertyId: text.max(100).optional() });
export const userSchema = z.object({ name: text.min(2).max(100), email: z.email().max(254), password: z.string().min(12).max(128).optional(), role: z.enum(['ADMIN','MANAGER','AGENT']), active: z.boolean(), phone: text.max(40).nullable().optional(), avatar: url.nullable().optional(), bio: z.record(z.string(),z.unknown()).optional() });
export const contentSchema = z.object({slug:text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(150),kind:z.enum(['PAGE','BLOG']),translations,published:z.boolean(),seo:z.record(z.string(),z.unknown()).optional()});
export const settingsSchema = z.object({brand:text.min(2).max(60),email:z.email().max(254),phone:text.max(40),address:text.max(300),retentionDays:z.number().int().min(7).max(730)});
