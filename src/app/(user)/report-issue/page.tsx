"use client";

import React, { useState } from "react";
import styles from "./report-issue.module.css";
import { Button } from "@/components/ui/Button/Button";
import { useAuth } from "@/providers/AuthContext";
import { MessageSquareWarning, Loader2, CheckCircle } from "lucide-react";
import { createIssue } from "@/app/actions/issueActions";

export default function ReportIssuePage() {
    const { user } = useAuth();
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isFormValid = subject.trim().length > 0 && description.trim().length > 0;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isFormValid) return;
        setIsSubmitting(true);
        setError(null);

        const formData = new FormData();
        formData.set("subject", subject.trim());
        formData.set("description", description.trim());

        const result = await createIssue(formData);

        setIsSubmitting(false);

        if (result.error) {
            setError(result.error);
        } else {
            setIsSuccess(true);
            setSubject("");
            setDescription("");
            setTimeout(() => setIsSuccess(false), 3000);
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Report an Issue</h1>
                    <p className={styles.subtitle}>
                        Found a bug or have a suggestion? Let us know and help us improve Reex API Builder.
                    </p>
                </div>

                <div className={styles.card}>
                    {isSuccess ? (
                        <div className={styles.successState}>
                            <CheckCircle size={48} className={styles.successIcon} />
                            <h3 className={styles.successTitle}>Thank You!</h3>
                            <p className={styles.successText}>
                                Your report has been submitted successfully. We'll look into it right away.
                            </p>
                            <Button variant="primary" onClick={() => setIsSuccess(false)}>
                                Submit Another Report
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className={styles.form}>
                            {error && (
                                <div className={styles.errorMessage}>
                                    {error}
                                </div>
                            )}
                            <div className={styles.formGroup}>
                                <label htmlFor="subject" className={styles.label}>Subject</label>
                                <input
                                    id="subject"
                                    name="subject"
                                    type="text"
                                    className={styles.input}
                                    placeholder="Brief summary of the issue"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="description" className={styles.label}>Description</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    className={styles.textarea}
                                    placeholder="Please describe the issue in detail..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                    rows={6}
                                />
                            </div>

                            <div className={styles.formFooter}>
                                <Button
                                    variant="primary"
                                    type="submit"
                                    disabled={isSubmitting || !isFormValid}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={16} className={styles.spinner} />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <MessageSquareWarning size={16} className={styles.buttonIcon} />
                                            Submit Report
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </main>
    );
}
