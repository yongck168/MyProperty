export function isSameOriginMutation(request:Request,siteOrigin:string){
 if(!['POST','PUT','PATCH','DELETE'].includes(request.method))return true;
 const origin=request.headers.get('origin');return origin===siteOrigin;
}
export function withSecurityHeaders(response:Response,requestId:string){
 const h=new Headers(response.headers);
 h.set('x-request-id',requestId);h.set('x-frame-options','DENY');h.set('x-content-type-options','nosniff');
 h.set('referrer-policy','strict-origin-when-cross-origin');h.set('permissions-policy','camera=(), microphone=(), geolocation=()');
 h.set('content-security-policy',"default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'");
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
}
