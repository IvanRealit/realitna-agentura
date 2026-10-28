import { NextRequest,NextResponse } from 'next/server';
export function proxy(req:NextRequest){
 const l=req.nextUrl.pathname.split('/')[1];const h=new Headers(req.headers);h.set('x-locale',['sk','uk','en'].includes(l)?l:'sk');
 if(req.nextUrl.pathname==='/') return NextResponse.redirect(new URL('/sk',req.url));
 return NextResponse.next({request:{headers:h}});
}
export const config={matcher:['/((?!api|_next|images|uploads|favicon.ico|robots.txt|sitemap.xml).*)']};
