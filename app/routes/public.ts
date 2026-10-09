import type {Env} from '../types';
import {verifyVisitorSession,createVisitorSession} from '../auth/visitor-session';
import {registerLead} from '../domain/leads';
import {renderAccessGate} from '../templates/public';
export async function handlePublicRequest(request:Request,env:Env,requestId:string){
 const url=new URL(request.url);
 if(request.method==='POST'&&url.pathname==='/access'){
  const form=await request.formData();
  try{
   const result=await registerLead({name:String(form.get('name')||''),mobile:String(form.get('mobile')||''),consent:form.get('consent')==='yes'},{path:'/',requestId,referrer:request.headers.get('referer'),utmSource:url.searchParams.get('utm_source'),utmMedium:url.searchParams.get('utm_medium'),utmCampaign:url.searchParams.get('utm_campaign'),userAgentFamily:(request.headers.get('user-agent')||'').slice(0,80),countryCode:request.headers.get('cf-ipcountry')},env);
   return new Response(null,{status:303,headers:{location:'/', 'set-cookie':await createVisitorSession(result.leadId,env)}});
  }catch(e){return new Response(renderAccessGate(e instanceof Error?e.message:'Unable to save your details.'),{status:400,headers:{'content-type':'text/html; charset=utf-8'}});}
 }
 const claims=await verifyVisitorSession(request.headers.get('cookie'),env);
 if(!claims)return new Response(renderAccessGate(),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
 if(env.ASSETS)return env.ASSETS.fetch(new Request(new URL('/index.html',url),request));
 return new Response('Protected listings are available after deployment.');
}
