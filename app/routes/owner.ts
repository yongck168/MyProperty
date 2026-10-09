import type {Env} from '../types';
import {requestOwnerCode,verifyOwnerCode,createOwnerSession,verifyOwnerSession} from '../auth/owner-session';
import {renderOwnerLogin,renderOwnerDashboard} from '../templates/owner';
import {searchLeads,updateLeadNotes,updateLeadStatus,exportLeadsCsv} from '../domain/owner-leads';
const html=(body:string,status=200,headers:HeadersInit={})=>new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store',...headers}});
export async function handleOwnerRequest(request:Request,env:Env){
 const url=new URL(request.url),form=request.method==='POST'?await request.clone().formData():null;
 if(url.pathname==='/owner/login')return html(renderOwnerLogin());
 if(url.pathname==='/owner/code'&&form){await requestOwnerCode(String(form.get('email')||''),env);return html(renderOwnerLogin('If approved, a code has been sent.'));}
 if(url.pathname==='/owner/verify'&&form){const result=await verifyOwnerCode(String(form.get('email')||''),String(form.get('code')||''),env);if(!result.ok)return html(renderOwnerLogin('Invalid or expired code.'),401);return new Response(null,{status:303,headers:{location:'/owner','set-cookie':await createOwnerSession(env)}});}
 const owner=await verifyOwnerSession(request.headers.get('cookie'),env);if(!owner)return new Response('Unauthorized',{status:401,headers:{'cache-control':'no-store'}});
 if(request.method==='POST'&&url.pathname==='/owner/logout')return new Response(null,{status:303,headers:{location:'/owner/login','set-cookie':'owner_session=; Path=/owner; Max-Age=0; HttpOnly; Secure; SameSite=Lax'}});
 if(url.pathname==='/owner/export'){return new Response(await exportLeadsCsv(env),{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="calvin-leads.csv"','cache-control':'no-store'}});}
 const match=url.pathname.match(/^\/owner\/leads\/([^/]+)\/(notes|status)$/);
 if(request.method==='POST'&&form&&match){if(match[2]==='notes')await updateLeadNotes(match[1],String(form.get('notes')||''),env);else await updateLeadStatus(match[1],String(form.get('status')||''),env);return new Response(null,{status:303,headers:{location:'/owner'}});}
 const rows=await searchLeads(url.searchParams.get('q')||'',url.searchParams.get('status'),env);return html(renderOwnerDashboard(rows));
}
