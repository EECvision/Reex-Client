export const providerCodeString = `import { ReexProvider } from "@/api-services/providers/ReexProvider";

export default function AppLayout({ children }) {
  return (
    <ReexProvider strategy="localstorage">
      {children}
    </ReexProvider>
  );
}`;

export const consumeCodeString = `import { usePostLoginMutation, usePostLogoutMutation } from "@/api-services/generated";
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

  // Generated API Hooks
  const { mutate: login, isPending: isLoginPending } = usePostLoginMutation();
  const { mutateAsync: logout, isPending: isLogoutPending } = usePostLogoutMutation();

  const handleLogin = () => {
    login(
      { email: "user@gmail.com", password: "123456" },
      {
        onSuccess: (res) => {
          // REQUIRED: Call \`setTokens\` after a successful login or signup to initialize the authenticated session.
          setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
          // OPTIONAL: Call \`setCustomHeaders\` to include additional headers with every API request.
          setCustomHeaders({ "X-App-Version": "1.0.0", "X-Client-ID": "my-app" });
          // OPTIONAL: Trigger a global notification on successful login.
          pushNotification(res.message);
        },
        onError: () => {
          // Reex automatically handles errors and dispatches global notifications.
          // Use this callback to run additional logic when an error occurs.
        },
      }
    );
  };

  const handleLogout = async () => {
    const res = await logout();
    // REQUIRED: Call \`clearSession\` after a successful logout to clear the authenticated session.
    if (res) clearSession();
  };

  return (
    <>
      {isAuthenticated ? (
        <button disabled={isLogoutPending} onClick={handleLogout}>Logout</button>
      ) : (
        <button disabled={isLoginPending} onClick={handleLogin}>Login</button>
      )}
    </>
  );
}`;
