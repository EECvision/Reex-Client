"use client";

import { useState, useEffect } from "react";
// Static imports removed in favor of ProjectContext
import { useProject } from "@/providers/ProjectContext";
import ImportModal from "@/components/ImportModal/ImportModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal/DeleteConfirmModal";
import GenerateTemplateModal from "@/components/GenerateTemplateModal/GenerateTemplateModal";
import Navbar from "@/components/Navbar/Navbar";
import SidebarController from "@/components/Sidebar/SidebarController";
import WorkspaceView from "@/components/WorkspaceView/WorkspaceView";
import Toast from "@/components/Toast/Toast";
import BackgroundNotification from "@/components/BackgroundNotification/BackgroundNotification";
import styles from "./page.module.css";
import { EndpointInfo } from "@/types";

// Hooks
import { useToast } from "@/hooks/useToast";
import { useProjectSync } from "@/hooks/useProjectSync";
import { useCollectionManagement } from "@/hooks/useCollectionManagement";
import { useEndpointExecution } from "@/hooks/useEndpointExecution";

const App = () => {
  // Project Context
  const { manifest: apiManifest, loading: projectLoading, error: projectError, refreshProject, projectPath, config: projectConfig } = useProject();

  // Custom Hooks
  const { toasts, showToast, dismissToast } = useToast();

  const {
    backgroundTasks,
    activeTaskMessage,
    importTaskComplete,
    registerTaskId,
    resetImportTask,
    dismissBackgroundTask,
    activeTaskId
  } = useProjectSync({
    showToast,
    refreshProject
  });

  const {
    showImportModal, setShowImportModal,
    showDeleteModal, setShowDeleteModal,
    showGenerateModal, setShowGenerateModal,
    showDeleteItemModal, setShowDeleteItemModal,
    importFile, setImportFile,
    fetchingUrl,
    deleting,
    deletingItem,
    deleteItemInfo, setDeleteItemInfo,
    handleFetchUrl,
    handleDeleteCollection,
    handleDeleteModule,
    handleDeleteFunction,
    confirmDeleteItem
  } = useCollectionManagement({
    projectPath,
    showToast,
    refreshProject,
    registerTaskId // Link async ops to sync tracker
  });

  const {
    selectedEndpoint,
    selectEndpoint,
    params,
    result,
    error: executionError,
    loading: executionLoading,
    interfacePreview,
    savingInterface,
    copied,
    handleParamChange,
    handleSubmit,
    handleSaveInterface,
    isSubmitDisabled,
    handleCopy,
    getComputedUrl
  } = useEndpointExecution({
    projectConfig,
    apiManifest,
    showToast
  });

  // Reset selected endpoint if manifest becomes empty
  useEffect(() => {
    if (apiManifest && Object.keys(apiManifest).length === 0) {
      selectEndpoint(null as any); // Type assertion to allow null reset
    }
  }, [apiManifest]);

  const hasEndpoints = apiManifest && Object.keys(apiManifest).length > 0;

  if (projectLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <span className={styles.loadingText}>Loading project workspace...</span>
        </div>
      </div>
    );
  }

  if (projectError) {
    return <div className={styles.container}><div className={styles.main}>Error loading project: {projectError}</div></div>;
  }

  return (
    <div className={styles.container}>
      <Toast toasts={toasts} onDismiss={dismissToast} />
      <BackgroundNotification
        tasks={backgroundTasks}
        onDismiss={dismissBackgroundTask}
      />

      {hasEndpoints && (
        <SidebarController
          apiManifest={apiManifest}
          selectedEndpoint={selectedEndpoint}
          onSelectEndpoint={selectEndpoint}
          onDeleteModule={handleDeleteModule}
          onDeleteFunction={handleDeleteFunction}
        />
      )}

      <div className={styles.mainWrapper}>
        <Navbar
          selectedEndpoint={selectedEndpoint}
          onImportClick={() => {
            resetImportTask();
            setShowImportModal(true);
          }}
          hasCollection={hasEndpoints}
          onDeleteClick={() => setShowDeleteModal(true)}
          onFetchUrl={(url) => {
            resetImportTask();
            handleFetchUrl(url);
          }}
          isFetching={fetchingUrl}
          onGenerateClick={() => setShowGenerateModal(true)}
          baseURL={projectConfig?.baseURL}
          projectPath={projectPath}
        />

        {showImportModal && (
          <ImportModal
            isOpen={showImportModal}
            onClose={() => {
              setShowImportModal(false);
              setImportFile(null);
              resetImportTask();
            }}
            initialFile={importFile}
            onSuccess={() => { }}
            isEmptyWorkspace={!hasEndpoints}
            onUpdateStarted={registerTaskId}
            targetDir={projectPath}
            taskComplete={importTaskComplete}
            progressMessage={activeTaskMessage}
            resumeTaskId={activeTaskId}
          />
        )}

        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteCollection}
          deleting={deleting}
        />

        <DeleteConfirmModal
          isOpen={showDeleteItemModal}
          onClose={() => {
            setShowDeleteItemModal(false);
            setDeleteItemInfo(null);
          }}
          onConfirm={confirmDeleteItem}
          deleting={deletingItem}
          title={
            deleteItemInfo?.type === "module"
              ? "Delete Module"
              : "Delete Function"
          }
          message={
            deleteItemInfo?.type === "module"
              ? `Are you sure you want to delete the entire "${deleteItemInfo?.moduleName}" module? This action cannot be undone.`
              : `Are you sure you want to delete "${deleteItemInfo?.functionName}" from "${deleteItemInfo?.moduleName}"? This action cannot be undone.`
          }
        />

        {
          showGenerateModal &&
          <GenerateTemplateModal
            isOpen={showGenerateModal}
            onClose={() => {
              setShowGenerateModal(false);
              resetImportTask(); // Clears any lingering task ID
            }}
            onSuccess={(msg) => showToast("success", msg)}
            onTaskStarted={registerTaskId}
            targetDir={projectPath}
          />
        }

        <WorkspaceView
          selectedEndpoint={selectedEndpoint}
          currentParams={params[`${selectedEndpoint?.apiKey}.${selectedEndpoint?.fnName}`] || {}}
          onParamChange={handleParamChange}
          onSubmit={handleSubmit}
          loading={executionLoading}
          isSubmitDisabled={isSubmitDisabled()}
          result={result}
          error={executionError}
          interfacePreview={interfacePreview}
          updatingInterface={savingInterface}
          onUpdateInterface={handleSaveInterface}
          onCopy={handleCopy}
          copied={copied}
          hasCollection={hasEndpoints}
          onImport={() => {
            resetImportTask();
            setShowImportModal(true);
          }}
          onGenerate={() => setShowGenerateModal(true)}
          computedUrl={getComputedUrl()}
          method={selectedEndpoint ? selectedEndpoint.fnName.split('_')[0].toUpperCase() : ""}
        />
      </div>
    </div>
  );
};

export default App;
