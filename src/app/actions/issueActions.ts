'use server';

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function createIssue(formData: FormData) {
    const session = await auth();

    if (!session || !session.user) {
        return { error: "You must be logged in to report an issue." };
    }

    const subject = formData.get("subject") as string;
    const description = formData.get("description") as string;

    if (!subject || !description) {
        return { error: "Subject and description are required." };
    }

    const githubPat = process.env.GITHUB_PAT;
    const repoOwner = process.env.GITHUB_REPO_OWNER;
    const repoName = process.env.GITHUB_REPO_NAME;

    if (!githubPat || !repoOwner || !repoName) {
        console.error("GitHub integration is not fully configured.");
        return { error: "Failed to submit issue. Configuration error." };
    }

    try {
        const issueBody = `${description}\n\n---\n*Reported by: ${session.user.name || 'Unknown'} (${session.user.email || 'No email'})*`;
        
        const githubRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${githubPat}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: subject,
                body: issueBody
            })
        });

        if (!githubRes.ok) {
            const errorText = await githubRes.text();
            console.error("GitHub issue creation failed:", errorText);
            return { error: "Failed to submit issue to GitHub. Please try again." };
        }
    } catch (err) {
        console.error("Failed to call GitHub API", err);
        return { error: "Failed to submit issue. Please try again." };
    }

    revalidatePath("/support");
    return { success: true };
}
