import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserModel } from '@/models/user';
import { connectDB } from '@/lib/db';

if (process.env.NODE_ENV === 'production') {
  process.env.NEXTAUTH_URL = 'https://mediflow.shanmukhmedisetty.site';
}

export interface SessionUser extends NextAuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  role?: 'patient' | 'doctor' | 'admin';
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Firebase Google',
      credentials: {
        email:    { label: 'Email',    type: 'text' },
        name:     { label: 'Name',     type: 'text' },
        image:    { label: 'Image',    type: 'text' },
        uid:      { label: 'UID',      type: 'text' },
        role:     { label: 'Role',     type: 'text' },
      },
      async authorize(credentials) {
        // Require at minimum an email from Firebase
        if (!credentials?.email) {
          throw new Error('No email provided from Google sign-in');
        }

        const email = credentials.email.trim().toLowerCase();
        const name  = credentials.name  || email.split('@')[0];
        const image = credentials.image || null;
        const isAdminEmail = email === 'heallink.care@gmail.com';
        const targetRole = isAdminEmail ? 'admin' : 'patient';

        try {
          await connectDB();

          // Upsert: find or create user record in MongoDB
          let user = await UserModel.findOne({ email });
          if (!user) {
            user = new UserModel({
              email,
              name,
              role: targetRole,
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
            if (!isAdminEmail && user.role === 'admin') {
              user.role = 'patient';
              updated = true;
            }
            if (updated) {
              await user.save();
            }
          }

          return {
            id:    user._id.toString(),
            email,
            name,
            image,
            role:  user.role || 'patient',
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
        token.id      = user.id;
        token.email   = user.email;
        token.name    = user.name;
        token.picture = user.image;
        token.role    = (user as SessionUser).role || 'patient';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id    = token.id      as string;
        (session.user as any).email = token.email   as string;
        (session.user as any).name  = token.name    as string;
        (session.user as any).image = token.picture as string;
        (session.user as any).role  = (token.role   as string) || 'patient';
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
