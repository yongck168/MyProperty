import type {Env} from '../types';
import {normalizeMalaysianMobile} from './mobile';
import {CONSENT_TEXT} from './consent';
export interface RegistrationInput{name:string;mobile:string;consent:boolean}
export interface VisitContext{path:string;requestId:string;referrer?:string|null;utmSource?:string|null;utmMedium?:string|null;utmCampaign?:string|null;userAgentFamily?:string|null;countryCode?:string|null}
export async function registerLead(input:RegistrationInput,ctx:VisitContext,env:Env){
 const name=input.name.trim(); if(!name)throw new Error('name required');
 const mobile=normalizeMalaysianMobile(input.mobile); if(!mobile.ok)throw new Error('invalid mobile');
 if(!input.consent)throw new Error('consent required');
 const now=new Date().toISOString(),existing=await env.DB.prepare('SELECT id FROM leads WHERE mobile_e164=?').bind(mobile.e164).first<{id:string}>(),leadId=existing?.id??crypto.randomUUID(),sessionId=crypto.randomUUID();
 const lead=env.DB.prepare(`INSERT INTO leads(id,name,mobile_e164,mobile_display,first_seen_at,last_seen_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(mobile_e164) DO UPDATE SET name=excluded.name,mobile_display=excluded.mobile_display,last_seen_at=excluded.last_seen_at,visit_count=visit_count+1,updated_at=excluded.updated_at`).bind(leadId,name,mobile.e164,mobile.display,now,now,now,now);
 const consent=env.DB.prepare(`INSERT INTO consent_events(id,lead_id,consented,consent_text_version,consent_text,source_path,privacy_version,request_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),leadId,1,env.CONSENT_TEXT_VERSION,CONSENT_TEXT,ctx.path,env.PRIVACY_POLICY_VERSION,ctx.requestId,now);
 const visit=env.DB.prepare(`INSERT INTO visits(id,lead_id,session_id,path,referrer,utm_source,utm_medium,utm_campaign,user_agent_family,country_code,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),leadId,sessionId,ctx.path,ctx.referrer??null,ctx.utmSource??null,ctx.utmMedium??null,ctx.utmCampaign??null,ctx.userAgentFamily??null,ctx.countryCode??null,now);
 await env.DB.batch([lead,consent,visit]);
 return {leadId,mobileE164:mobile.e164,mobileDisplay:mobile.display};
}
