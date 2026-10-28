import { notFound } from 'next/navigation';
import { currentUser } from '@/lib/security';
import { db } from '@/lib/db';
import { Admin,Login } from '@/components/admin';
export const dynamic='force-dynamic';
export const metadata={title:'Pracovný priestor',robots:{index:false,follow:false}};
export default async function AdminPage({params}:{params:Promise<{path?:string[]}>}){
 const user=await currentUser();if(!user)return <Login/>;
 const {path=[]}=await params;const resource=path[0]??'dashboard';
 const allowed=['dashboard','properties','leads',...(user.role!=='AGENT'?['content']:[]),...(user.role==='ADMIN'?['users','settings','audit']:[])];
 if(path.length>1||!allowed.includes(resource))notFound();
 const owned=user.role==='AGENT'?{agentId:user.id}:{};
 const [properties,leads,newLeads]=await Promise.all([db.property.count({where:owned}),db.lead.count({where:owned}),db.lead.count({where:{...owned,status:'NEW'}})]);
 return <Admin key={resource} user={{id:user.id,name:user.name,role:user.role}} resource={resource} stats={{properties,leads,newLeads}}/>;
}
