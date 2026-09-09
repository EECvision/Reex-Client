
import { type Adapter, type AdapterUser, type AdapterSession, type AdapterAccount } from "@auth/core/adapters"
import { createClient } from "@supabase/supabase-js"

interface DbUser {
    id: string
    name?: string | null
    email?: string | null
    emailVerified?: string | Date | null
    image?: string | null
}

interface DbSession {
    sessionToken: string
    userId: string
    expires: string | Date
}

export function CustomSupabaseAdapter(options: { url: string; secret: string }): Adapter {
    const supabase = createClient(options.url, options.secret, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    return {
        async createUser(user) {
            console.log("[CustomAdapter] createUser", user)
            const { data, error } = await supabase
                .from("users")
                .insert({
                    name: user.name,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    image: user.image,
                })
                .select()
                .single()

            if (error) {
                console.error("[CustomAdapter] createUser error", error)
                throw error
            }
            return formatUser(data)
        },
        async getUser(id) {
            //   console.log("[CustomAdapter] getUser", id)
            const { data } = await supabase
                .from("users")
                .select()
                .eq("id", id)
                .single()

            if (!data) return null
            return formatUser(data)
        },
        async getUserByEmail(email) {
            //   console.log("[CustomAdapter] getUserByEmail", email)
            const { data } = await supabase
                .from("users")
                .select()
                .eq("email", email)
                .single()

            if (!data) return null
            return formatUser(data)
        },
        async getUserByAccount({ providerAccountId, provider }) {
            console.log("[CustomAdapter] getUserByAccount", { provider, providerAccountId })
            const { data } = await supabase
                .from("accounts")
                .select("item: users(*)")
                .eq("provider", provider)
                .eq("providerAccountId", providerAccountId)
                .single()

            if (!data?.item) return null

            const userObj = Array.isArray(data.item) ? data.item[0] : data.item;
            if (!userObj) return null;

            return formatUser(userObj as DbUser)
        },
        async updateUser(user) {
            console.log("[CustomAdapter] updateUser", user)
            const { data, error } = await supabase
                .from("users")
                .update({
                    name: user.name,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    image: user.image,
                })
                .eq("id", user.id!)
                .select()
                .single()

            if (error) throw error
            return formatUser(data)
        },
        async deleteUser(userId) {
            await supabase.from("users").delete().eq("id", userId)
        },
        async linkAccount(account) {
            console.log("[CustomAdapter] linkAccount", account)
            const { data, error } = await supabase
                .from("accounts")
                .insert({
                    userId: account.userId,
                    type: account.type,
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                    refresh_token: account.refresh_token,
                    access_token: account.access_token,
                    expires_at: account.expires_at,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token,
                    session_state: account.session_state,
                })
                .select()
                .single()

            if (error) {
                console.error("[CustomAdapter] linkAccount error", error)
                throw error
            }
            return formatAccount(data)
        },
        async unlinkAccount({ providerAccountId, provider }) {
            await supabase
                .from("accounts")
                .delete()
                .eq("provider", provider)
                .eq("providerAccountId", providerAccountId)
        },
        async createSession({ sessionToken, userId, expires }) {
            console.log("[CustomAdapter] createSession", { userId })
            const { data, error } = await supabase
                .from("sessions")
                .insert({
                    sessionToken,
                    userId,
                    expires,
                })
                .select()
                .single()

            if (error) {
                console.error("[CustomAdapter] createSession error", error)
                throw error
            }
            return formatSession(data)
        },
        async getSessionAndUser(sessionToken) {
            //   console.log("[CustomAdapter] getSessionAndUser", sessionToken)
            const { data } = await supabase
                .from("sessions")
                .select("*, user: users(*)")
                .eq("sessionToken", sessionToken)
                .single()

            if (!data) return null

            const { user, ...session } = data

            return {

                user: formatUser(user),
                session: formatSession(session),
            }
        },
        async updateSession(session) {
            console.log("[CustomAdapter] updateSession", session)
            const { data, error } = await supabase
                .from("sessions")
                .update({
                    expires: session.expires,
                })
                .eq("sessionToken", session.sessionToken)
                .select()
                .single()

            if (error) throw error

            return formatSession(data)
        },
        async deleteSession(sessionToken) {
            await supabase
                .from("sessions")
                .delete()
                .eq("sessionToken", sessionToken)
        },
    }
}

// Helpers to ensure dates are Date objects, not strings (Supabase returns strings)
function formatUser(user: DbUser): AdapterUser {
    return {
        id: user.id,
        name: user.name ?? null,
        email: user.email ?? "",
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
        image: user.image ?? null,
    }
}

function formatSession(session: DbSession): AdapterSession {
    return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: new Date(session.expires),
    }
}

function formatAccount(account: AdapterAccount): AdapterAccount {
    return account
}
