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
            api_collections: {
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
            history_collections: {
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
            api_requests: {
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
                        foreignKeyName: "api_requests_collection_id_fkey"
                        columns: ["collection_id"]
                        isOneToOne: false
                        referencedRelation: "api_collections"
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
