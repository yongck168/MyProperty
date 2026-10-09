export type MobileResult={ok:true;e164:string;display:string}|{ok:false;reason:string};
export function normalizeMalaysianMobile(input:string):MobileResult{
  let digits=input.trim().replace(/[\s()\-]/g,'').replace(/^\+/,'');
  if(!/^\d+$/.test(digits)) return {ok:false,reason:'Enter a valid Malaysian mobile number.'};
  if(digits.startsWith('0')) digits='6'+digits;
  if(!digits.startsWith('60')) return {ok:false,reason:'Enter a Malaysian mobile number.'};
  const e164='+'+digits;
  if(!/^\+601[0-9]{8,9}$/.test(e164)) return {ok:false,reason:'Enter a valid Malaysian mobile number.'};
  const local=digits.slice(2);
  return {ok:true,e164,display:`+60 ${local.slice(0,2)}-${local.slice(2,5)} ${local.slice(5)}`};
}
