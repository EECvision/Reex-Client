import React from "react";
import styles from "./BackgroundNotification.module.css";
import { Button } from "../ui/Button/Button";

export interface BackgroundTask {
    id: number;
    title: string;
    message: string;
}

interface BackgroundNotificationProps {
    tasks: BackgroundTask[];
    onDismiss: (id: number) => void;
}

const BackgroundNotification: React.FC<BackgroundNotificationProps> = ({
    tasks,
    onDismiss,
}) => {
    if (tasks.length === 0) return null;

    return (
        <div className={styles.container}>
            {tasks.map((task) => (
                <div key={task.id} className={styles.notification}>
                    <div className={styles.spinner}></div>
                    <div className={styles.content}>
                        <div className={styles.title}>{task.title}</div>
                        <div className={styles.message}>{task.message}</div>
                    </div>
                    <Button
                        onClick={() => onDismiss(task.id)}
                        className={styles.closeButton}
                        variant="ghost"
                        size="sm"
                    >
                        ×
                    </Button>
                </div>
            ))}
        </div>
    );
};

export default BackgroundNotification;
