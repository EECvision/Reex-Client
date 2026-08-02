export type AuthStrategy = "localstorage" | "cookie" | "next-auth";

export const providerCodeMap: Record<AuthStrategy, string> = {
  localstorage: `import { ReexProvider } from "@/api-services/providers/ReexProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReexProvider strategy="localstorage">
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
  localstorage: `import { usePostLoginMutation, usePostLogoutMutation, useGetBooksQuery } from "@/api-services/generated";
import { useAuthState } from "@/api-services/hooks/useAuthState";
import { useClearSession } from "@/api-services/hooks/useClearSession";
import { useHeaders } from "@/api-services/hooks/useHeaders";
import { useNotification } from "@/api-services/hooks/useNotification";
import { useTokens } from "@/api-services/hooks/useTokens";

export function App() {
  // Core Reex Hooks
  const { isAuthenticated } = useAuthState();
  const { pushNotification } = useNotification();
  const { setTokens } = useTokens();
  const { setCustomHeaders } = useHeaders();
  const { clearSession } = useClearSession();

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
          // REQUIRED: Call \`setTokens\` after successful login to store tokens in localStorage.
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
  const { pushNotification } = useNotification();
  const { setCustomHeaders } = useHeaders();
  const { clearSession } = useClearSession();

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
}

/* 
 * NextAuth Setup Example (app/api/auth/[...nextauth]/route.ts):
 * 
 * callbacks: {
 *   async jwt({ token, user }) {
 *     if (user) token.accessToken = (user as any).accessToken;
 *     return token;
 *   },
 *   async session({ session, token }) {
 *     session.accessToken = token.accessToken as string;
 *     return session;
 *   },
 * }
 */`,
};

// Fallback / legacy exports
export const providerCodeString = providerCodeMap.localstorage;
export const consumeCodeString = consumeCodeMap.localstorage;

