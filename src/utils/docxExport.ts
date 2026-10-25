import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from "docx";

interface ExportableChapter {
  number: number;
  title: string;
  subtitle?: string;
  content: string;
  footnotes?: string[];
}

export async function exportBookToDocx(
  bookTitle: string,
  bookSubtitle: string,
  chapters: ExportableChapter[]
): Promise<void> {
  const children: (Paragraph)[] = [];

  // Capa do Livro
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 300 },
      children: [
        new TextRun({
          text: bookTitle.toUpperCase(),
          bold: true,
          size: 48, // 24pt
          font: "Georgia",
          color: "1F2937",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 1200 },
      children: [
        new TextRun({
          text: bookSubtitle,
          italics: true,
          size: 28, // 14pt
          font: "Georgia",
          color: "4B5563",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1800, after: 600 },
      children: [
        new TextRun({
          text: "Edição Manuscrito do Autor • Estúdio Literário",
          size: 22,
          font: "Calibri",
          color: "6B7280",
        }),
      ],
    }),
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  // Sumário / Lista de Capítulos
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 600, after: 400 },
      children: [
        new TextRun({
          text: "SUMÁRIO DA OBRA",
          bold: true,
          size: 32,
          font: "Georgia",
          color: "1F2937",
        }),
      ],
    })
  );

  chapters.forEach((chap) => {
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text: `Capítulo ${chap.number}: `,
            bold: true,
            size: 24,
            font: "Georgia",
          }),
          new TextRun({
            text: chap.title,
            size: 24,
            font: "Georgia",
          }),
        ],
      })
    );
  });

  children.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  // Capítulos
  chapters.forEach((chap) => {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 400, after: 100 },
        children: [
          new TextRun({
            text: `CAPÍTULO ${chap.number}`,
            bold: true,
            size: 22,
            font: "Calibri",
            color: "9CA3AF",
          }),
        ],
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: chap.subtitle ? 100 : 400 },
        children: [
          new TextRun({
            text: chap.title,
            bold: true,
            size: 36,
            font: "Georgia",
            color: "111827",
          }),
        ],
      })
    );

    if (chap.subtitle) {
      children.push(
        new Paragraph({
          spacing: { after: 500 },
          children: [
            new TextRun({
              text: chap.subtitle,
              italics: true,
              size: 24,
              font: "Georgia",
              color: "4B5563",
            }),
          ],
        })
      );
    }

    // Parágrafos do conteúdo
    const paragraphs = chap.content.split("\n\n").filter((p) => p.trim().length > 0);
    paragraphs.forEach((pText) => {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: 360, before: 160, after: 160 }, // 1.5 spacing
          indent: { firstLine: 720 }, // 1.25 cm indent padrão de livro
          children: [
            new TextRun({
              text: pText.trim(),
              size: 24, // 12pt
              font: "Georgia",
              color: "1F2937",
            }),
          ],
        })
      );
    });

    // Notas de rodapé / Referências
    if (chap.footnotes && chap.footnotes.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 400, after: 150 },
          children: [
            new TextRun({
              text: "Notas de Apoio e Embasamento do Capítulo:",
              bold: true,
              size: 20,
              font: "Calibri",
              color: "4B5563",
            }),
          ],
        })
      );

      chap.footnotes.forEach((fn, idx) => {
        children.push(
          new Paragraph({
            spacing: { before: 80, after: 80 },
            children: [
              new TextRun({
                text: `[${idx + 1}] `,
                bold: true,
                size: 18,
                font: "Calibri",
                color: "6B7280",
              }),
              new TextRun({
                text: fn,
                italics: true,
                size: 18,
                font: "Calibri",
                color: "4B5563",
              }),
            ],
          })
        );
      });
    }

    children.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 2.5 cm
              bottom: 1440,
              left: 1700, // 3 cm para encadernação
              right: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const sanitizedTitle = bookTitle.toLowerCase().replace(/[^a-z0-9]/g, "_");
  a.download = `${sanitizedTitle}_estudio_literario.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
