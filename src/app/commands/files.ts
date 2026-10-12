import type { FileContent } from '../../format';

/** Télécharge un texte (JSON) ou un contenu binaire (image) comme fichier (API web standard). */
export function download(name: string, data: string | Blob): void {
  const url = URL.createObjectURL(typeof data === 'string' ? new Blob([data], { type: 'application/json' }) : data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Ouvre le sélecteur de fichiers et lit les fichiers JSON choisis. */
export function pickFiles(): Promise<FileContent[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.multiple = true;
    input.onchange = async () => {
      const files = [...(input.files ?? [])];
      resolve(await Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() }))));
    };
    input.click();
  });
}

export const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'projet';
