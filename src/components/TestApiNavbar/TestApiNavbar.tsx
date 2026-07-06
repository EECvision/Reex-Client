import React from "react";
import styles from "./TestApiNavbar.module.css";
import { Button } from "../ui/Button/Button";
import { Plus } from "lucide-react";

interface TestApiNavbarProps {
  onAddCollection: () => void;
}

export default function TestApiNavbar({ onAddCollection }: TestApiNavbarProps) {
  return (
    <div className={styles.navbar}>
      <div className={styles.left}></div>
      <div className={styles.right}>
        <Button
          variant="ghost"
          onClick={onAddCollection}
          leftIcon={<Plus size={16} />}
        >
          Add Collection
        </Button>
      </div>
    </div>
  );
}
