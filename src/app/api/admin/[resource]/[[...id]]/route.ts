import { db } from '@/lib/db';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { apiError,canManage,currentUser,HttpError,owns,rateLimit,readJson,sameOrigin } from '@/lib/security';
import { contentSchema,propertySchema,settingsSchema,userSchema } from '@/lib/validation';
import type { Prisma } from '@prisma/client';
type Context={params:Promise<{resource:string;id?:string[]}>};
async function access(req:Request, resource:string, write=false) {
 const user=await currentUser();
 if(!user) throw new HttpError(401,'Sign in required');
 if(write&&!sameOrigin(req)) throw new HttpError(403,'Invalid origin');
 if(!await rateLimit(`admin:${user.id}`,300,60000)) throw new HttpError(429,'Try again later');
 if(!['properties','leads','users','content','settings','audit'].includes(resource)) throw new HttpError(404,'Unknown resource');
 if(['users','settings','audit'].includes(resource)&&user.role!=='ADMIN') throw new HttpError(403,'Admin role required');
 if(resource==='content'&&!canManage(user.role)) throw new HttpError(403,'Manager role required');
 return user;
}
export async function GET(req:Request,ctx:Context) {
 try {
 const {resource,id}=await ctx.params; const user=await access(req,resource); const key=id?.[0];
 let data:unknown;
 if(resource==='properties') data=await db.property.findMany({where:{...(user.role==='AGENT'?{agentId:user.id}:{}),...(key?{id:key}:{})},orderBy:{updatedAt:'desc'},take:200});
 if(resource==='leads') data=await db.lead.findMany({where:{...(user.role==='AGENT'?{agentId:user.id}:{}),...(key?{id:key}:{})},orderBy:{createdAt:'desc'},take:200});
 if(resource==='users') data=await db.user.findMany({select:{id:true,name:true,email:true,role:true,active:true,phone:true,avatar:true,bio:true},orderBy:{name:'asc'},take:200});
 if(resource==='content') data=await db.content.findMany({orderBy:{updatedAt:'desc'},take:200});
 if(resource==='settings') data=await db.settings.findUnique({where:{id:'site'}});
 if(resource==='audit') data=await db.auditLog.findMany({orderBy:{createdAt:'desc'},take:200});
 return Response.json(data,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return apiError(e);}
}
async function mutate(req:Request,ctx:Context,method:'POST'|'PATCH'|'DELETE') {
 try {
 const {resource,id}=await ctx.params; const key=id?.[0]; const user=await access(req,resource,true);
 if(method!=='POST'&&!key&&resource!=='settings') throw new HttpError(400,'Record ID required');
 if(resource==='audit') throw new HttpError(405,'Read only');
 const body=method==='DELETE'?null:await readJson(req);
 const result=await db.$transaction(async tx=>{
 let data:unknown;
 if(resource==='properties') {
 const existing=key?await tx.property.findUnique({where:{id:key}}):null;
 if(key&&!existing) throw new HttpError(404,'Not found');
 if(existing&&!owns(user.role,user.id,existing.agentId)) throw new HttpError(403,'Not your property');
 if(method==='DELETE') {
 if(!canManage(user.role)) throw new HttpError(403,'Manager role required');
 data=await tx.property.delete({where:{id:key}});
 }else {
 const v=propertySchema.parse(body);
 if(user.role==='AGENT') {
 if(v.agentId!==user.id) throw new HttpError(403,'Cannot assign another agent');
 if(v.status!==(existing?.status??'DRAFT')||v.featured!==(existing?.featured??false)||v.demo!==(existing?.demo??true)) throw new HttpError(403,'Only a manager can change publication, featured or demo status');
 }
 const agent=await tx.user.findFirst({where:{id:v.agentId,active:true}});
 if(!agent) throw new HttpError(400,'Active agent required');
 const input={...v,translations:v.translations as Prisma.InputJsonValue,seo:(v.seo??{}) as Prisma.InputJsonValue};
 data=key?await tx.property.update({where:{id:key},data:input}):await tx.property.create({data:input});
 }
 }
 if(resource==='leads') {
 const existing=key?await tx.lead.findUnique({where:{id:key}}):null;
 if(!existing) throw new HttpError(404,'Not found');
 if(!owns(user.role,user.id,existing.agentId)) throw new HttpError(403,'Not your lead');
 if(method==='DELETE') {
 if(user.role!=='ADMIN') throw new HttpError(403,'Admin required');
 data=await tx.lead.delete({where:{id:key}});
 }else {
 const v=z.object({status:z.enum(['NEW','IN_PROGRESS','CLOSED']),notes:z.string().max(10000),agentId:z.string().nullable().optional()}).parse(body);
 if(user.role==='AGENT'&&v.agentId!==undefined&&v.agentId!==existing.agentId) throw new HttpError(403,'Cannot reassign');
 if(v.agentId&&!await tx.user.findFirst({where:{id:v.agentId,active:true}})) throw new HttpError(400,'Agent unavailable');
 data=await tx.lead.update({where:{id:key},data:v});
 }
 }
 if(resource==='users') {
 if(method==='DELETE') throw new HttpError(405,'Deactivate users instead');
 const v=userSchema.parse(body);
 if(!key&&!v.password) throw new HttpError(400,'Password required');
 if(key===user.id&&(!v.active||v.role!=='ADMIN')) throw new HttpError(400,'Cannot revoke your own administrative access');
 const {password,...rest}=v;
 const input={...rest,email:v.email.toLowerCase(),bio:(v.bio??{}) as Prisma.InputJsonValue,...(password?{passwordHash:await hash(password,12)}:{})};
 if(key) {
 await tx.session.deleteMany({where:{userId:key}});
 data=await tx.user.update({where:{id:key},data:input,select:{id:true,name:true}});
 }else data=await tx.user.create({data:{...input,passwordHash:input.passwordHash!},select:{id:true,name:true}});
 }
 if(resource==='content') {
 if(method==='DELETE') data=await tx.content.delete({where:{id:key}});
 else {const v=contentSchema.parse(body); const input={...v,translations:v.translations as Prisma.InputJsonValue,seo:(v.seo??{}) as Prisma.InputJsonValue}; data=key?await tx.content.update({where:{id:key},data:input}):await tx.content.create({data:input});}
 }
 if(resource==='settings') {
 if(method==='DELETE') throw new HttpError(405,'Cannot delete settings');
 const v=settingsSchema.parse(body); data=await tx.settings.upsert({where:{id:'site'},create:{id:'site',...v},update:v});
 }
 if(!data) throw new HttpError(405,'Unsupported operation');
 await tx.auditLog.create({data:{actorId:user.id,action:method,resource,resourceId:key??(data as {id?:string}).id??'site'}});
 return data;
 });
 return Response.json(result,{status:method==='POST'?201:200});
 }catch(e){return apiError(e);}
}
export const POST=(r:Request,c:Context)=>mutate(r,c,'POST');
export const PATCH=(r:Request,c:Context)=>mutate(r,c,'PATCH');
export const DELETE=(r:Request,c:Context)=>mutate(r,c,'DELETE');
