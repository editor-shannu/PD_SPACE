import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserModel } from '@/models/user';
import { connectDB } from '@/lib/db';

import { HospitalModel } from '@/models/hospital';

export interface SessionUser extends NextAuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  role?: 'patient' | 'doctor' | 'admin' | 'hospital_admin';
  hospitalId?: string;
  hospitalName?: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials & Google',
      credentials: {
        email:        { label: 'Email / Hospital ID', type: 'text' },
        password:     { label: 'Password', type: 'password' },
        name:         { label: 'Name',     type: 'text' },
        image:        { label: 'Image',    type: 'text' },
        uid:          { label: 'UID',      type: 'text' },
        role:         { label: 'Role',     type: 'text' },
        hospitalAuth: { label: 'Hospital Auth', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error('No email or Hospital ID provided');
        }

        const inputIdentifier = credentials.email.trim();
        const password = credentials.password;
        const isHospitalAuth = credentials.hospitalAuth === 'true';

        await connectDB();

        // 1. Check Hospital Admin login credentials
        if (isHospitalAuth || password) {
          const cleanIdentifier = inputIdentifier.trim();
          const cleanEmail = cleanIdentifier.toLowerCase();
          const idRegex = new RegExp(`^${cleanIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

          // Check if identifier matches a Hospital Admin ID or Hospital Admin Email (case-insensitive)
          const hospital: any = await HospitalModel.findOne({
            $or: [
              { 'credentials.hospitalAdminId': idRegex },
              { 'credentials.hospitalAdminEmail': cleanEmail },
              { hospitalId: idRegex },
              { applicantGoogleEmail: cleanEmail },
              { contactEmail: cleanEmail },
            ],
            status: 'approved',
          });

          if (hospital) {
            const rawPass = hospital.credentials?.rawTempPassword?.trim();
            const hashPass = hospital.credentials?.passwordHash?.trim();
            const cleanInputPass = password ? password.trim() : '';

            // 1a. Direct match against hospital credentials
            if (cleanInputPass && ((rawPass && cleanInputPass === rawPass) || (hashPass && cleanInputPass === hashPass))) {
              const adminEmail = (hospital.credentials?.hospitalAdminEmail || hospital.contactEmail || hospital.applicantGoogleEmail).toLowerCase().trim();

              // Ensure UserModel is synced with hospital_admin role & password
              let uAdmin = await UserModel.findOne({
                $or: [
                  { email: adminEmail },
                  { hospitalId: hospital.hospitalId },
                ],
              });
              if (uAdmin) {
                uAdmin.role = 'hospital_admin';
                uAdmin.hospitalId = hospital.hospitalId;
                uAdmin.hospitalName = hospital.name;
                uAdmin.password = cleanInputPass;
                await uAdmin.save();
              }

              return {
                id: hospital.hospitalId,
                email: adminEmail,
                name: `${hospital.name} Admin`,
                role: 'hospital_admin',
                hospitalId: hospital.hospitalId,
                hospitalName: hospital.name,
              } as SessionUser;
            }

            // 1b. Match against UserModel password linked to this hospital
            if (cleanInputPass) {
              const userHosp = await UserModel.findOne({
                $or: [
                  { email: cleanEmail },
                  { hospitalId: hospital.hospitalId },
                ],
                role: 'hospital_admin',
              });

              if (userHosp && userHosp.password && userHosp.password.trim() === cleanInputPass) {
                return {
                  id: userHosp._id.toString(),
                  email: userHosp.email,
                  name: userHosp.name || `${hospital.name} Admin`,
                  role: 'hospital_admin',
                  hospitalId: userHosp.hospitalId || hospital.hospitalId,
                  hospitalName: userHosp.hospitalName || hospital.name,
                } as SessionUser;
              }
            }

            throw new Error('Invalid Hospital Admin credentials or password.');
          }

          // Fallback: Check if user is registered in UserModel as hospital_admin directly
          const hospUser = await UserModel.findOne({
            $or: [
              { email: cleanEmail },
              { hospitalId: idRegex },
            ],
            role: 'hospital_admin',
          });

          if (hospUser && password && hospUser.password && hospUser.password.trim() === password.trim()) {
            return {
              id: hospUser._id.toString(),
              email: hospUser.email,
              name: hospUser.name,
              role: 'hospital_admin',
              hospitalId: hospUser.hospitalId,
              hospitalName: hospUser.hospitalName,
            } as SessionUser;
          }
        }

        const email = inputIdentifier.toLowerCase();

        // 2. Standard Google / User Login
        const name  = credentials.name  || email.split('@')[0];
        const image = credentials.image || null;
        const isAdminEmail = email === 'heallink.care@gmail.com';

        try {
          // Upsert: find or create user record in MongoDB
          let user = await UserModel.findOne({ email });
          if (!user) {
            user = new UserModel({
              email,
              name,
              role: isAdminEmail ? 'admin' : 'patient',
            });
            await user.save();
          } else {
            let updated = false;
            if (user.name !== name) {
              user.name = name;
              updated = true;
            }
            if (isAdminEmail && user.role !== 'admin') {
              user.role = 'admin';
              updated = true;
            }
            if (updated) {
              await user.save();
            }
          }

          return {
            id:           user._id.toString(),
            email,
            name,
            image,
            role:         isAdminEmail ? 'admin' : (user.role || 'patient'),
            hospitalId:   user.hospitalId,
            hospitalName: user.hospitalName,
          } as SessionUser;
        } catch (error: any) {
          console.error('MediFlow auth error:', error);
          throw new Error(`Authentication failed — ${error.message || 'database error'}`);
        }
      },
    }),
  ],

  pages: {
    signIn: '/auth/login',
    error:  '/auth/login',
  },

  callbacks: {
    async jwt({ token, user }) {
      const userEmail = token.email?.toLowerCase().trim();

      if (user) {
        token.id           = user.id;
        token.email        = user.email;
        token.name         = user.name;
        token.picture      = user.image;
        token.role         = (user as SessionUser).role || (userEmail === 'heallink.care@gmail.com' ? 'admin' : 'patient');
        token.hospitalId   = (user as SessionUser).hospitalId;
        token.hospitalName = (user as SessionUser).hospitalName;
      } else if (userEmail) {
        try {
          await connectDB();
          // Check if user is a Hospital Admin in HospitalModel
          const approvedHospital: any = await HospitalModel.findOne({
            $or: [
              { applicantGoogleEmail: userEmail },
              { 'credentials.hospitalAdminEmail': userEmail },
              { contactEmail: userEmail },
              { hospitalId: token.hospitalId || '' },
            ],
            status: 'approved',
          }).lean();

          if (approvedHospital) {
            token.role = 'hospital_admin';
            token.hospitalId = approvedHospital.hospitalId;
            token.hospitalName = approvedHospital.name;
          } else if (userEmail === 'heallink.care@gmail.com') {
            token.role = 'admin';
          } else {
            const dbUser: any = await UserModel.findOne({ email: userEmail }).select('role doctorApplicationStatus hospitalId hospitalName').lean();
            if (dbUser) {
              if (dbUser.role === 'hospital_admin') {
                token.role = 'hospital_admin';
                token.hospitalId = dbUser.hospitalId;
                token.hospitalName = dbUser.hospitalName;
              } else if (dbUser.doctorApplicationStatus === 'approved' || dbUser.role === 'doctor' || dbUser.role === 'admin') {
                token.role = dbUser.role === 'admin' ? 'admin' : 'doctor';
                token.hospitalId = dbUser.hospitalId;
                token.hospitalName = dbUser.hospitalName;
              } else {
                token.role = dbUser.role || 'patient';
              }
            }
          }
        } catch (e) {
          // fallback to cached token role if DB connection fails
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id           = token.id           as string;
        (session.user as any).email        = token.email        as string;
        (session.user as any).name         = token.name         as string;
        (session.user as any).image        = token.picture      as string;
        (session.user as any).role         = (token.role        as string) || 'patient';
        (session.user as any).hospitalId   = token.hospitalId   as string;
        (session.user as any).hospitalName = token.hospitalName as string;
      }
      return session;
    },
  },

  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? '.shanmukhmedisetty.site' : undefined,
      },
    },
  },

  session: {
    strategy: 'jwt',
    maxAge:   30 * 24 * 60 * 60,
  },


  jwt: {
    secret: process.env.NEXTAUTH_SECRET || 'default-mediflow-jwt-secret-key-1234567890-abcdef',
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET || 'default-mediflow-jwt-secret-key-1234567890-abcdef',
};
