export type AuthStrategy = "jwt" | "cookie" | "next-auth";

export const providerCodeMap: Record<AuthStrategy, string> = {
  jwt: `import { ReexProvider } from "@/api-services/providers/ReexProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReexProvider strategy="jwt">
      {children}
    </ReexProvider>
  );
}`,

  cookie: `import { ReexProvider } from "@/api-services/providers/ReexProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReexProvider strategy="cookie">
      {children}
    </ReexProvider>
  );
}`,

  "next-auth": `import { ReexProvider } from "@/api-services/providers/ReexProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Automatically wraps your app with NextAuth SessionProvider & syncs auth headers
    <ReexProvider strategy="next-auth">
      {children}
    </ReexProvider>
  );
}`,
};

export const consumeCodeMap: Record<AuthStrategy, string> = {
  jwt: `import { usePostLoginMutation, usePostLogoutMutation, useGetBooksQuery } from "@/api-services/generated";
import { useAuthState } from "@/api-services/hooks/useAuthState";
import { useClearSession } from "@/api-services/hooks/useClearSession";
import { useHeaders } from "@/api-services/hooks/useHeaders";
import { useNotification } from "@/api-services/hooks/useNotification";
import { useTokens } from "@/api-services/hooks/useTokens";

export function App() {
  // Core Reex Hooks
  const { isAuthenticated } = useAuthState();
  const { clearSession } = useClearSession();
  const { setTokens } = useTokens();
  const { setCustomHeaders } = useHeaders();
  const { pushNotification } = useNotification();

  // Generated API Queries (Auto-runs when authenticated)
  const { data: books } = useGetBooksQuery({ enabled: isAuthenticated });

  // Generated API Mutations
  const { mutate: login, isPending: isLoginPending } = usePostLoginMutation();
  const { mutateAsync: logout, isPending: isLogoutPending } = usePostLogoutMutation();

  const handleLogin = () => {
    login(
      { email: "user@gmail.com", password: "password123" },
      {
        onSuccess: (res) => {
          // REQUIRED: Call \`setTokens\` after successful login.
          setTokens({
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken,
          });
          // OPTIONAL: Attach custom headers to all subsequent requests.
          setCustomHeaders({ "X-App-Version": "1.0.0", "X-Client-ID": "web-client" });
          pushNotification("Logged in successfully!");
        },
        onError: (err) => {
          // Reex automatically handles error toasts
        },
      }
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      // REQUIRED: Clear tokens, cancel pending requests & purge query cache
      clearSession();
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome! Books count: {books?.length ?? 0}</p>
          <button disabled={isLogoutPending} onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <button disabled={isLoginPending} onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}`,

  cookie: `import { usePostLoginMutation, usePostLogoutMutation, useGetBooksQuery } from "@/api-services/generated";
import { useAuthState } from "@/api-services/hooks/useAuthState";
import { useClearSession } from "@/api-services/hooks/useClearSession";
import { useHeaders } from "@/api-services/hooks/useHeaders";
import { useNotification } from "@/api-services/hooks/useNotification";

export function App() {
  // Core Reex Hooks
  const { isAuthenticated } = useAuthState();
  const { clearSession } = useClearSession();
  const { setCustomHeaders } = useHeaders();
  const { pushNotification } = useNotification();

  // Generated API Queries (Auto-attaches secure cookies via withCredentials: true)
  const { data: books } = useGetBooksQuery({ enabled: isAuthenticated });

  // Generated API Mutations
  const { mutate: login, isPending: isLoginPending } = usePostLoginMutation();
  const { mutateAsync: logout, isPending: isLogoutPending } = usePostLogoutMutation();

  const handleLogin = () => {
    login(
      { email: "user@gmail.com", password: "password123" },
      {
        onSuccess: (res) => {
          // NOTE: No \`setTokens\` needed! The backend automatically sets HttpOnly cookies.
          // OPTIONAL: Attach custom headers to all subsequent requests.
          setCustomHeaders({ "X-App-Version": "1.0.0", "X-Client-ID": "web-client" });
          pushNotification("Logged in successfully!");
        },
      }
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      // REQUIRED: Clears local cookie auth flag, cancels pending requests & purges query cache
      clearSession();
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome! Books count: {books?.length ?? 0}</p>
          <button disabled={isLogoutPending} onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <button disabled={isLoginPending} onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}`,

  "next-auth": `import { useSession, signIn, signOut } from "next-auth/react";
import { useGetBooksQuery } from "@/api-services/generated";
import { useClearSession } from "@/api-services/hooks/useClearSession";
import { useHeaders } from "@/api-services/hooks/useHeaders";
import { useNotification } from "@/api-services/hooks/useNotification";

export function App() {
  // NextAuth Session State
  const { status, data: session } = useSession();
  const isAuthenticated = status === "authenticated";

  // Core Reex Hooks
  const { clearSession } = useClearSession();
  const { setCustomHeaders } = useHeaders();
  const { pushNotification } = useNotification();

  // Generated API Queries
  // Reex's NextAuth interceptor automatically injects \`Authorization: Bearer <session.accessToken>\`
  const { data: books } = useGetBooksQuery({ enabled: isAuthenticated });

  const handleLogin = async () => {
    const res = await signIn("credentials", {
      email: "user@gmail.com",
      password: "password123",
      redirect: false,
    });

    if (res?.ok) {
      setCustomHeaders({ "X-App-Version": "1.0.0" });
      pushNotification("Signed in via NextAuth!");
    }
  };

  const handleLogout = async () => {
    // 1. Sign out of NextAuth session
    await signOut({ redirect: false });
    // 2. REQUIRED: Call \`clearSession\` to cancel pending requests & purge React Query cache
    clearSession();
  };

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Signed in as {session?.user?.email}</p>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <button onClick={handleLogin}>Login with NextAuth</button>
      )}
    </div>
  );
}`,
};

export const nextAuthRouteCodeString = `// @user-config — Example NextAuth integration with Reex-generated API services.
// Update this file to match your authentication API and user model.

import { authApi } from "@/api-services/definitions/auth";
import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Update these interfaces to match your backend response.
interface LoginUser {
  id: string;
  email: string;
  name?: string;
  [key: string]: unknown;
}

interface LoginTokens {
  accessToken: string;
  refreshToken?: string;
}

interface LoginResponse {
  data: {
    user: LoginUser;
    tokens: LoginTokens;
  };
}

export const authOptions: NextAuthOptions = {
  session: {
    // Use JWT sessions so the access token can be stored in the session.
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",

      // Update these fields to match your login form.
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Replace this with your login endpoint generated by Reex.
          const response = (await authApi.post_authLogin({
            email: credentials.email,
            password: credentials.password,
          })) as LoginResponse;

          const { user, tokens } = response.data;

          // Return \`null\` to reject the sign-in attempt.
          if (!tokens.accessToken) {
            return null;
          }

          // Return the user object that should be available in the
          // \`jwt\` callback. Include any additional fields you want
          // to persist in the session.
          return {
            ...user,
            accessToken: tokens.accessToken,
          };
        } catch (error) {
          console.error("Authentication failed:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Persist any user fields you want available in the session.
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;

        // Store the access token for authenticated API requests.
        token.accessToken = user.accessToken;
      }

      return token;
    },

    async session({ session, token }) {
      // Expose the fields your application needs on the client.
      session.user = {
        id: token.sub!,
        name: token.name,
        email: token.email,
      };

      // Expose the access token if your client needs it.
      session.accessToken = token.accessToken as string;

      return session;
    },
  },

  // REQUIRED: Set NEXTAUTH_SECRET in your environment variables.
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };`;

// Fallback / legacy exports
export const providerCodeString = providerCodeMap.jwt;
export const consumeCodeString = consumeCodeMap.jwt;


