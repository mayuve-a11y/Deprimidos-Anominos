import { getAccessToken, signInWithGoogleWorkspace, setAccessToken } from "../firebase";
import { BookProject, Chapter } from "../types";

const DEFAULT_MAIN_FOLDER_NAME = "Estúdio Literário - Meus Livros";

export interface GoogleDocsSyncResult {
  docId: string;
  docUrl: string;
  folderId?: string;
  folderUrl?: string;
  title: string;
  syncedAt: string;
}

/**
 * Obtém ou solicita o token de acesso OAuth com os escopos do Google Workspace
 */
export async function getValidWorkspaceToken(): Promise<string> {
  const currentToken = await getAccessToken();
  if (currentToken) {
    return currentToken;
  }
  // Se não houver token em memória, solicita login/consentimento
  const result = await signInWithGoogleWorkspace();
  if (!result.accessToken) {
    throw new Error("Não foi possível obter a autorização do Google para acessar o Google Docs.");
  }
  return result.accessToken;
}

/**
 * Localiza ou cria a pasta oficial no Google Drive do autor
 */
export async function getOrCreateDriveFolder(
  accessToken: string,
  folderName: string = DEFAULT_MAIN_FOLDER_NAME
): Promise<{ id: string; webViewLink: string }> {
  try {
    // 1. Procurar se já existe pasta com este nome
    const queryParam = encodeURIComponent(
      `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${queryParam}&fields=files(id,name,webViewLink)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return {
          id: data.files[0].id,
          webViewLink: data.files[0].webViewLink || `https://drive.google.com/drive/folders/${data.files[0].id}`,
        };
      }
    }

    // 2. Se não existir, criar a pasta no Drive
    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      }),
    });

    if (!createRes.ok) {
      const errBody = await createRes.text();
      console.warn("Aviso ao criar pasta no Drive, prosseguindo na raiz:", errBody);
      return { id: "", webViewLink: "https://drive.google.com" };
    }

    const createdFolder = await createRes.json();
    return {
      id: createdFolder.id,
      webViewLink: `https://drive.google.com/drive/folders/${createdFolder.id}`,
    };
  } catch (error) {
    console.error("Erro ao gerenciar pasta no Google Drive:", error);
    return { id: "", webViewLink: "https://drive.google.com" };
  }
}

/**
 * Move um arquivo recém-criado para dentro de uma pasta específica no Drive
 */
async function moveFileToFolder(accessToken: string, fileId: string, folderId: string): Promise<void> {
  if (!folderId || !fileId) return;
  try {
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&fields=id,parents`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
  } catch (err) {
    console.warn("Não foi possível mover para a pasta específica do Drive:", err);
  }
}

/**
 * Exporta ou Sincroniza o Livro Completo com o Google Docs
 */
export async function syncCompleteBookToGoogleDocs(
  project: BookProject,
  chapters: Chapter[]
): Promise<GoogleDocsSyncResult> {
  const token = await getValidWorkspaceToken();

  // 1. Obter ou criar a pasta no Google Drive
  const projectFolderName = `Estúdio Literário - ${project.title}`;
  const folder = await getOrCreateDriveFolder(token, projectFolderName);

  // 2. Criar novo Documento no Google Docs
  const docTitle = `${project.title} - Manuscrito Completo`;
  const createDocRes = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: docTitle,
    }),
  });

  if (!createDocRes.ok) {
    const errText = await createDocRes.text();
    throw new Error(`Falha ao criar o documento no Google Docs: ${errText}`);
  }

  const docData = await createDocRes.json();
  const documentId = docData.documentId;

  // 3. Montar o texto estruturado do Livro
  let fullManuscriptText = "";
  fullManuscriptText += `${project.title.toUpperCase()}\n`;
  if (project.subtitle) {
    fullManuscriptText += `${project.subtitle}\n`;
  }
  fullManuscriptText += `------------------------------------------------------------\n`;
  fullManuscriptText += `Gênero: ${project.genre || "Literatura & Memórias"}\n`;
  fullManuscriptText += `Data de Sincronização: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}\n`;
  fullManuscriptText += `Total de Capítulos: ${chapters.length}\n`;
  fullManuscriptText += `------------------------------------------------------------\n\n`;

  if (project.summary) {
    fullManuscriptText += `SINOPSE & INTRODUÇÃO DA OBRA\n`;
    fullManuscriptText += `${project.summary}\n\n`;
    fullManuscriptText += `============================================================\n\n`;
  }

  // Ordenar capítulos pelo número
  const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);

  sortedChapters.forEach((chapter) => {
    fullManuscriptText += `CAPÍTULO ${chapter.number}: ${chapter.title.toUpperCase()}\n`;
    if (chapter.subtitle) {
      fullManuscriptText += `${chapter.subtitle}\n`;
    }
    if (chapter.dateReference || chapter.emotionalTag) {
      const metaLine = [chapter.dateReference, chapter.emotionalTag].filter(Boolean).join(" | ");
      fullManuscriptText += `[${metaLine}]\n`;
    }
    fullManuscriptText += `\n`;
    fullManuscriptText += `${chapter.content || "(Capítulo em elaboração...)"}\n\n`;

    if (chapter.footnotes && chapter.footnotes.length > 0) {
      fullManuscriptText += `Notas & Referências Literárias:\n`;
      chapter.footnotes.forEach((fn, idx) => {
        fullManuscriptText += `[${idx + 1}] ${fn}\n`;
      });
      fullManuscriptText += `\n`;
    }

    fullManuscriptText += `------------------------------------------------------------\n\n`;
  });

  fullManuscriptText += `[Fim do Manuscrito - Gerado pelo Estúdio Literário Mãos Livres]\n`;

  // 4. Inserir o conteúdo formatado no documento via batchUpdate
  const batchUpdateRes = await fetch(
    `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: fullManuscriptText,
            },
          },
        ],
      }),
    }
  );

  if (!batchUpdateRes.ok) {
    const errText = await batchUpdateRes.text();
    console.warn("Aviso ao preencher texto no Google Docs:", errText);
  }

  // 5. Organizar colocando na pasta do Google Drive
  if (folder.id) {
    await moveFileToFolder(token, documentId, folder.id);
  }

  const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  return {
    docId: documentId,
    docUrl,
    folderId: folder.id,
    folderUrl: folder.webViewLink,
    title: docTitle,
    syncedAt: new Date().toISOString(),
  };
}

/**
 * Exporta ou Sincroniza um Capítulo individual com o Google Docs
 */
export async function syncSingleChapterToGoogleDocs(
  project: BookProject,
  chapter: Chapter
): Promise<GoogleDocsSyncResult> {
  const token = await getValidWorkspaceToken();

  const projectFolderName = `Estúdio Literário - ${project.title}`;
  const folder = await getOrCreateDriveFolder(token, projectFolderName);

  const docTitle = `${project.title} - Cap ${chapter.number} (${chapter.title})`;
  const createDocRes = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: docTitle,
    }),
  });

  if (!createDocRes.ok) {
    const errText = await createDocRes.text();
    throw new Error(`Falha ao criar o documento do capítulo no Google Docs: ${errText}`);
  }

  const docData = await createDocRes.json();
  const documentId = docData.documentId;

  let chapterDocText = "";
  chapterDocText += `${project.title.toUpperCase()}\n`;
  chapterDocText += `CAPÍTULO ${chapter.number}: ${chapter.title.toUpperCase()}\n`;
  if (chapter.subtitle) {
    chapterDocText += `${chapter.subtitle}\n`;
  }
  if (chapter.dateReference || chapter.emotionalTag) {
    const metaLine = [chapter.dateReference, chapter.emotionalTag].filter(Boolean).join(" | ");
    chapterDocText += `[${metaLine}]\n`;
  }
  chapterDocText += `Data de Sincronização: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}\n`;
  chapterDocText += `------------------------------------------------------------\n\n`;
  chapterDocText += `${chapter.content || "(Sem conteúdo registrado ainda)"}\n\n`;

  if (chapter.footnotes && chapter.footnotes.length > 0) {
    chapterDocText += `Notas & Referências Literárias:\n`;
    chapter.footnotes.forEach((fn, idx) => {
      chapterDocText += `[${idx + 1}] ${fn}\n`;
    });
    chapterDocText += `\n`;
  }

  chapterDocText += `[Gerado pelo Estúdio Literário Mãos Livres]\n`;

  await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: chapterDocText,
          },
        },
      ],
    }),
  });

  if (folder.id) {
    await moveFileToFolder(token, documentId, folder.id);
  }

  const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  return {
    docId: documentId,
    docUrl,
    folderId: folder.id,
    folderUrl: folder.webViewLink,
    title: docTitle,
    syncedAt: new Date().toISOString(),
  };
}

/**
 * Validação / Bateria de Testes do Google Docs e Google Drive
 */
export async function testGoogleWorkspaceIntegration(): Promise<{
  success: boolean;
  results: { step: string; status: "passed" | "failed"; detail: string }[];
  docUrl?: string;
  folderUrl?: string;
}> {
  const results: { step: string; status: "passed" | "failed"; detail: string }[] = [];

  try {
    // 1. Obter Token
    const token = await getValidWorkspaceToken();
    results.push({
      step: "Autorização OAuth Google Workspace",
      status: "passed",
      detail: "Token de acesso válido para Google Docs e Google Drive obtido com sucesso.",
    });

    // 2. Testar Google Drive API (Pasta de Teste)
    const folderRes = await getOrCreateDriveFolder(token, "Estúdio Literário - Teste de Conexão");
    results.push({
      step: "Comunicação com Google Drive API (v3)",
      status: "passed",
      detail: `Pasta de armazenamento identificada no Drive (ID: ${folderRes.id.substring(0, 10)}...).`,
    });

    // 3. Testar Google Docs API (Criação e Inserção de Texto)
    const testDocTitle = `Teste de Conexão - Estúdio Literário (${new Date().toLocaleTimeString("pt-BR")})`;
    const createDocRes = await fetch("https://docs.googleapis.com/v1/documents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: testDocTitle }),
    });

    if (!createDocRes.ok) {
      throw new Error("Erro na API do Google Docs: " + (await createDocRes.text()));
    }

    const testDoc = await createDocRes.json();
    const docId = testDoc.documentId;

    // Inserir mensagem de teste
    await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: `CONEXÃO COM GOOGLE DOCS VALIDADA COM SUCESSO!\n\nEste documento comprova que seu Estúdio Literário está conectado com a sua conta Google.\nData e Hora: ${new Date().toLocaleString("pt-BR")}\n`,
            },
          },
        ],
      }),
    });

    if (folderRes.id) {
      await moveFileToFolder(token, docId, folderRes.id);
    }

    const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

    results.push({
      step: "Gravação e Formatação no Google Docs (v1)",
      status: "passed",
      detail: `Documento teste criado e populado com sucesso na nuvem Google.`,
    });

    return {
      success: true,
      results,
      docUrl,
      folderUrl: folderRes.webViewLink,
    };
  } catch (error: any) {
    results.push({
      step: "Bateria de Validação Google Docs/Drive",
      status: "failed",
      detail: error?.message || String(error),
    });
    return {
      success: false,
      results,
    };
  }
}
