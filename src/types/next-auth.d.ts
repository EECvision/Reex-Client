import { DefaultSession, DefaultUser } from "next-auth"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            id: string
            subscription_status?: string
            subscription_plan?: string
            subscription_id?: string
            customer_code?: string
            current_period_end?: string
            project_import_count?: number
        } & DefaultSession["user"]
    }

    interface User extends DefaultUser {
        subscription_status?: string
        subscription_plan?: string
        subscription_id?: string
        customer_code?: string
        current_period_end?: string
        project_import_count?: number
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        subscription_status?: string
        subscription_plan?: string
        subscription_id?: string
        customer_code?: string
        current_period_end?: string
        project_import_count?: number
    }
}
