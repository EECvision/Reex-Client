import React from "react";
import styles from "./BackgroundNotification.module.css";

export interface BackgroundTask {
    id: number;
    title: string;
    message: string;
}

interface BackgroundNotificationProps {
    tasks: BackgroundTask[];
    onDismiss?: (id: number) => void;
}

const BackgroundNotification: React.FC<BackgroundNotificationProps> = ({
    tasks,
}) => {
    if (tasks.length === 0) return null;

    return (
        <div className={styles.container}>
            {tasks.map((task) => (
                <div key={task.id} className={styles.notification}>
                    <div className={styles.spinner} />
                    <div className={styles.content}>
                        <div className={styles.title}>{task.title}</div>
                        {task.message && (
                            <div className={styles.message}>{task.message}</div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default BackgroundNotification;
