// // components/LoginForm.tsx
// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { apiClient } from "../config";
// import { localStorageTokenProvider } from "../config/token-providers";

// export const LoginForm = () => {
//   const router = useRouter();
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       // 1. Call your API
//       const res = await apiClient.post("/api/v1/auth/login", {
//         email,
//         password,
//       });

//       // 2. CRITICAL: Save the tokens manually!
//       // Adjust 'res.data.accessToken' to match your actual API response structure
//       localStorageTokenProvider.setTokens(
//         res.data.accessToken,
//         res.data.refreshToken,
//       );

//       // 3. Redirect to dashboard
//       router.push("/dashboard");
//     } catch (err) {
//       console.error("Login failed", err);
//       alert("Invalid credentials");
//     }
//   };

//   return (
//     <form onSubmit={handleLogin}>
//       <input
//         type="email"
//         value={email}
//         onChange={(e) => setEmail(e.target.value)}
//         placeholder="Email"
//       />
//       <input
//         type="password"
//         value={password}
//         onChange={(e) => setPassword(e.target.value)}
//         placeholder="Password"
//       />
//       <button type="submit">Login</button>
//     </form>
//   );
// };
