export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            test_collections: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    auth: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    auth?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    auth?: Json
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            recent_collections: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    content: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    content: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    content?: Json
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            test_collection_requests: {
                Row: {
                    id: string
                    collection_id: string
                    name: string
                    method: string
                    url: string
                    headers: Json
                    params: Json
                    body: Json
                    auth: Json
                    sort_order: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    collection_id: string
                    name: string
                    method: string
                    url: string
                    headers?: Json
                    params?: Json
                    body?: Json
                    auth?: Json
                    sort_order?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    collection_id?: string
                    name?: string
                    method?: string
                    url?: string
                    headers?: Json
                    params?: Json
                    body?: Json
                    auth?: Json
                    sort_order?: number
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "test_collection_requests_collection_id_fkey"
                        columns: ["collection_id"]
                        isOneToOne: false
                        referencedRelation: "test_collections"
                        referencedColumns: ["id"]
                    }
                ]
            }
            issues: {
                Row: {
                    id: string
                    user_id: string
                    subject: string
                    description: string
                    status: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    subject: string
                    description: string
                    status?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    subject?: string
                    description?: string
                    status?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "issues_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
