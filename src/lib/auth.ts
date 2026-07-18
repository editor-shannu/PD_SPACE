/**
 * NextAuth configuration for MediFlow
 * Strategy: Firebase handles Google auth client-side.
 * Client passes verified user fields (email, name, image, uid) directly.
 * Server upserts user record in MongoDB and creates a session.
 *
 * Note: We trust these credentials because Firebase already verified
 * the Google token on the client. For full server-side verification,
 * add Firebase Admin SDK.
 */

import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserModel } from '@/models/user';
import { connectDB } from '@/lib/db';

export interface SessionUser extends NextAuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
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
      },
      async authorize(credentials) {
        // Require at minimum an email from Firebase
        if (!credentials?.email) {
          throw new Error('No email provided from Google sign-in');
        }

        const email = credentials.email.trim().toLowerCase();
        const name  = credentials.name  || email.split('@')[0];
        const image = credentials.image || null;

        try {
          await connectDB();

          // Upsert: find or create user record in MongoDB
          let user = await UserModel.findOne({ email });
          if (!user) {
            user = new UserModel({ email, name });
            await user.save();
          } else if (user.name !== name) {
            user.name = name;
            await user.save();
          }

          return {
            id:    user._id.toString(),
            email,
            name,
            image,
          };
        } catch (error) {
          console.error('MediFlow auth error:', error);
          throw new Error('Authentication failed — could not reach database');
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id    = token.id      as string;
        (session.user as any).email = token.email   as string;
        (session.user as any).name  = token.name    as string;
        (session.user as any).image = token.picture as string;
      }
      return session;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge:   30 * 24 * 60 * 60,
  },

  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
};
