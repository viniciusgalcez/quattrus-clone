# Importação inicial em produção

1. Entre com uma conta com permissão **Importar / Exportar**. O administrador deve cadastrar os usuários e departamentos antes de importar indicadores que façam referência a eles.
2. Abra **Importar / Exportar** e baixe o CSV de itens para usar o cabeçalho esperado. Preencha os indicadores em lotes de até 200 linhas e 4 MB cada. Deixe `id` vazio somente para criar um indicador novo.
3. Confira o relatório de cada lote. Linhas inválidas são recusadas individualmente; as demais podem ter sido gravadas. Corrija apenas as linhas indicadas antes de continuar.
4. Exporte novamente os itens após a criação para obter os IDs gerados. Use esses IDs nas planilhas de periodicidade, faixas, medições e planos de ação. Importe nessa ordem quando houver dependências.
5. Em caso de timeout, reenvie **o mesmo arquivo sem modificações**. Itens novos sem ID desse arquivo mantêm a mesma identidade. Se alterar o conteúdo do arquivo, exporte os itens e preencha os IDs antes de reenviar para evitar novos cadastros.

Arquivos aceitos: CSV, TXT, XLSX e XLS tabulado. XLS binário antigo (Excel 97–2003) não é aceito. O histórico das importações fica na própria página, com contagens de registros criados, atualizados e linhas com erro.

Para um primeiro uso com dados reais, comece com um lote pequeno, confirme os indicadores e medições na interface e só então avance para os demais lotes. A importação roda na requisição; não envie lotes maiores que o limite informado.
