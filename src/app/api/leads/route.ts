import { db } from '@/lib/db';
import { leadSchema } from '@/lib/validation';
import { publicStatuses } from '@/lib/catalog';
import { apiError,clientKey,HttpError,rateLimit,readJson,sameOrigin } from '@/lib/security';
export async function POST(req:Request) {
 try {
 if(!sameOrigin(req)) throw new HttpError(403,'Invalid origin');
 if(!await rateLimit(`leads:${clientKey(req)}`,10,3600000)) throw new HttpError(429,'Try again later');
 const v=leadSchema.parse(await readJson(req));
 const property=v.propertyId ? await db.property.findFirst({where:{id:v.propertyId,status:{in:[...publicStatuses]}}}) : null;
 if(v.propertyId&&!property) throw new HttpError(400,'Property unavailable');
 await db.lead.create({data:{name:v.name,email:v.email,phone:v.phone,message:v.message,kind:v.kind,locale:v.locale,consentAt:new Date(),propertyId:property?.id,agentId:property?.agentId}});
 return Response.json({ok:true},{status:201});
 }catch(e){return apiError(e);}
}
