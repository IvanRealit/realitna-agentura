import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { locales,routes,href,type RouteKey } from '@/lib/i18n';
import { siteUrl } from '@/lib/site';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const base=siteUrl();const [properties,posts,cities]=await Promise.all([db.property.findMany({where:{status:{in:['PUBLISHED','RESERVED','SOLD','RENTED']},demo:false},select:{slug:true,updatedAt:true}}),db.content.findMany({where:{kind:'BLOG',published:true},select:{slug:true,updatedAt:true}}),db.property.findMany({where:{status:'PUBLISHED',demo:false},distinct:['city'],select:{city:true}})]);
 const keys=(Object.keys(routes) as RouteKey[]).filter(k=>k!=='favorites');
 const pages=[{key:undefined as RouteKey|undefined,slug:undefined as string|undefined,updatedAt:undefined as Date|undefined},...keys.map(key=>({key,slug:undefined,updatedAt:undefined})),...properties.map(p=>({key:'catalog' as const,slug:p.slug,updatedAt:p.updatedAt})),...posts.map(p=>({key:'blog' as const,slug:p.slug,updatedAt:p.updatedAt})),...cities.map(p=>({key:'locations' as const,slug:p.city.toLowerCase().replaceAll(' ','-'),updatedAt:undefined}))];
 return pages.flatMap(p=>locales.map(l=>({url:new URL(href(l,p.key,p.slug),base).href,lastModified:p.updatedAt,alternates:{languages:Object.fromEntries(locales.map(lang=>[lang,new URL(href(lang,p.key,p.slug),base).href]))}})));
}
