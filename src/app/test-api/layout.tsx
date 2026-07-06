import React from "react";
import { UIProvider } from "@/providers/UIContext";

export default function TestApiLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <UIProvider>
            {children}
        </UIProvider>
    );
}
