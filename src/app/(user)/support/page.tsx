import Link from "next/link";
import { ISSUES_URL } from "@/config/links";
import styles from "./support.module.css";

export default function SupportPage() {
  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Community support</h1>
        <p className={styles.subtitle}>
          Report a bug or suggest an improvement on GitHub.
        </p>
      </header>
      <section className={styles.card}>
        <p>
          Include the steps to reproduce the problem and your browser version.
          Remove API tokens and private request data from examples.
        </p>
        <p>
          <a
            href={ISSUES_URL + "/new/choose"}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open an issue on GitHub
          </a>
        </p>
        <p>
          <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">
            Browse existing issues
          </a>
        </p>
        <Link href="/">Back to workspace</Link>
      </section>
    </main>
  );
}
