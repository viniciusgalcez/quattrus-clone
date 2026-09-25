---
name: publicar-mudanca
description: Organiza o código pendente, roda a checagem de qualidade (lint/typecheck/test/build), escreve um README de mudança explicando o impacto no servidor, e sobe tudo pro GitHub via branch + Pull Request — sempre pedindo confirmação antes do push. Use quando o usuário disser algo como "publica isso", "sobe pro github", "finaliza essa mudança", "organiza e manda pro repositório", ou pedir explicitamente a skill publicar-mudanca.
---

# Publicar mudança

Workflow para transformar código já editado neste projeto em um Pull Request
organizado no GitHub, com uma documentação curta explicando o que mudou e o
que isso significa para quem administra o servidor (deploy, migration, env
var, restart). Nunca faz `git push` sem mostrar antes um resumo e esperar
confirmação explícita do usuário — push é uma ação visível/difícil de
reverter, então o gate de confirmação não é opcional.

Segue as regras de `CLAUDE.md` deste projeto: nunca commitar segredos,
sempre rodar lint/typecheck/test/build antes de considerar algo pronto, sem
`Co-Authored-By` (não há `attribution.commit` configurado em
`.claude/settings.json`).

## Passo 0 — Entender o que existe pendente

1. `git status` (nunca `-uall`) e `git diff` (staged + unstaged) para ver o
   que mudou de verdade.
2. `git log --oneline -10` para pegar o estilo de mensagem de commit já usado
   no repo.
3. Se não houver nada modificado/staged, avise o usuário e pare — não há o
   que publicar.
4. Se o diff tocar áreas muito distintas e sem relação (ex.: schema de banco
   + copy de um botão + configuração de CI), sugira dividir em mais de um
   commit/branch/PR em vez de empacotar tudo junto. Pergunte ao usuário se
   quer dividir ou seguir com um único PR grande — não decida sozinho quando
   a resposta muda o escopo visivelmente.

## Passo 1 — Checagem de qualidade (bloqueante)

Rode, nessa ordem, parando no primeiro erro:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Se algo falhar: diagnostique a causa raiz e corrija — nunca pule a etapa
(`--no-verify` está proibido) nem prometa "ajustar depois". Só avance para o
Passo 2 com tudo verde. Se a correção for grande o bastante para mudar o
escopo da mudança, volte ao Passo 0 e reavalie com o usuário.

## Passo 2 — Branch

1. Confirme a branch base: `master` (ver `git remote -v` /
   `git branch --show-current`; hoje `origin` aponta pro GitHub do usuário).
2. `git fetch origin` e cheque se `master` local está atrás do remoto. Se
   estiver, avise e sincronize antes de criar a branch nova (nunca force
   nada sem avisar).
3. Crie uma branch nova a partir de `master`, nome curto e descritivo no
   padrão `tipo/assunto-curto` (`feat/`, `fix/`, `chore/`, `docs/`), em
   inglês ou português consistente com o que já existe no repo — se não
   houver padrão claro, use `feat/`, `fix/`, `chore/`, `docs/` em português
   simples (`feat/menu-por-linha-farol`, `fix/upload-anexos-limite`).

## Passo 3 — README da mudança

Crie `docs/mudancas/AAAA-MM-DD-assunto-curto.md` (data real do dia, mesmo
slug da branch) com este formato:

```markdown
# <Título curto da mudança, em uma frase>

**Data:** AAAA-MM-DD
**Branch:** <nome-da-branch>

## O que mudou
<Lista objetiva do que foi alterado, em linguagem simples — pense em quem
não leu o código.>

## Por que
<Motivação: bug, gap de paridade com o Quattrus, pedido do usuário, etc.>

## Impacto no servidor
- Precisa rebuild da imagem Docker? <sim/não>
- Tem migration de banco (`prisma/migrations`)? <sim/não — qual, e se é
  reversível>
- Precisa de variável de ambiente nova ou alterada? <sim/não — qual, e se
  precisa ser setada manualmente antes do deploy>
- Precisa reiniciar algum serviço/container além do `web`? <sim/não>
- Algum passo manual antes ou depois do deploy (seed, script, backup)?
  <sim/não — qual>

## Como testar
<Passos objetivos para confirmar que a mudança funciona — tela, URL, ação.>

## Riscos / rollback
<O que pode dar errado e como reverter — normalmente `git revert` do commit
de merge; se tiver migration, diga se ela precisa de um passo extra pra
desfazer.>
```

Preencha com informação real levantada no Passo 0/1 — nunca invente migration
ou variável de ambiente que não existe no diff. Se não houver nenhum impacto
de servidor, escreva "Nenhum" em vez de omitir a seção.

## Passo 4 — Commit

1. `git add` só os arquivos relevantes (nunca `git add -A` às cegas — revise
   a lista). Nunca adicione `.env`, dumps de `backups/`, ou qualquer arquivo
   que pareça conter segredo mesmo que o nome pareça inocente — confira o
   conteúdo se tiver dúvida.
2. Mensagem de commit curta, no imperativo, focada no "porquê" (mesmo padrão
   de `git log` já usado no repo). Sem `Co-Authored-By`.
3. Inclua `docs/mudancas/<arquivo>.md` no mesmo commit (ou um commit
   separado "docs: readme da mudança X" se fizer mais sentido pro diff).

## Passo 5 — Mostrar e pedir confirmação (obrigatório, não pule)

Antes de tocar em `git push`, mostre ao usuário, em uma mensagem só:

- Lista de arquivos no commit (`git show --stat`).
- A mensagem de commit.
- O conteúdo do README da mudança (Passo 3) — especialmente a seção
  "Impacto no servidor", que é o motivo de essa skill existir.
- O nome da branch e que o destino é um PR contra `master` (não push direto).

Pergunte explicitamente se pode prosseguir com push + abertura do PR. Só
avance com uma confirmação clara ("pode", "sim", "manda"). Se o usuário
pedir ajuste, edite e repita o Passo 5 — não empurre uma versão que ele não
viu.

## Passo 6 — Push e Pull Request

1. `git push -u origin <branch>`.
2. Verifique se `gh` está disponível e autenticado (`gh auth status`).
   - Se sim: `gh pr create --base master --head <branch> --title "<mesmo
     título do README>" --body "<corpo com o conteúdo do README da mudança,
     terminando com uma checklist de teste>"`.
   - Se não: não tente instalar nem autenticar `gh` sozinho. Monte a URL de
     comparação do GitHub com título e corpo pré-preenchidos —
     `https://github.com/<owner>/<repo>/compare/master...<branch>?quick_pull=1&title=<title>&body=<body>`
     (URL-encode título/corpo) — e entregue esse link pronto pro usuário
     clicar e abrir o PR manualmente. Mencione, uma vez só, que instalar e
     autenticar `gh` (`winget install GitHub.cli` + `gh auth login`) deixaria
     esse último passo automático nas próximas execuções.
3. Reporte o resultado: link do PR (ou o link de criação) e branch publicada.
   Não marque a tarefa como concluída até o push ter de fato acontecido.

## Regras que não mudam, não importa o pedido

- Nunca faça push direto em `master` — sempre branch + PR, mesmo se o
  usuário disser "pode subir tudo": confirme com ele se "subir tudo" quer
  dizer pular a etapa de PR antes de agir diferente do que essa skill faz
  por padrão.
- Nunca pule lint/typecheck/test/build para "ir mais rápido".
- Nunca commite segredo, dump de banco, ou arquivo de `backups/`.
- Nunca abra o PR sem o usuário ter visto o README da mudança primeiro.
