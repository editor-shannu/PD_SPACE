/**
 * NextAuth configuration and setup
 * This file contains the authentication configuration
 * Ready to connect to a real provider (Credentials, Google, GitHub, etc.)
 */

import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserModel } from '@/models/user';
import { connectDB } from '@/lib/db';

/**
 * Extended User type for NextAuth session
 */
export interface SessionUser extends NextAuthUser {
  id: string;
  email: string;
  name: string;
}

/**
 * NextAuth options configuration
 * Currently uses mock Credentials provider for demonstration
 * Ready to add real providers (Google, GitHub, etc.)
 */
export const authOptions: NextAuthOptions = {
  providers: [
    /**
     * Credentials Provider (Mock implementation)
     * In production, this would validate against a real authentication service
     * or be replaced with OAuth providers (Google, GitHub, etc.)
     */
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        try {
          await connectDB();

          // Mock authentication - in production, verify password against hashed password
          // For now, accept any email/password combination and create/retrieve user
          let user = await UserModel.findOne({ email: credentials.email });

          if (!user) {
            // Create new user if doesn't exist (mock setup)
            user = new UserModel({
              email: credentials.email,
              name: credentials.email.split('@')[0], // Use email prefix as name for demo
            });
            await user.save();
          }

          return {
            id: user._id?.toString() || '',
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw new Error('Authentication failed');
        }
      },
    }),
  ],

  /**
   * Page configurations for custom login/error pages
   */
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  /**
   * Callback functions for authentication events
   */
  callbacks: {
    /**
     * JWT callback - called when creating/updating JWT token
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },

    /**
     * Session callback - called when retrieving session
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },

  /**
   * Session configuration
   */
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  /**
   * JWT configuration
   */
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  /**
   * Secret for NextAuth
   */
  secret: process.env.NEXTAUTH_SECRET,
};
