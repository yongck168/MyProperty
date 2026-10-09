import {describe,expect,it} from 'vitest';
import {escapeCsvCell,assertFollowUpStatus} from '../app/domain/owner-leads';
import {renderOwnerDashboard} from '../app/templates/owner';
describe('owner leads',()=>{
 it.each(['=SUM(1,1)','+cmd','-2+3','@evil'])('neutralizes spreadsheet formula %s',value=>expect(escapeCsvCell(value).replace(/^"/,'')).toMatch(/^'/));
 it('quotes CSV values safely',()=>expect(escapeCsvCell('Yong, Calvin')).toBe('"Yong, Calvin"'));
 it('accepts only declared statuses',()=>{
  expect(assertFollowUpStatus('viewing_planned')).toBe('viewing_planned');
  expect(()=>assertFollowUpStatus('deleted')).toThrow();
 });
 it('renders user content as text',()=>{
  const html=renderOwnerDashboard([{id:'1',name:'<script>alert(1)</script>',mobile_e164:'+6018',follow_up_status:'new',notes:'',last_seen_at:'2026-01-01',consent_text:'Agreed',consent_at:'2026-01-01'}]);
  expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');
 });
});
