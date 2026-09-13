import React from "react";
import { UIProvider } from "@/providers/UIContext";
import { pageMetadata } from "@/config/seo";

export const metadata = pageMetadata({
    title: "API Sandbox",
    description: "Build, save, and test API requests in your browser with the Reex API sandbox.",
    path: "/sandbox",
    index: false,
});

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
