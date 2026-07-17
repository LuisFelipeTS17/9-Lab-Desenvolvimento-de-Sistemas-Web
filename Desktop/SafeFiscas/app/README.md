# SafeFiscas — App (PWA)

Controle de garantias de peças a partir das notas fiscais. App web instalável,
funciona offline e guarda tudo no próprio celular (nenhum servidor necessário).

## Como rodar no computador (para testar)

**Opção rápida:** abra o arquivo `index.html` no Chrome.
Quase tudo funciona assim (navegação, cadastro, dados salvos, exportação).
Só o modo offline "instalado" (service worker) exige um servidor — veja abaixo.

**Opção completa (recomendada):** use um servidor local.
- No VS Code: instale a extensão **Live Server**, clique com o botão direito em
  `index.html` → *Open with Live Server*.
- Ou, se tiver Node: `npx serve .` dentro da pasta `app`.
- Ou, se tiver Python: `python -m http.server` dentro da pasta `app`.

## Como instalar no celular

O app precisa estar publicado num endereço `https://` para ser "instalado".
Jeitos gratuitos de publicar a pasta `app/`:
- **Netlify Drop** (netlify.com/drop) — arraste a pasta e pronto.
- **GitHub Pages** — suba o repositório e ative Pages.
- **Vercel** — importe o projeto.

Depois, abra o link no celular → menu do navegador → *Adicionar à tela inicial*.
O app abre em tela cheia, com ícone próprio, como um app comum.

## Estrutura

- `index.html` — casca do app
- `styles.css` — design system (mesmas cores/fonte dos mockups originais)
- `app.js` — telas, navegação, regras de garantia
- `db.js` — armazenamento local (IndexedDB)
- `sw.js` + `manifest.webmanifest` — offline e instalação (PWA)
- `icon.svg` — ícone do app

## Dados

Ficam no navegador do aparelho (IndexedDB). Ao abrir pela primeira vez, o app já
vem com **notas de exemplo** para você ver funcionando. Para começar do zero,
limpe os dados do site no navegador.

## Próximos passos possíveis

- Leitura automática da nota pela IA (OCR) — hoje o cadastro é manual.
- Backup/sincronização em nuvem entre vários aparelhos.
- Notificações de garantias prestes a vencer.
