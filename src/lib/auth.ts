import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserModel } from '@/models/user';
import { connectDB } from '@/lib/db';

if (process.env.NODE_ENV === 'production') {
  process.env.NEXTAUTH_URL = 'https://mediflow.shanmukhmedisetty.site';
}

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
          // Check if identifier matches a Hospital Admin ID or Hospital Admin Email
          const hospital = await HospitalModel.findOne({
            $or: [
              { 'credentials.hospitalAdminId': inputIdentifier },
              { 'credentials.hospitalAdminEmail': inputIdentifier.toLowerCase() },
              { hospitalId: inputIdentifier },
              { applicantGoogleEmail: inputIdentifier.toLowerCase() },
            ],
            status: 'approved',
          });

          if (hospital) {
            // Validate password against rawTempPassword or passwordHash or user account
            const storedPassword = hospital.credentials?.rawTempPassword || hospital.credentials?.passwordHash;
            if (password && storedPassword && password === storedPassword) {
              return {
                id: hospital.hospitalId,
                email: hospital.credentials.hospitalAdminEmail || hospital.applicantGoogleEmail,
                name: `${hospital.name} Admin`,
                role: 'hospital_admin',
                hospitalId: hospital.hospitalId,
                hospitalName: hospital.name,
              } as SessionUser;
            } else if (password) {
              // Also check if UserModel exists with password
              const userHosp = await UserModel.findOne({
                email: inputIdentifier.toLowerCase(),
                role: 'hospital_admin',
              });
              if (userHosp && userHosp.password === password) {
                return {
                  id: userHosp._id.toString(),
                  email: userHosp.email,
                  name: userHosp.name,
                  role: 'hospital_admin',
                  hospitalId: userHosp.hospitalId || hospital.hospitalId,
                  hospitalName: userHosp.hospitalName || hospital.name,
                } as SessionUser;
              }
              throw new Error('Invalid Hospital Admin credentials or password.');
            }
          }

          // Check if user is registered in UserModel as hospital_admin directly
          const hospUser = await UserModel.findOne({
            $or: [
              { email: inputIdentifier.toLowerCase() },
              { hospitalId: inputIdentifier },
            ],
            role: 'hospital_admin',
          });

          if (hospUser && password && hospUser.password === password) {
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

        // 2. Evaluator Demo Admin
        if (email === 'mediflow@test.com') {
          if (password !== 'mediflow@2026') {
            throw new Error('Invalid password for demo account');
          }

          try {
            let user = await UserModel.findOne({ email });
            if (!user) {
              user = new UserModel({
                email,
                name: 'MediFlow Evaluator',
                role: 'admin',
              });
              await user.save();
            } else if (user.role !== 'admin') {
              user.role = 'admin';
              await user.save();
            }

            return {
              id:    user._id.toString(),
              email,
              name:  user.name,
              role:  'admin',
            } as SessionUser;
          } catch (error: any) {
            console.error('MediFlow evaluator auth error:', error);
            throw new Error(`Authentication failed — ${error.message || 'database error'}`);
          }
        }

        // 3. Standard Google / User Login
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
            role:         user.role || 'patient',
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
      if (user) {
        token.id           = user.id;
        token.email        = user.email;
        token.name         = user.name;
        token.picture      = user.image;
        token.role         = (user as SessionUser).role || 'patient';
        token.hospitalId   = (user as SessionUser).hospitalId;
        token.hospitalName = (user as SessionUser).hospitalName;
      } else if (token.email) {
        try {
          await connectDB();
          const dbUser: any = await UserModel.findOne({ email: token.email }).select('role doctorApplicationStatus hospitalId hospitalName').lean();
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
