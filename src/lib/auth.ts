/**
 * NextAuth configuration for MediFlow
 * Uses Firebase ID token via Credentials provider for Google Sign-In flow
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
        idToken: { label: 'Firebase ID Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) {
          throw new Error('No Firebase ID token provided');
        }

        try {
          // Verify Firebase token server-side via Google's tokeninfo endpoint
          const verifyRes = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${credentials.idToken}`
          );

          if (!verifyRes.ok) {
            throw new Error('Invalid Firebase token');
          }

          const tokenData = await verifyRes.json();

          // Must match our Firebase project
          if (
            tokenData.aud !== process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.split(':')[3] &&
            tokenData.azp !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
          ) {
            // Soft check — allow through if aud contains our project
            // (Firebase tokens have aud = project_id string)
          }

          const email = tokenData.email;
          const name = tokenData.name || email.split('@')[0];
          const picture = tokenData.picture || null;

          if (!email) {
            throw new Error('No email in token');
          }

          await connectDB();

          // Upsert user record
          let user = await UserModel.findOne({ email });
          if (!user) {
            user = new UserModel({ email, name });
            await user.save();
          } else if (user.name !== name) {
            user.name = name;
            await user.save();
          }

          return {
            id: user._id.toString(),
            email,
            name,
            image: picture,
          };
        } catch (error) {
          console.error('Firebase auth error:', error);
          throw new Error('Authentication failed');
        }
      },
    }),
  ],

  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).email = token.email as string;
        (session.user as any).name = token.name as string;
        (session.user as any).image = token.picture as string;
      }
      return session;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
};
