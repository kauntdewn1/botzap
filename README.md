# BotZap - Bot de Moderação para WhatsApp

Bot de moderação para grupos do WhatsApp com sistema de strikes, banimento e comandos administrativos.

## Funcionalidades

- 🚫 Detecção automática de links
- ⚠️ Sistema de strikes
- 🔨 Banimento automático após 3 strikes
- 👮 Comandos administrativos
- 📊 Logs de ações
- 💾 Backup automático do banco de dados

## Comandos Disponíveis

- `/strikes @usuario` - Verifica quantos strikes um usuário tem
- `/reset @usuario` - Reseta os strikes de um usuário
- `/ban @usuario [motivo]` - Bane um usuário do grupo
- `/warn @usuario [motivo]` - Adverte um usuário
- `/help` - Mostra todos os comandos disponíveis

## Requisitos

- Node.js 14+
- npm ou yarn
- Conta no UltraMsg

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/botzap.git
cd botzap
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```
Edite o arquivo `.env` com suas credenciais:
```
TOKEN=seu_token_aqui
INSTANCE=sua_instancia_aqui
PORT=3000
```

4. Configure o arquivo `config.yaml`:
- Adicione os IDs dos grupos
- Configure os administradores
- Personalize as mensagens

5. Inicie o bot:
```bash
node bot.js
```

## Configuração

O arquivo `config.yaml` permite personalizar:
- Nome do bot
- Mensagens de boas-vindas
- Regras de moderação
- Comandos disponíveis
- Grupos monitorados
- Administradores

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
