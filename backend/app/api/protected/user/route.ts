import { NextRequest, NextResponse } from "next/server"
import { validateUserJWT } from '@/lib/api-guard';
import { findUserById } from "@/lib/services";

// export const GET =  (handler: AuthenticatedHandl)=> {
//   return async (req: NextRequest, routeContext: any) => {
//     let token = req.cookies.get('session')?.value;
//     if (!token) {
//       const authHeader = req.headers.get('authorization');
//       if (authHeader?.startsWith('Bearer ')) token = authHeader.split(' ')[1];
//     }

//     if (!token) {
//       return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
//     }

//     try {
//       const { payload } = await jwtVerify(token, SECRET_KEY);
//       const tenantId = payload.tenantId as string;
//       const acceptLanguage = req.headers.get('accept-language') || 'en';
//       const locale: 'en' | 'af' = acceptLanguage.toLowerCase().includes('af') ? 'af' : 'en';
//       const tenantDbClient = createTenantPrismaClient(tenantId);
//       const apiContext: AuthenticatedAPIContext = {
//         tenantId,
//         userId: payload.userId as string,
//         role: (payload.role as 'FIRM_USER' | 'SUPER_ADMIN') || 'FIRM_USER',
//         locale,
//         db: tenantDbClient
//       };
//       return await handler(req, apiContext, routeContext?.params);
//     } catch (error) {
//       return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
//     }
//   };
// }

export async function GET(req: NextRequest, res:NextResponse){
  let token = req.cookies.get('session')?.value;
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) token = authHeader.split(' ')[1];
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

     try {
      const { payload } = await validateUserJWT(token);
      const user = await findUserById(payload.userId as string);
      if (!user) {
        return NextResponse.json({ error: "Account does not exist" }, { status: 404 });
      }
      return NextResponse.json({ user }, { status: 200 });
    } catch (error) {
      console.log(error)
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }
  
}
