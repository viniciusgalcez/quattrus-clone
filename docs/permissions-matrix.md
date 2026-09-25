# Matriz de permissões

Fonte de verdade viva: `src/lib/authz.ts` (escrita) e `src/lib/hierarchy.ts`
(leitura/escopo). Este documento é a versão legível do que esse código já
aplica — se divergir do código, o código vence; atualize este arquivo junto
de qualquer mudança em `authz.ts`/`hierarchy.ts`.

## Perfis

| Perfil | Quem é |
| --- | --- |
| `ADMIN` | Acesso administrativo total. Enxerga e pode ver qualquer item (`canView` sempre `true`), mas edição continua sendo dono-ou-admin — fechamento de período bloqueia admin também. |
| `GESTOR` | Vê a si mesmo e toda a subárvore de subordinados (`getSubordinateIds`, com proteção contra ciclo de hierarquia). |
| `COLABORADOR` | Vê e edita apenas o que é seu, salvo delegação/facilitação recebida. |
| Delegado | Usuário individualmente autorizado a editar **um item específico** (`KpiDelegation`), sem virar dono nem gestor daquele item. |
| Facilitador | Usuário com direito de edição **sobre todos os itens de um dono** (`Facilitation`), papel equivalente ao "Facilitador" do Quattrus original. |

## Leitura (`canView` / `exportableOwnerIds`)

| Regra | Implementação |
| --- | --- |
| Ver o próprio item | sempre `true` |
| Admin vê tudo | `viewerRole === "ADMIN"` → `true` |
| Gestor vê subordinados | `targetId` está em `getSubordinateIds(viewerId)` |
| Colaborador só vê o próprio | qualquer outro caso → `false` |
| Escopo de exportação/farol em massa | `exportableOwnerIds`: todos os usuários (admin), ou `[self, ...subordinados]` (gestor/colaborador) — evita 1 `canView` por linha |

## Escrita (`canEdit`, usado por `assertKpiEditable` / `assertMeasurementEditable` / `assertActionPlanEditable`)

| Regra | Implementação |
| --- | --- |
| Dono ou admin | `user.id === ownerId \|\| user.role === "ADMIN"` |
| Delegado no item específico | `KpiDelegation` único por `(kpiId, delegateId)` |
| Facilitador do dono | `Facilitation` único por `(facilitatorId, facilitatedId)` — dá direito sobre **todos** os itens daquele dono, não só um |
| Item arquivado | só `ADMIN` pode escrever, mesmo sendo dono/delegado/facilitador |
| Item com FCA pendente em mês anterior | `assertFcaResolved` bloqueia novo lançamento até o FCA daquele mês ser resolvido (o próprio mês do FCA continua editável) |
| Período fechado (`PeriodLock`) | `assertPeriodWritable` bloqueia edição de medição para o período/departamento fechado, inclusive para admin |

## Regras específicas por ação

| Ação | Regra adicional |
| --- | --- |
| Aprovar meta (`approveGoal`) | Quem vê o dono (`canView`) pode aprovar, **exceto o próprio dono** — auto-aprovação é proibida mesmo para admin agindo como dono |
| Gerenciar delegação/facilitação de um item | Só dono do item ou admin (`assertKpiOwnerOrAdmin`) |
| Definir item pai (`parentId`) | O pai precisa ser visível ao usuário (`canView`), não precisa ser editável — evita enxertar item em árvore alheia |
| Definir departamento do item | Não-admin só pode usar o próprio departamento (`assertDepartmentAssignable`) |
| CRUD de usuário/departamento | Somente `ADMIN` |
| Excluir definitivamente um item arquivado | Somente `ADMIN`, e só se já estiver arquivado |
| Importação em massa (CSV) | Mesmas regras linha a linha de `assertKpiEditable`/`assertFcaResolved`/`assertPeriodWritable` — não existe atalho que pule a trava normal |
| Exportação | Escopo calculado no servidor por `exportableOwnerIds`, com limite de 20 exportações por minuto por usuário e auditoria do formato, período e quantidade de linhas. |
| Anexos | Upload limitado a 10 arquivos por minuto por usuário; o destino passa pela mesma autorização de KPI, medição ou plano antes de o arquivo ser gravado. |

## O que testar sempre que este arquivo mudar

- Acesso direto por URL a um recurso de outro usuário (`/metas/[id]`, `/fca/[measurementId]`) retorna 404, não os dados.
- Uma chamada de server action com um `kpiId`/`measurementId` de outro usuário falha com `ForbiddenError`, mesmo que a UI nunca ofereça esse botão.
- Importação em massa não consegue escrever num item, período ou departamento que a tela normal bloquearia.
- `authz.test.ts`, `actions.test.ts`, `goal-approval.test.ts` e `import-actions.test.ts` cobrem os casos acima — qualquer regra nova entra como teste ali, não só como comentário aqui.
- `audit.test.ts` garante que senha, token, cookie, segredo e cabeçalhos de autorização nunca chegam ao banco de auditoria.
