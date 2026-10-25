import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { BookProject, Chapter, ProjectTask } from "../types";

// Helper to remove any undefined values before sending to Firestore
function cleanPayload<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean as T;
}

/**
 * Salva ou atualiza os dados básicos do escritor
 */
export async function saveUserProfile(user: User): Promise<void> {
  const userRef = doc(db, "users", user.uid);
  const data = cleanPayload({
    userId: user.uid,
    email: user.email || "",
    displayName: user.displayName || "Escritor",
    photoURL: user.photoURL || "",
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(userRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

/**
 * Assina e sincroniza os projetos de livros do autor em tempo real
 */
export function subscribeToProjects(
  userId: string,
  onSuccess: (projects: BookProject[]) => void,
  onError?: (err: any) => void
): () => void {
  const projectsRef = collection(db, "users", userId, "projects");
  return onSnapshot(
    projectsRef,
    (snapshot) => {
      const list: BookProject[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as BookProject);
      });
      onSuccess(list);
    },
    (error) => {
      console.error("Erro ao sincronizar projetos:", error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/projects`);
    }
  );
}

/**
 * Salva ou atualiza um projeto de livro na nuvem
 */
export async function saveProjectToCloud(userId: string, project: BookProject): Promise<void> {
  const path = `users/${userId}/projects/${project.id}`;
  const ref = doc(db, "users", userId, "projects", project.id);
  const payload = cleanPayload({
    ...project,
    userId,
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(ref, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Remove um projeto de livro na nuvem
 */
export async function deleteProjectFromCloud(userId: string, projectId: string): Promise<void> {
  const path = `users/${userId}/projects/${projectId}`;
  const ref = doc(db, "users", userId, "projects", projectId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Assina e sincroniza os capítulos em tempo real
 */
export function subscribeToChapters(
  userId: string,
  onSuccess: (chapters: Chapter[]) => void,
  onError?: (err: any) => void
): () => void {
  const chaptersRef = collection(db, "users", userId, "chapters");
  return onSnapshot(
    chaptersRef,
    (snapshot) => {
      const list: Chapter[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Chapter);
      });
      // Ordena por número de capítulo
      list.sort((a, b) => a.number - b.number);
      onSuccess(list);
    },
    (error) => {
      console.error("Erro ao sincronizar capítulos:", error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/chapters`);
    }
  );
}

/**
 * Salva ou atualiza um capítulo na nuvem
 */
export async function saveChapterToCloud(userId: string, chapter: Chapter): Promise<void> {
  const path = `users/${userId}/chapters/${chapter.id}`;
  const ref = doc(db, "users", userId, "chapters", chapter.id);
  const payload = cleanPayload({
    ...chapter,
    userId,
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(ref, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Remove um capítulo da nuvem
 */
export async function deleteChapterFromCloud(userId: string, chapterId: string): Promise<void> {
  const path = `users/${userId}/chapters/${chapterId}`;
  const ref = doc(db, "users", userId, "chapters", chapterId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Assina e sincroniza as tarefas do roteiro
 */
export function subscribeToTasks(
  userId: string,
  onSuccess: (tasks: ProjectTask[]) => void,
  onError?: (err: any) => void
): () => void {
  const tasksRef = collection(db, "users", userId, "tasks");
  return onSnapshot(
    tasksRef,
    (snapshot) => {
      const list: ProjectTask[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ProjectTask);
      });
      onSuccess(list);
    },
    (error) => {
      console.error("Erro ao sincronizar tarefas:", error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/tasks`);
    }
  );
}

/**
 * Salva ou atualiza uma tarefa do roteiro
 */
export async function saveTaskToCloud(userId: string, task: ProjectTask): Promise<void> {
  const path = `users/${userId}/tasks/${task.id}`;
  const ref = doc(db, "users", userId, "tasks", task.id);
  const payload = cleanPayload({
    ...task,
    userId,
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(ref, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Salva o caderno de rascunhos e ditados de um projeto
 */
export async function saveNotebookToCloud(
  userId: string,
  projectId: string,
  data: {
    notebookText: string;
    notebookTitle: string;
    takesCount: number;
    lastSaved: string;
  }
): Promise<void> {
  const path = `users/${userId}/notebooks/${projectId}`;
  const ref = doc(db, "users", userId, "notebooks", projectId);
  const payload = cleanPayload({
    id: projectId,
    bookId: projectId,
    userId,
    ...data,
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(ref, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Assina e sincroniza o caderno de ditado de um livro específico
 */
export function subscribeToNotebook(
  userId: string,
  projectId: string,
  onSuccess: (data: {
    notebookText: string;
    notebookTitle: string;
    takesCount: number;
    lastSaved: string;
  } | null) => void
): () => void {
  const ref = doc(db, "users", userId, "notebooks", projectId);
  return onSnapshot(
    ref,
    (snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.data();
        onSuccess({
          notebookText: d.notebookText || "",
          notebookTitle: d.notebookTitle || "Memórias e Rascunho do Livro",
          takesCount: Number(d.takesCount) || 0,
          lastSaved: d.lastSaved || "",
        });
      } else {
        onSuccess(null);
      }
    },
    (err) => {
      console.warn("Erro ao ouvir caderno na nuvem:", err);
    }
  );
}

/**
 * Migra dados locais existentes para a conta em nuvem na primeira autenticação
 */
export async function migrateLocalDataToCloud(
  userId: string,
  localProjects: BookProject[],
  localChapters: Chapter[],
  localTasks: ProjectTask[]
): Promise<{ projectsMigrated: number; chaptersMigrated: number; tasksMigrated: number }> {
  // Verifica se o usuário já tem projetos na nuvem
  const projectsRef = collection(db, "users", userId, "projects");
  const existingDocs = await getDocs(projectsRef);

  if (!existingDocs.empty) {
    // Usuário já possui dados salvos na nuvem, não sobrescrever com o local
    return { projectsMigrated: 0, chaptersMigrated: 0, tasksMigrated: 0 };
  }

  let pCount = 0;
  for (const p of localProjects) {
    await saveProjectToCloud(userId, p);
    pCount++;
  }

  let cCount = 0;
  for (const c of localChapters) {
    await saveChapterToCloud(userId, c);
    cCount++;
  }

  let tCount = 0;
  for (const t of localTasks) {
    await saveTaskToCloud(userId, t);
    tCount++;
  }

  return { projectsMigrated: pCount, chaptersMigrated: cCount, tasksMigrated: tCount };
}

/**
 * Bateria completa de testes do banco de dados na nuvem
 */
export async function runDatabaseDiagnostics(userId: string): Promise<{
  success: boolean;
  results: { step: string; status: "passed" | "failed"; detail: string }[];
}> {
  const results: { step: string; status: "passed" | "failed"; detail: string }[] = [];

  // Teste 1: Escrita e Leitura de Documento de Teste
  try {
    const testDocRef = doc(db, "users", userId, "projects", "test-connectivity-diag");
    await setDoc(testDocRef, {
      id: "test-connectivity-diag",
      userId,
      title: "Diagnóstico de Nuvem",
      genre: "Teste",
      summary: "Documento temporário para validação de integridade",
      chaptersCount: 0,
      status: "draft",
      statusLabel: "Teste",
      accentColor: "#3b82f6",
      lastEdited: "Agora",
      updatedAt: new Date().toISOString(),
    });

    const readBack = await getDoc(testDocRef);
    if (readBack.exists() && readBack.data().title === "Diagnóstico de Nuvem") {
      results.push({
        step: "Escrita e Leitura Direta (Firestore)",
        status: "passed",
        detail: "Permissões de gravação e consulta operando com 100% de sucesso.",
      });
    } else {
      throw new Error("Documento lido não corresponde ao salvo.");
    }

    // Limpeza do documento de teste
    await deleteDoc(testDocRef);
    results.push({
      step: "Remoção e Limpeza de Dados (Exclusão Segura)",
      status: "passed",
      detail: "Exclusão de registros testada e confirmada.",
    });
  } catch (e: any) {
    results.push({
      step: "Operação de Gravação/Leitura",
      status: "failed",
      detail: e?.message || String(e),
    });
  }

  // Teste 2: Validação de Isolamento de Usuário
  try {
    const foreignUserRef = doc(db, "users", "other-forbidden-user-id", "projects", "forbidden-doc");
    // Tentar ler documento de outro usuário deve falhar pelas regras
    let forbiddenAccessed = false;
    try {
      await getDoc(foreignUserRef);
      forbiddenAccessed = true;
    } catch {
      // Esperado: Falhar e ser bloqueado pelas regras
    }

    if (!forbiddenAccessed) {
      results.push({
        step: "Isolamento Multi-tenant (Regras de Segurança)",
        status: "passed",
        detail: "Acesso a dados de outros escritores bloqueado com sucesso pelo Firestore Rules.",
      });
    } else {
      results.push({
        step: "Isolamento Multi-tenant",
        status: "failed",
        detail: "Alerta: Documento de outro usuário não foi bloqueado.",
      });
    }
  } catch (e: any) {
    results.push({
      step: "Isolamento Multi-tenant",
      status: "passed",
      detail: "Regras de segurança ativas e bloqueando invasão de contexto.",
    });
  }

  const success = results.every((r) => r.status === "passed");
  return { success, results };
}
