"use client";

import React, { useState, useEffect } from "react";
import styles from "./docs.module.css";
import { useAuth } from "@/providers/AuthContext";
import { docSections, DocSection } from "./content";
import { ChevronRight } from "lucide-react";

// Helper to recursively find a section by ID
const findSectionById = (sections: DocSection[], id: string): DocSection | undefined => {
    for (const section of sections) {
        if (section.id === id) return section;
        if (section.items) {
            const found = findSectionById(section.items, id);
            if (found) return found;
        }
    }
    return undefined;
};

// Helper to find parent ID of a section
const findParentId = (sections: DocSection[], targetId: string): string | undefined => {
    for (const section of sections) {
        if (section.items) {
            if (section.items.some(item => item.id === targetId)) {
                return section.id;
            }
            const foundInChild = findParentId(section.items, targetId);
            if (foundInChild) return foundInChild;
        }
    }
    return undefined;
};

export default function DocsPage() {
    const { user } = useAuth();
    // Default to 'intro' or the first section's ID
    const [activeTabId, setActiveTabId] = useState<string>('intro');
    // Track expanded sections (by ID)
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['project-module', 'standalone-module', 'test-module']));

    // Auto-expand parent if child is active
    useEffect(() => {
        const parentId = findParentId(docSections, activeTabId);
        if (parentId && !expandedSections.has(parentId)) {
            setExpandedSections(prev => new Set(prev).add(parentId));
        }
    }, [activeTabId]);

    const toggleSection = (id: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // If you want to protect this route, uncomment the line below.
    // if (!user) return null;

    const activeSection = findSectionById(docSections, activeTabId) || docSections[0];

    const renderNavItems = (sections: DocSection[]) => {
        return sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeTabId === section.id;
            const hasSubItems = section.items && section.items.length > 0;
            const isExpanded = expandedSections.has(section.id);

            return (
                <div key={section.id}>
                    <button
                        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                        onClick={() => {
                            if (hasSubItems) {
                                toggleSection(section.id);
                            } else {
                                setActiveTabId(section.id);
                            }
                        }}
                    >
                        {Icon && <Icon size={18} />}
                        <span style={{ flex: 1 }}>{section.title}</span>
                        {hasSubItems && (
                            <ChevronRight
                                size={16}
                                className={`${styles.chevron} ${isExpanded ? styles.expanded : ''}`}
                            />
                        )}
                    </button>
                    {hasSubItems && (
                        <div className={`${styles.subItemsWrapper} ${isExpanded ? styles.open : ''}`}>
                            <div className={styles.subItems}>
                                {section.items!.map(item => (
                                    <button
                                        key={item.id}
                                        className={`${styles.subItem} ${activeTabId === item.id ? styles.active : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveTabId(item.id);
                                        }}
                                    >
                                        {item.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <main className={styles.container}>
            <div className={styles.layout}>
                {/* Left Sidebar */}
                <aside className={styles.sidebar}>
                    <div className={styles.pageTitle} style={{ fontSize: '24px', marginBottom: '24px', paddingLeft: '12px' }}>
                        Documentation
                    </div>
                    {renderNavItems(docSections)}
                </aside>

                {/* Right Content */}
                <div className={styles.content}>
                    <article className={styles.article}>
                        {activeSection.content}
                    </article>
                </div>
            </div>
        </main>
    );
}
