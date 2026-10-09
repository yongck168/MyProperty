import type {Env} from '../types';
export const FOLLOW_UP_STATUSES=['new','contacted','viewing_planned','follow_up','qualified','closed_won','closed_lost','do_not_contact'] as const;
export type FollowUpStatus=typeof FOLLOW_UP_STATUSES[number];
export function assertFollowUpStatus(value:string):FollowUpStatus{if(!(FOLLOW_UP_STATUSES as readonly string[]).includes(value))throw new Error('Invalid follow-up status');return value as FollowUpStatus;}
export function escapeCsvCell(value:unknown){let s=String(value??'');if(/^[=+\-@]/.test(s))s="'"+s;return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
export async function searchLeads(query:string,status:string|null,env:Env){
 const q=`%${query.replace(/[\s()+-]/g,'')}%`;let sql=`SELECT l.*,c.consent_text,c.created_at consent_at FROM leads l LEFT JOIN consent_events c ON c.id=(SELECT id FROM consent_events WHERE lead_id=l.id ORDER BY created_at DESC LIMIT 1) WHERE (replace(replace(replace(l.mobile_e164,'+',''),' ',''),'-','') LIKE ? OR l.name LIKE ?)`;
 const values:any[]=[q,`%${query}%`];if(status){sql+=' AND l.follow_up_status=?';values.push(assertFollowUpStatus(status));}sql+=' ORDER BY l.last_seen_at DESC LIMIT 500';
 const result=await env.DB.prepare(sql).bind(...values).all<any>();return result.results;
}
export async function updateLeadNotes(id:string,notes:string,env:Env){await env.DB.prepare('UPDATE leads SET notes=?,updated_at=? WHERE id=?').bind(notes.slice(0,5000),new Date().toISOString(),id).run();}
export async function updateLeadStatus(id:string,status:string,env:Env){
 const next=assertFollowUpStatus(status),current=await env.DB.prepare('SELECT follow_up_status FROM leads WHERE id=?').bind(id).first<any>(),now=new Date().toISOString();
 await env.DB.batch([env.DB.prepare('UPDATE leads SET follow_up_status=?,updated_at=? WHERE id=?').bind(next,now,id),env.DB.prepare('INSERT INTO lead_status_events(id,lead_id,previous_status,new_status,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,current?.follow_up_status??null,next,now)]);
}
export async function exportLeadsCsv(env:Env){const rows=await searchLeads('',null,env);const columns=['name','mobile_e164','follow_up_status','notes','first_seen_at','last_seen_at','consent_text','consent_at'];return [columns.join(','),...rows.map((r:any)=>columns.map(c=>escapeCsvCell(r[c])).join(','))].join('\r\n');}
